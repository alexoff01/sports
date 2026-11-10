import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware

from config import ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD, ALLOWED_ORIGINS, MESSAGE_RETENTION_DAYS, PRIMARY_HOST
from datetime import timedelta

from core import client, client_ip, db, hash_key, now
import auth
import contact
import projects
import seo
from seed import ensure_user_indexes, seed_admin
from seed_data import SEED_PROJECTS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("portfolio")

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
}
NOT_FOUND_LIMIT = 60  # 404s per IP per 10 minutes before every /api request is refused
MUTATING = {"POST", "PUT", "PATCH", "DELETE"}


@app.middleware("http")
async def security(request: Request, call_next):
    path = request.url.path
    if request.method in MUTATING and path.startswith("/api"):
        origin = (request.headers.get("origin") or "").rstrip("/")
        if origin not in ALLOWED_ORIGINS:
            return JSONResponse({"detail": "Request origin not allowed.", "code": "origin_rejected"}, status_code=403)
    ip_key = f"notfound:{hash_key(client_ip(request))}"
    if path.startswith("/api") and await db.rate_limits.count_documents(
            {"k": ip_key, "at": {"$gte": now() - timedelta(minutes=10)}}) >= NOT_FOUND_LIMIT:
        return JSONResponse({"detail": "Too many requests. Please try again later."}, status_code=429, headers={"Retry-After": "600"})
    response = await call_next(request)
    if response.status_code == 404 and path.startswith("/api"):
        await db.rate_limits.insert_one({"k": ip_key, "at": now()})
    for k, v in SECURITY_HEADERS.items():
        response.headers.setdefault(k, v)
    if (request.headers.get("host") or "").lower() == PRIMARY_HOST:
        # No includeSubDomains/preload until every subdomain is confirmed to use https.
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    if path.startswith("/api"):
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
    if path.startswith("/api/admin"):
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    errors = [
        {"field": ".".join(str(p) for p in e.get("loc", [])[1:]), "msg": e.get("msg", "Invalid value")}
        for e in exc.errors()
    ]
    return JSONResponse({"detail": errors}, status_code=422)


@app.exception_handler(StarletteHTTPException)
async def http_handler(_: Request, exc: StarletteHTTPException):
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=getattr(exc, "headers", None))


@app.exception_handler(Exception)
async def error_handler(_: Request, exc: Exception):
    logger.error("Unhandled error: %s", type(exc).__name__)
    return JSONResponse({"detail": "Something went wrong."}, status_code=500)


app.include_router(auth.router)
app.include_router(contact.router)
app.include_router(projects.router)
app.include_router(seo.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    max_age=600,
    allow_headers=["Content-Type", "X-CSRF-Token"],
)


async def ensure_ttl(collection, field: str, seconds: int) -> None:
    """Create the TTL index, or update its expiry in place when MESSAGE_RETENTION_DAYS changes."""
    name = f"{field}_1"
    info = await collection.index_information()
    if name in info and info[name].get("expireAfterSeconds") != seconds:
        await collection.database.command({"collMod": collection.name, "index": {"name": name, "expireAfterSeconds": seconds}})
    elif name not in info:
        await collection.create_index(field, expireAfterSeconds=seconds)


@app.on_event("startup")
async def startup():
    await db.rate_limits.create_index("at", expireAfterSeconds=7200)
    await db.rate_limits.create_index("k")
    await ensure_user_indexes(db)
    await db.admin_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.admin_sessions.create_index("session_id", unique=True)
    await db.admin_sessions.create_index("user")
    await db.auth_lockouts.create_index("key", unique=True)
    await db.auth_lockouts.create_index("updated_at", expireAfterSeconds=24 * 3600)
    await db.totp_pending.create_index("user", unique=True)
    await db.totp_pending.create_index("created_at", expireAfterSeconds=600)
    await db.totp_used.create_index("key", unique=True)
    await db.totp_used.create_index("at", expireAfterSeconds=300)
    await db.upload_sessions.create_index("id", unique=True)
    await db.upload_sessions.create_index("created_at", expireAfterSeconds=3600)
    await db.security_events.create_index("timestamp", expireAfterSeconds=90 * 24 * 3600)
    await ensure_ttl(db.messages, "created_at", MESSAGE_RETENTION_DAYS * 24 * 3600)
    await db.messages.create_index("email")
    await db.projects.create_index("slug", unique=True)
    await db.projects.create_index("id", unique=True)
    await db.media.create_index("id", unique=True)
    await db.admin_prefs.create_index("user", unique=True)
    await seed_admin(db, ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD)
    if await db.projects.count_documents({}) == 0:
        for i, p in enumerate(SEED_PROJECTS):
            await db.projects.insert_one({**p, "order": i, "published": True, "created_at": now(), "updated_at": now()})
    try:
        projects.init_storage()
    except Exception:  # noqa: BLE001
        logger.warning("Object storage init failed; uploads will retry on demand.")


@app.on_event("shutdown")
async def shutdown():
    client.close()
