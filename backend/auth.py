import asyncio
import base64
import hashlib
import hmac
import io
import logging
import os
import random
import secrets
import time
from datetime import timedelta

import jwt
import pyotp
import qrcode
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pymongo import ReturnDocument

from core import client_ip, db, hash_key, now, rate_limit
from emailer import send_email

logger = logging.getLogger("portfolio.auth")

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"].strip().lower()
ADMIN_PATH = "/" + os.environ["ADMIN_PATH"].strip("/")
JWT_SECRET = os.environ["JWT_SECRET"]
TOKEN_PEPPER = os.environ["TOKEN_PEPPER"]
PUBLIC_BASE_URL = os.environ["PUBLIC_BASE_URL"].rstrip("/")
REQUIRE_TOTP = os.environ.get("ADMIN_REQUIRE_TOTP", "true").lower() != "false"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() != "false"
APP_ENV = os.environ.get("APP_ENV", "production")
HAS_EMAIL_KEY = bool(os.environ.get("EMERGENT_EMAIL_KEY"))

PREFIX = "__Host-" if COOKIE_SECURE else ""
SESSION_COOKIE = f"{PREFIX}admin_session"
CSRF_COOKIE = f"{PREFIX}admin_csrf"
PREAUTH_COOKIE = f"{PREFIX}admin_preauth"
LINK_TTL = timedelta(minutes=10)
PREAUTH_MIN = 5
ABSOLUTE = timedelta(hours=12)
IDLE = timedelta(minutes=30)
GENERIC_LINK = "If this email is authorized, a sign-in link has been sent."
FAIL = "Sign-in failed. Please request a new link."
_fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(f"totp:{JWT_SECRET}".encode()).digest()))

router = APIRouter(prefix="/api/admin-auth")


def check_config() -> None:
    """Refuse to start in production with missing or weak secrets."""
    if APP_ENV != "production":
        return
    if len(JWT_SECRET) < 32 or len(TOKEN_PEPPER) < 32 or "@" not in ADMIN_EMAIL or len(ADMIN_PATH) < 8:
        raise RuntimeError("Weak or missing admin auth configuration")


def hmac_hash(value: str) -> str:
    return hmac.new(TOKEN_PEPPER.encode(), value.encode(), hashlib.sha256).hexdigest()


async def log_event(kind: str, request: Request) -> None:
    await db.security_events.insert_one({"type": kind, "timestamp": now(), "ip_hash": hash_key(client_ip(request))})


def _cookie(resp: Response, name: str, value: str, max_age: int, httponly: bool = True) -> None:
    resp.set_cookie(name, value, max_age=max_age, httponly=httponly, secure=COOKIE_SECURE, samesite="strict", path="/")


def _jwt(payload: dict, ttl: timedelta) -> str:
    return jwt.encode({**payload, "exp": now() + ttl}, JWT_SECRET, algorithm="HS256")


def _read(token: str | None, kind: str) -> dict | None:
    try:
        data = jwt.decode(token or "", JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None
    return data if data.get("type") == kind else None


async def create_session(request: Request, response: Response) -> None:
    sid = secrets.token_urlsafe(32)
    t = now()
    await db.admin_sessions.insert_one({"session_id": hmac_hash(sid), "created_at": t, "last_seen_at": t,
                                        "expires_at": t + ABSOLUTE, "ip_hash": hash_key(client_ip(request)), "revoked": False})
    _cookie(response, SESSION_COOKIE, _jwt({"type": "session", "sid": sid}, ABSOLUTE), int(ABSOLUTE.total_seconds()))
    _cookie(response, CSRF_COOKIE, secrets.token_urlsafe(24), int(ABSOLUTE.total_seconds()), httponly=False)
    response.delete_cookie(PREAUTH_COOKIE, path="/", secure=COOKIE_SECURE, samesite="strict")
    await log_event("login_success", request)


async def _active_session(request: Request) -> dict | None:
    data = _read(request.cookies.get(SESSION_COOKIE), "session")
    if not data:
        return None
    t = now()
    doc = await db.admin_sessions.find_one_and_update(
        {"session_id": hmac_hash(data["sid"]), "revoked": False, "expires_at": {"$gt": t}, "last_seen_at": {"$gt": t - IDLE}},
        {"$set": {"last_seen_at": t}},
    )
    return {"active": True} if doc else None


async def require_admin(request: Request) -> str:
    """Single gate for every admin endpoint: signed cookie, live session, idle/absolute expiry and CSRF."""
    if not await _active_session(request):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        cookie, header = request.cookies.get(CSRF_COOKIE, ""), request.headers.get("x-csrf-token", "")
        if not cookie or not hmac.compare_digest(cookie, header):
            raise HTTPException(status_code=403, detail="Forbidden.")
    return ADMIN_EMAIL


class EmailIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr


class TokenIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(min_length=20, max_length=200)


class CodeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=6, max_length=20)


def _link_email(link: str, requested: str) -> str:
    return (
        '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#0f172a">'
        '<p style="font-size:18px;font-weight:bold">Your sign-in link</p>'
        f'<p>A sign-in was requested on {requested} UTC. The link is valid for 10 minutes and works once.</p>'
        f'<p><a href="{link}" style="color:#2f6bff">Open the studio sign-in page</a></p>'
        '<p style="color:#64748b;font-size:13px">If you did not request this, ignore this message. Nothing will change.</p>'
        "</td></tr></table>"
    )


async def _deliver_link(token: str) -> None:
    link = f"{PUBLIC_BASE_URL}{ADMIN_PATH}/verify#token={token}"
    if APP_ENV == "development" and not HAS_EMAIL_KEY:
        print(f"[dev] admin sign-in link: {link}", flush=True)
        return
    await send_email(to=ADMIN_EMAIL, subject="Sign-in link", html=_link_email(link, now().strftime("%Y-%m-%d %H:%M")))


@router.post("/request-link")
async def request_link(body: EmailIn, request: Request):
    started = time.monotonic()
    ip = client_ip(request)
    await rate_limit("link-h", ip, 5, 3600)
    await rate_limit("link-d", ip, 20, 86400)
    await rate_limit("link-e", body.email.lower(), 5, 3600)
    token = secrets.token_urlsafe(32)
    token_hash = hmac_hash(token)
    if hmac.compare_digest(body.email.strip().lower().encode(), ADMIN_EMAIL.encode()):
        await db.admin_login_tokens.update_many({"used": False}, {"$set": {"used": True}})
        await db.admin_login_tokens.insert_one({
            "token_hash": token_hash, "created_at": now(), "expires_at": now() + LINK_TTL, "used": False,
            "ip_hash": hash_key(ip), "user_agent_hash": hash_key(request.headers.get("user-agent", "")),
        })
        asyncio.create_task(_deliver_link(token))
        await log_event("link_requested", request)
    else:
        await db.admin_login_tokens.find_one({"token_hash": token_hash})
        await db.security_events.find_one({"type": "noop"})
    await asyncio.sleep(max(0.0, 0.45 + random.uniform(0, 0.2) - (time.monotonic() - started)))
    return {"message": GENERIC_LINK}


@router.post("/verify-link")
async def verify_link(body: TokenIn, request: Request, response: Response):
    await rate_limit("verify", client_ip(request), 10, 3600)
    doc = await db.admin_login_tokens.find_one_and_update(
        {"token_hash": hmac_hash(body.token), "used": False, "expires_at": {"$gt": now()}},
        {"$set": {"used": True, "used_at": now()}},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        await log_event("link_rejected", request)
        raise HTTPException(status_code=400, detail=FAIL)
    await log_event("link_used", request)
    if not REQUIRE_TOTP:
        await create_session(request, response)
        return {"next": "done"}
    _cookie(response, PREAUTH_COOKIE, _jwt({"type": "preauth", "n": secrets.token_hex(8)}, timedelta(minutes=PREAUTH_MIN)), PREAUTH_MIN * 60)
    sec = await db.admin_security.find_one({"_id": "admin"}) or {}
    return {"next": "totp_verify" if sec.get("totp_enabled") else "totp_setup"}


def _require_preauth(request: Request) -> None:
    if not _read(request.cookies.get(PREAUTH_COOKIE), "preauth"):
        raise HTTPException(status_code=401, detail="Your sign-in step expired. Please request a new link.")


async def _totp_guard(request: Request) -> None:
    since = now() - timedelta(minutes=15)
    if await db.security_events.count_documents({"type": "totp_failed", "timestamp": {"$gt": since}}) >= 5:
        await log_event("lockout", request)
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait 15 minutes.")


def _qr(uri: str) -> str:
    buf = io.BytesIO()
    qrcode.make(uri, box_size=6, border=2).save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@router.post("/totp/setup")
async def totp_setup(request: Request):
    _require_preauth(request)
    sec = await db.admin_security.find_one({"_id": "admin"}) or {}
    if sec.get("totp_enabled"):
        raise HTTPException(status_code=400, detail=FAIL)
    secret = pyotp.random_base32()
    codes = [f"{secrets.token_hex(2)}-{secrets.token_hex(2)}" for _ in range(8)]
    await db.admin_security.update_one({"_id": "admin"}, {"$set": {
        "pending_secret_encrypted": _fernet.encrypt(secret.encode()).decode(),
        "pending_recovery_hashed": [hmac_hash(c) for c in codes], "updated_at": now()}}, upsert=True)
    uri = pyotp.TOTP(secret).provisioning_uri(name=ADMIN_EMAIL, issuer_name="Alex Cearnau Studio")
    return {"qr": _qr(uri), "secret": secret, "recovery_codes": codes}


@router.post("/totp/confirm")
async def totp_confirm(body: CodeIn, request: Request, response: Response):
    _require_preauth(request)
    await _totp_guard(request)
    sec = await db.admin_security.find_one({"_id": "admin"}) or {}
    pending = sec.get("pending_secret_encrypted")
    if sec.get("totp_enabled") or not pending or not pyotp.TOTP(_fernet.decrypt(pending.encode()).decode()).verify(body.code, valid_window=1):
        await log_event("totp_failed", request)
        raise HTTPException(status_code=401, detail="That code did not work. Try the next one.")
    await db.admin_security.update_one({"_id": "admin"}, {
        "$set": {"totp_secret_encrypted": pending, "totp_enabled": True, "recovery_codes_hashed": sec["pending_recovery_hashed"],
                 "last_code": body.code, "updated_at": now()},
        "$unset": {"pending_secret_encrypted": "", "pending_recovery_hashed": ""}})
    await create_session(request, response)
    return {"authenticated": True}


@router.post("/totp/verify")
async def totp_verify(body: CodeIn, request: Request, response: Response):
    _require_preauth(request)
    await _totp_guard(request)
    sec = await db.admin_security.find_one({"_id": "admin"}) or {}
    if not sec.get("totp_enabled"):
        raise HTTPException(status_code=400, detail=FAIL)
    code = body.code.strip().lower()
    if len(code) == 6 and code.isdigit():
        secret = _fernet.decrypt(sec["totp_secret_encrypted"].encode()).decode()
        ok = code != sec.get("last_code") and pyotp.TOTP(secret).verify(code, valid_window=1)
        if ok:
            await db.admin_security.update_one({"_id": "admin"}, {"$set": {"last_code": code}})
    else:
        ok = (await db.admin_security.update_one(
            {"_id": "admin", "recovery_codes_hashed": hmac_hash(code)},
            {"$pull": {"recovery_codes_hashed": hmac_hash(code)}})).modified_count == 1
        if ok:
            await db.admin_sessions.update_many({}, {"$set": {"revoked": True}})
            await log_event("recovery_code_used", request)
    if not ok:
        await log_event("totp_failed", request)
        raise HTTPException(status_code=401, detail="That code did not work. Try the next one.")
    await create_session(request, response)
    return {"authenticated": True}


@router.get("/session")
async def session(request: Request):
    return {"authenticated": bool(await _active_session(request))}


@router.post("/logout")
async def logout(request: Request, response: Response, _: str = Depends(require_admin)):
    data = _read(request.cookies.get(SESSION_COOKIE), "session")
    await db.admin_sessions.update_one({"session_id": hmac_hash(data["sid"])}, {"$set": {"revoked": True}})
    for name in (SESSION_COOKIE, CSRF_COOKIE, PREAUTH_COOKIE):
        response.delete_cookie(name, path="/", secure=COOKIE_SECURE, samesite="strict")
    await log_event("logout", request)
    return {"ok": True}
