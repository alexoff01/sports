import hashlib
import os
import re
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient

from config import ALLOWED_ORIGINS, JWT_SECRET  # noqa: F401  (loads backend/.env first)

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

_HASH_SALT = JWT_SECRET
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def now() -> datetime:
    return datetime.now(timezone.utc)


def hash_key(value: str) -> str:
    """One-way hash so IPs/emails are never stored or logged in clear."""
    return hashlib.sha256(f"{_HASH_SALT}:{value}".encode()).hexdigest()[:32]


def clean_text(value: str) -> str:
    return _CONTROL.sub("", value).strip()


def client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def rate_limit(bucket: str, key: str, limit: int, window_s: int) -> None:
    k = f"{bucket}:{hash_key(key)}"
    since = now() - timedelta(seconds=window_s)
    if await db.rate_limits.count_documents({"k": k, "at": {"$gte": since}}) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.",
                            headers={"Retry-After": str(window_s)})
    await db.rate_limits.insert_one({"k": k, "at": now()})
