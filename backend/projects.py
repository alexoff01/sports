import asyncio
import io
import os
import re
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Literal

import requests
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


def _put(path: str, data, content_type: str) -> str:
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": init_storage(), "Content-Type": content_type},
        data=data,
        timeout=600,
    )
    resp.raise_for_status()
    return resp.json()["path"]


def _get(path: str) -> bytes:
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage()}, timeout=300)
    resp.raise_for_status()
    return resp.content


# ---------------------------------------------------------------- models
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
    videos: list[str] = Field(default_factory=list, max_length=4)
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
        if any(not re.match(IMAGE_PATTERN, url) for url in v):
            raise ValueError("Invalid image reference")
        return list(dict.fromkeys(v))

    @field_validator("videos")
    @classmethod
    def _videos(cls, v: list[str]) -> list[str]:
        if any(not re.match(VIDEO_PATTERN, url) for url in v):
            raise ValueError("Invalid video reference")
        return list(dict.fromkeys(v))


# Public output is an allowlist: drafts and internal fields (order, published, timestamps) never leave the API.
PUBLIC_FIELDS = {k: 1 for k in (
    "id", "slug", "title", "category", "project_type", "label", "summary", "tags", "cover_image", "cover_alt",
    "gallery", "videos", "context", "objective", "strategy", "execution", "outcome", "platforms", "captions", "featured",
)} | {"_id": 0}


# ---------------------------------------------------------------- public
@router.get("/projects")
async def list_projects():
    return await db.projects.find({"published": True}, PUBLIC_FIELDS).sort("order", 1).to_list(200)


@router.get("/projects/{slug}")
async def get_project(slug: str):
    doc = await db.projects.find_one({"slug": slug, "published": True}, PUBLIC_FIELDS)
    if not doc:
        raise HTTPException(status_code=404, detail="Not found.")
    return doc


# ---------------------------------------------------------------- admin projects
def _iso(doc: dict) -> dict:
    for k in ("created_at", "updated_at"):
        if k in doc and hasattr(doc[k], "isoformat"):
            doc[k] = doc[k].isoformat()
    return doc


@router.get("/admin/projects")
async def admin_list(_: AdminContext = Depends(require_admin)):
    items = await db.projects.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return [_iso(i) for i in items]


@router.post("/admin/projects", status_code=201)
async def admin_create(body: ProjectIn, _: AdminContext = Depends(require_admin)):
    if await db.projects.find_one({"slug": body.slug}):
        raise HTTPException(status_code=409, detail="Slug already in use.")
    last = await db.projects.find_one({}, sort=[("order", -1)])
    doc = {**body.model_dump(), "id": str(uuid.uuid4()), "order": (last["order"] + 1) if last else 0,
           "created_at": now(), "updated_at": now()}
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return _iso(doc)


@router.put("/admin/projects/{project_id}")
async def admin_update(project_id: str, body: ProjectIn, _: AdminContext = Depends(require_admin)):
    if await db.projects.find_one({"slug": body.slug, "id": {"$ne": project_id}}):
        raise HTTPException(status_code=409, detail="Slug already in use.")
    res = await db.projects.update_one({"id": project_id}, {"$set": {**body.model_dump(), "updated_at": now()}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Not found.")
    return _iso(await db.projects.find_one({"id": project_id}, {"_id": 0}))


class PublishIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    published: bool


@router.post("/admin/projects/{project_id}/publish")
async def admin_publish(project_id: str, body: PublishIn, _: AdminContext = Depends(require_admin)):
    res = await db.projects.update_one({"id": project_id}, {"$set": {"published": body.published, "updated_at": now()}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Not found.")
    return {"ok": True, "published": body.published}


@router.delete("/admin/projects/{project_id}")
async def admin_delete(project_id: str, _: AdminContext = Depends(require_admin)):
    res = await db.projects.delete_one({"id": project_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Not found.")
    return {"ok": True}


class ReorderIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ids: list[str] = Field(min_length=1, max_length=500)


@router.post("/admin/projects/reorder")
async def admin_reorder(body: ReorderIn, _: AdminContext = Depends(require_admin)):
    ids = list(dict.fromkeys(body.ids))
    if await db.projects.count_documents({"id": {"$in": ids}}) != len(ids):
        raise HTTPException(status_code=422, detail="Unknown project in the new order.")
    for index, pid in enumerate(ids):
        await db.projects.update_one({"id": pid}, {"$set": {"order": index, "updated_at": now()}})
    return {"ok": True}


# ---------------------------------------------------------------- uploads: validation
def _sniff_image(head: bytes) -> str | None:
    if head.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if head[4:8] == b"ftyp" and head[8:12] in (b"avif", b"avis"):
        return "avif"
    return None


MP4_BRANDS = {b"isom", b"iso2", b"iso4", b"iso5", b"iso6", b"mp41", b"mp42", b"avc1", b"M4V ", b"dash", b"MSNV"}


def _sniff_video(head: bytes) -> str | None:
    if head[4:8] == b"ftyp" and head[8:12] in MP4_BRANDS:
        return "mp4"
    if head.startswith(b"\x1a\x45\xdf\xa3") and b"webm" in head[:64]:
        return "webm"
    return None


def _process_image(data: bytes) -> dict:
    """Decode, apply orientation, strip EXIF/metadata by re-encoding, cap size, export WebP + AVIF."""
    with Image.open(io.BytesIO(data)) as img:
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGBA" if img.mode in ("RGBA", "LA", "P") else "RGB")
        img.thumbnail((2400, 2400))
        webp, avif = io.BytesIO(), io.BytesIO()
        img.save(webp, "WEBP", quality=80, method=6)
        img.save(avif, "AVIF", quality=60)
        return {"webp": webp.getvalue(), "avif": avif.getvalue(), "width": img.width, "height": img.height}


# ---------------------------------------------------------------- uploads: images
@router.post("/admin/uploads", status_code=201)
async def upload_image(file: UploadFile = File(...), _: AdminContext = Depends(require_admin)):
    data = await file.read(MAX_IMAGE + 1)
    if len(data) > MAX_IMAGE:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB).")
    if not _sniff_image(data[:16]):
        raise HTTPException(status_code=415, detail="Only JPG, PNG, WebP or AVIF images are allowed.")
    try:
        out = await asyncio.to_thread(_process_image, data)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=415, detail="The image could not be processed.")
    media_id = str(uuid.uuid4())
    webp_path = await asyncio.to_thread(_put, f"portfolio/media/{media_id}.webp", out["webp"], "image/webp")
    avif_path = await asyncio.to_thread(_put, f"portfolio/media/{media_id}.avif", out["avif"], "image/avif")
    await db.media.insert_one({
        "id": media_id, "kind": "image", "path": webp_path, "variants": {"image/webp": webp_path, "image/avif": avif_path},
        "content_type": "image/webp", "width": out["width"], "height": out["height"], "size": len(out["webp"]), "created_at": now(),
    })
    return {"url": f"/api/media/{media_id}", "width": out["width"], "height": out["height"]}


# ---------------------------------------------------------------- uploads: videos (chunked)
class VideoInit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    size: int = Field(gt=0, le=MAX_VIDEO)
    content_type: Literal["video/mp4", "video/webm"]


def _upload_file(upload_id: str) -> Path:
    return UPLOAD_DIR / f"{upload_id}.part"


@router.post("/admin/uploads/video/init", status_code=201)
async def video_init(body: VideoInit, _: AdminContext = Depends(require_admin)):
    upload_id = str(uuid.uuid4())
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    _upload_file(upload_id).write_bytes(b"")
    await db.upload_sessions.insert_one({"id": upload_id, "size": body.size, "content_type": body.content_type,
                                         "next_index": 0, "received": 0, "created_at": now()})
    return {"upload_id": upload_id, "chunk_size": CHUNK_SIZE}


@router.put("/admin/uploads/video/{upload_id}/chunk")
async def video_chunk(upload_id: str, index: int, request: Request, _: AdminContext = Depends(require_admin)):
    session = await db.upload_sessions.find_one({"id": upload_id})
    if not session or not re.fullmatch(r"[a-f0-9-]{36}", upload_id):
        raise HTTPException(status_code=404, detail="Upload not found or expired.")
    if index != session["next_index"]:
        raise HTTPException(status_code=409, detail="Chunks must be sent in order.")
    declared = int(request.headers.get("content-length") or 0)
    if declared > CHUNK_SIZE:
        raise HTTPException(status_code=413, detail="Chunk too large.")
    data = await request.body()
    if not data or len(data) > CHUNK_SIZE or session["received"] + len(data) > session["size"]:
        raise HTTPException(status_code=413, detail="File too large (max 100 MB).")
    if index == 0 and not _sniff_video(data[:64]):
        raise HTTPException(status_code=415, detail="Only MP4 or WebM videos are allowed.")
    with _upload_file(upload_id).open("ab") as fh:
        fh.write(data)
    await db.upload_sessions.update_one({"id": upload_id}, {"$inc": {"next_index": 1, "received": len(data)}})
    return {"received": session["received"] + len(data)}


@router.post("/admin/uploads/video/{upload_id}/complete", status_code=201)
async def video_complete(upload_id: str, _: AdminContext = Depends(require_admin)):
    session = await db.upload_sessions.find_one({"id": upload_id})
    part = _upload_file(upload_id)
    if not session or not part.exists():
        raise HTTPException(status_code=404, detail="Upload not found or expired.")
    try:
        if session["received"] != session["size"] or part.stat().st_size != session["size"]:
            raise HTTPException(status_code=400, detail="Upload incomplete. Please try again.")
        with part.open("rb") as fh:
            kind = _sniff_video(fh.read(64))
        if not kind:
            raise HTTPException(status_code=415, detail="Only MP4 or WebM videos are allowed.")
        content_type = f"video/{kind}"
        media_id = str(uuid.uuid4())

        def _store() -> str:
            with part.open("rb") as fh:
                return _put(f"portfolio/media/{media_id}.{kind}", fh, content_type)

        path = await asyncio.to_thread(_store)
        await db.media.insert_one({"id": media_id, "kind": "video", "path": path, "content_type": content_type,
                                   "size": session["size"], "created_at": now()})
        return {"url": f"/api/media/{media_id}", "content_type": content_type}
    finally:
        part.unlink(missing_ok=True)
        await db.upload_sessions.delete_one({"id": upload_id})


# ---------------------------------------------------------------- media library
async def _in_use(url: str) -> bool:
    return bool(await db.projects.find_one({"$or": [{"cover_image": url}, {"gallery": url}, {"videos": url}]}, {"_id": 1}))


@router.get("/admin/media")
async def media_list(_: AdminContext = Depends(require_admin)):
    items = await db.media.find({"deleted": {"$ne": True}}, {"_id": 0, "path": 0, "variants": 0, "deleted": 0}).sort("created_at", -1).to_list(1000)
    for m in items:
        m["url"] = f"/api/media/{m['id']}"
        m["kind"] = m.get("kind", "image")
        m["in_use"] = await _in_use(m["url"])
        _iso(m)
    return items


@router.delete("/admin/media/{media_id}")
async def media_delete(media_id: str, _: AdminContext = Depends(require_admin)):
    url = f"/api/media/{media_id}"
    if await _in_use(url):
        raise HTTPException(status_code=409, detail="This file is used by a project. Remove it from the project first.")
    res = await db.media.update_one({"id": media_id, "deleted": {"$ne": True}}, {"$set": {"deleted": True, "deleted_at": now()}})
    if not res.modified_count:
        raise HTTPException(status_code=404, detail="Not found.")
    for cached in CACHE_DIR.glob(f"{media_id}.*"):
        cached.unlink(missing_ok=True)
    return {"ok": True}


# ---------------------------------------------------------------- media delivery
async def _cached(record: dict, path: str, ext: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    target = CACHE_DIR / f"{record['id']}.{ext}"
    if not target.exists():
        data = await asyncio.to_thread(_get, path)
        tmp = target.with_suffix(".tmp" + uuid.uuid4().hex[:6])
        tmp.write_bytes(data)
        shutil.move(tmp, target)
    return target


def _range(header: str | None, size: int) -> tuple[int, int] | None:
    m = re.fullmatch(r"bytes=(\d*)-(\d*)", (header or "").strip())
    if not m or (not m.group(1) and not m.group(2)):
        return None
    if m.group(1):
        start, end = int(m.group(1)), int(m.group(2)) if m.group(2) else size - 1
    else:
        start, end = max(0, size - int(m.group(2))), size - 1
    end = min(end, size - 1)
    return (start, end) if start <= end else None


@router.get("/media/{media_id}")
async def media(media_id: str, request: Request):
    record = await db.media.find_one({"id": media_id, "deleted": {"$ne": True}}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Not found.")
    url = f"/api/media/{media_id}"
    public = await db.projects.find_one({"published": True, "$or": [{"cover_image": url}, {"gallery": url}, {"videos": url}]}, {"_id": 1})
    if not public:
        await require_admin(request)
    headers = {"Cache-Control": "public, max-age=86400" if public else "private, no-store", "X-Content-Type-Options": "nosniff",
               "Cross-Origin-Resource-Policy": "same-site"}
    if record.get("kind") == "video":
        ctype = record["content_type"]
        file = await _cached(record, record["path"], ctype.split("/")[1])
        size = file.stat().st_size
        headers |= {"Accept-Ranges": "bytes", "Content-Disposition": f'inline; filename="{media_id}.{ctype.split("/")[1]}"'}
        rng = _range(request.headers.get("range"), size)
        if request.headers.get("range") and not rng:
            return Response(status_code=416, headers={**headers, "Content-Range": f"bytes */{size}"})
        start, end = rng or (0, size - 1)
        with file.open("rb") as fh:
            fh.seek(start)
            chunk = fh.read(end - start + 1)
        if rng:
            headers["Content-Range"] = f"bytes {start}-{end}/{size}"
        return Response(content=chunk, status_code=206 if rng else 200, media_type=ctype, headers=headers)
    variants = record.get("variants") or {"image/webp": record["path"]}
    ctype = "image/avif" if "image/avif" in (request.headers.get("accept") or "") and "image/avif" in variants else "image/webp"
    data = await asyncio.to_thread(_get, variants[ctype])
    headers |= {"Vary": "Accept", "Content-Disposition": f'inline; filename="{media_id}.{ctype.split("/")[1]}"'}
    return Response(content=data, media_type=ctype, headers=headers)
