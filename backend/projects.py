import asyncio
import io
import os
import uuid
from typing import Literal

import requests
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from PIL import Image, ImageOps
from pydantic import BaseModel, ConfigDict, Field, field_validator

from auth import get_admin
from core import clean_text, client_ip, db, now, rate_limit

router = APIRouter(prefix="/api")

Category = Literal["Content Creation", "Strategy", "Video"]
ProjectType = Literal["Concept", "Personal", "Real"]
Platform = Literal["Instagram", "TikTok", "YouTube Shorts", "X"]
IMAGE_PATTERN = r"^(/images/[a-z0-9-]+\.webp|/api/media/[a-f0-9-]{36})$"
MAX_UPLOAD = 8 * 1024 * 1024

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
_storage_key: str | None = None


def init_storage(force: bool = False) -> str:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _put(path: str, data: bytes, content_type: str) -> str:
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": init_storage(), "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["path"]


def _get(path: str) -> bytes:
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage()}, timeout=60)
    resp.raise_for_status()
    return resp.content


class Caption(BaseModel):
    model_config = ConfigDict(extra="forbid")
    platform: Platform
    text: str = Field(min_length=2, max_length=600)


class ProjectIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=3, max_length=120)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    category: Category
    project_type: ProjectType
    label: str = Field(min_length=2, max_length=40)
    summary: str = Field(min_length=10, max_length=280)
    tags: list[str] = Field(default_factory=list, max_length=8)
    cover_image: str = Field(pattern=IMAGE_PATTERN)
    cover_alt: str = Field(min_length=5, max_length=200)
    gallery: list[str] = Field(default_factory=list, max_length=8)
    context: str = Field(min_length=10, max_length=3000)
    objective: str = Field(min_length=10, max_length=3000)
    strategy: str = Field(min_length=10, max_length=3000)
    execution: str = Field(min_length=10, max_length=3000)
    outcome: str = Field(min_length=10, max_length=3000)
    platforms: list[Platform] = Field(min_length=1, max_length=4)
    captions: list[Caption] = Field(default_factory=list, max_length=6)
    published: bool = False
    featured: bool = False

    @field_validator("title", "label", "summary", "cover_alt", "context", "objective", "strategy", "execution", "outcome")
    @classmethod
    def _clean(cls, v: str) -> str:
        return clean_text(v)

    @field_validator("tags")
    @classmethod
    def _tags(cls, v: list[str]) -> list[str]:
        out = [clean_text(t)[:30] for t in v if clean_text(t)]
        return list(dict.fromkeys(out))

    @field_validator("gallery")
    @classmethod
    def _gallery(cls, v: list[str]) -> list[str]:
        import re

        for url in v:
            if not re.match(IMAGE_PATTERN, url):
                raise ValueError("Invalid image reference")
        return v


PUBLIC_FIELDS = {"_id": 0, "published": 0, "created_at": 0}


def _public(doc: dict) -> dict:
    doc.pop("updated_at", None)
    return doc


@router.get("/projects")
async def list_projects():
    items = await db.projects.find({"published": True}, PUBLIC_FIELDS).sort("order", 1).to_list(200)
    return [_public(i) for i in items]


@router.get("/projects/{slug}")
async def get_project(slug: str):
    doc = await db.projects.find_one({"slug": slug, "published": True}, PUBLIC_FIELDS)
    if not doc:
        raise HTTPException(status_code=404, detail="Not found.")
    return _public(doc)


def _admin_out(doc: dict) -> dict:
    for k in ("created_at", "updated_at"):
        if k in doc and hasattr(doc[k], "isoformat"):
            doc[k] = doc[k].isoformat()
    return doc


@router.get("/admin/projects")
async def admin_list(_: str = Depends(get_admin)):
    items = await db.projects.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return [_admin_out(i) for i in items]


@router.post("/admin/projects", status_code=201)
async def admin_create(body: ProjectIn, _: str = Depends(get_admin)):
    if await db.projects.find_one({"slug": body.slug}):
        raise HTTPException(status_code=409, detail="Slug already in use.")
    last = await db.projects.find_one({}, sort=[("order", -1)])
    doc = {**body.model_dump(), "id": str(uuid.uuid4()), "order": (last["order"] + 1) if last else 0,
           "created_at": now(), "updated_at": now()}
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return _admin_out(doc)


@router.put("/admin/projects/{project_id}")
async def admin_update(project_id: str, body: ProjectIn, _: str = Depends(get_admin)):
    if await db.projects.find_one({"slug": body.slug, "id": {"$ne": project_id}}):
        raise HTTPException(status_code=409, detail="Slug already in use.")
    res = await db.projects.update_one({"id": project_id}, {"$set": {**body.model_dump(), "updated_at": now()}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Not found.")
    return _admin_out(await db.projects.find_one({"id": project_id}, {"_id": 0}))


@router.delete("/admin/projects/{project_id}")
async def admin_delete(project_id: str, _: str = Depends(get_admin)):
    res = await db.projects.delete_one({"id": project_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Not found.")
    return {"ok": True}


class ReorderIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ids: list[str] = Field(min_length=1, max_length=500)


@router.post("/admin/projects/reorder")
async def admin_reorder(body: ReorderIn, _: str = Depends(get_admin)):
    for index, pid in enumerate(body.ids):
        await db.projects.update_one({"id": pid}, {"$set": {"order": index, "updated_at": now()}})
    return {"ok": True}


def _sniff(head: bytes) -> str | None:
    if head.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if head[4:8] == b"ftyp" and head[8:12] in (b"avif", b"avis"):
        return "avif"
    return None


def _process(data: bytes) -> tuple[bytes, int, int]:
    """Decode, strip EXIF/metadata by re-encoding, cap size and convert to WebP."""
    with Image.open(io.BytesIO(data)) as img:
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGBA" if img.mode in ("RGBA", "LA", "P") else "RGB")
        img.thumbnail((2400, 2400))
        out = io.BytesIO()
        img.save(out, "WEBP", quality=80, method=6)
        return out.getvalue(), img.width, img.height


@router.post("/admin/uploads", status_code=201)
async def upload(request: Request, file: UploadFile = File(...), _: str = Depends(get_admin)):
    await rate_limit("upload", client_ip(request), 60, 3600)
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="File too large (max 8 MB).")
    if not _sniff(data[:16]):
        raise HTTPException(status_code=415, detail="Only JPG, PNG, WebP or AVIF images are allowed.")
    try:
        Image.MAX_IMAGE_PIXELS = 50_000_000
        processed, width, height = await asyncio.to_thread(_process, data)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=415, detail="The image could not be processed.")
    media_id = str(uuid.uuid4())
    path = await asyncio.to_thread(_put, f"portfolio/media/{media_id}.webp", processed, "image/webp")
    await db.media.insert_one(
        {"id": media_id, "path": path, "width": width, "height": height, "size": len(processed), "created_at": now()}
    )
    return {"url": f"/api/media/{media_id}", "width": width, "height": height}


@router.get("/media/{media_id}")
async def media(media_id: str, request: Request):
    record = await db.media.find_one({"id": media_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Not found.")
    url = f"/api/media/{media_id}"
    public = await db.projects.find_one({"published": True, "$or": [{"cover_image": url}, {"gallery": url}]})
    if not public:
        await get_admin(request)
    data = await asyncio.to_thread(_get, record["path"])
    cache = "public, max-age=86400" if public else "private, no-store"
    return Response(content=data, media_type="image/webp", headers={"Cache-Control": cache})
