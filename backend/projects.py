1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
67
68
69
70
71
72
73
74
75
76
77
78
79
80
81
82
83
84
85
86
87
88
89
90
91
92
93
94
95
96
import asyncio
import io
import os
import re
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Literal

import boto3
from botocore.config import Config
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from PIL import Image, ImageOps
from pydantic import BaseModel, ConfigDict, Field, field_validator

from auth import AdminContext, require_admin
from core import clean_text, db, now

router = APIRouter(prefix="/api")

Category = Literal["Content Creation", "Strategy", "Video"]
ProjectType = Literal["Concept", "Personal", "Real"]
Platform = Literal["Instagram", "TikTok", "YouTube Shorts", "X"]
MEDIA_RE = r"/api/media/[a-f0-9-]{36}"
IMAGE_PATTERN = rf"^(/images/[a-z0-9-]+\.webp|{MEDIA_RE})$"
VIDEO_PATTERN = rf"^{MEDIA_RE}$"
MAX_IMAGE = 10 * 1024 * 1024
MAX_VIDEO = 100 * 1024 * 1024
CHUNK_SIZE = 5 * 1024 * 1024
MAX_PIXELS = 50_000_000
UPLOAD_DIR = Path(tempfile.gettempdir()) / "portfolio-uploads"
CACHE_DIR = Path(tempfile.gettempdir()) / "portfolio-media-cache"
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

# Railway Bucket or any S3-compatible object storage.
# Configure these five values in the Railway application service.
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "").strip()
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "").strip()
S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID", "").strip()
S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY", "").strip()
S3_REGION = os.getenv("S3_REGION", "auto").strip() or "auto"
_s3_client = None


def init_storage(force: bool = False):
    """Return a reusable S3 client; fail clearly if configuration is missing."""
    global _s3_client
    if _s3_client is not None and not force:
        return _s3_client
    missing = [name for name, value in (
        ("S3_BUCKET_NAME", S3_BUCKET_NAME),
        ("S3_ENDPOINT_URL", S3_ENDPOINT_URL),
        ("S3_ACCESS_KEY_ID", S3_ACCESS_KEY_ID),
        ("S3_SECRET_ACCESS_KEY", S3_SECRET_ACCESS_KEY),
    ) if not value]
    if missing:
        raise RuntimeError("S3 storage not configured: " + ", ".join(missing))
    _s3_client = boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT_URL,
        aws_access_key_id=S3_ACCESS_KEY_ID,
        aws_secret_access_key=S3_SECRET_ACCESS_KEY,
        region_name=S3_REGION,
        config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}),
    )
    return _s3_client


def _put(path: str, data, content_type: str) -> str:
    """Upload bytes or a binary file handle; retain the existing MongoDB path format."""
    client = init_storage()
    if hasattr(data, "read"):
        client.upload_fileobj(data, S3_BUCKET_NAME, path, ExtraArgs={"ContentType": content_type})
    else:
        client.put_object(Bucket=S3_BUCKET_NAME, Key=path, Body=data, ContentType=content_type)
    return path


def _get(path: str) -> bytes:
    response = init_storage().get_object(Bucket=S3_BUCKET_NAME, Key=path)
    try:
        return response["Body"].read()
    finally:
        response["Body"].close()


# ---------------------------------------------------------------- models
class Caption(BaseModel):
    model_config = ConfigDict(extra="forbid")
    platform: Platform
    text: str = Field(min_length=2, max_length=600)


class ProjectIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
