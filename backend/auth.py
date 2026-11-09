"""Admin authentication: email + password, mandatory TOTP, revocable server-side sessions, lockout, CSRF.

There is deliberately no registration, password-reset-by-email or user listing endpoint. The single admin
account is seeded from the environment at startup (see seed.py) and can be recovered with
scripts/reset_admin_password.py on the server.
"""
import asyncio
import base64
import hashlib
import hmac
import io
import logging
import os
import secrets
import time
from dataclasses import dataclass
from datetime import timedelta

import jwt
import pyotp
import qrcode
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from pymongo.errors import DuplicateKeyError

from config import ADMIN_INITIAL_PASSWORD, COOKIE_SECURE, JWT_SECRET, REQUIRE_TOTP, TOTP_ENCRYPTION_KEY
from core import client_ip, db, hash_key, now, rate_limit
from passwords import hash_password, is_weak, policy_error, verify_password

logger = logging.getLogger("portfolio.auth")

PREFIX = "__Host-" if COOKIE_SECURE else ""
SESSION_COOKIE = f"{PREFIX}admin_session"
CSRF_COOKIE = f"{PREFIX}admin_csrf"
PREAUTH_COOKIE = f"{PREFIX}admin_preauth"

PREAUTH_TTL = timedelta(minutes=5)
ABSOLUTE = timedelta(hours=12)
IDLE = timedelta(minutes=30)
MAX_FAILURES = 5
LOCK_FOR = timedelta(minutes=15)
DELAY_BASE = float(os.environ.get("AUTH_DELAY_BASE_SECONDS", "0.25"))
TOTP_PENDING_TTL = timedelta(minutes=10)

INVALID = "Invalid credentials."
INVALID_CODE = "Invalid code."
STEP_EXPIRED = "Your sign-in step expired. Please sign in again."

_fernet = Fernet(TOTP_ENCRYPTION_KEY.encode())
_CODE_PEPPER = hashlib.sha256(f"recovery:{TOTP_ENCRYPTION_KEY}".encode()).digest()
_SID_PEPPER = hashlib.sha256(f"sid:{JWT_SECRET}".encode()).digest()

router = APIRouter(prefix="/api/admin-auth")


# ---------------------------------------------------------------- helpers
def _hmac(pepper: bytes, value: str) -> str:
    return hmac.new(pepper, value.encode(), hashlib.sha256).hexdigest()


def sid_hash(sid: str) -> str:
    return _hmac(_SID_PEPPER, sid)


def code_hash(code: str) -> str:
    return _hmac(_CODE_PEPPER, code.strip().lower())


def encrypt(value: str) -> str:
    return _fernet.encrypt(value.encode()).decode()


def decrypt(value: str) -> str | None:
    try:
        return _fernet.decrypt(value.encode()).decode()
    except (InvalidToken, AttributeError, ValueError):
        return None


async def log_event(kind: str, request: Request) -> None:
    """Security audit trail: event type, time and hashed IP only (TTL 90 days)."""
    await db.security_events.insert_one({"type": kind, "timestamp": now(), "ip_hash": hash_key(client_ip(request))})


def _cookie(resp: Response, name: str, value: str, max_age: int, httponly: bool = True) -> None:
    resp.set_cookie(name, value, max_age=max_age, httponly=httponly, secure=COOKIE_SECURE, samesite="strict", path="/")


def _clear(resp: Response, *names: str) -> None:
    for name in names:
        resp.delete_cookie(name, path="/", secure=COOKIE_SECURE, httponly=True, samesite="strict")


def _jwt(payload: dict, ttl: timedelta) -> str:
    t = now()
    return jwt.encode({**payload, "iat": t, "exp": t + ttl}, JWT_SECRET, algorithm="HS256")


def _read(token: str | None, kind: str) -> dict | None:
    if not token:
        return None
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], options={"require": ["exp", "iat"]})
    except jwt.InvalidTokenError:
        return None
    return data if data.get("type") == kind else None


# ---------------------------------------------------------------- lockout (per account and per IP)
def _lock_keys(email: str, ip: str) -> list[str]:
    return [f"acct:{hash_key(email)}", f"ip:{hash_key(ip)}"]


async def _locked_for(email: str, ip: str) -> int:
    """Seconds remaining on the longest active lock (0 if none)."""
    t = now()
    remaining = 0
    user = await db.users.find_one({"email": email}, {"locked_until": 1})
    stamps = [user.get("locked_until")] if user else []
    async for doc in db.auth_lockouts.find({"key": {"$in": _lock_keys(email, ip)}}, {"locked_until": 1}):
        stamps.append(doc.get("locked_until"))
    for until in stamps:
        if until:
            until = until if until.tzinfo else until.replace(tzinfo=t.tzinfo)
            if until > t:
                remaining = max(remaining, int((until - t).total_seconds()) + 1)
    return remaining


def _lock_error(seconds: int) -> HTTPException:
    minutes = max(1, -(-seconds // 60))
    return HTTPException(status_code=429, detail=f"Too many attempts. Try again in {minutes} minute{'s' if minutes != 1 else ''}.",
                         headers={"Retry-After": str(seconds)})


async def _guard_locks(email: str, ip: str) -> None:
    seconds = await _locked_for(email, ip)
    if seconds:
        raise _lock_error(seconds)


async def _bump(collection, query: dict, t, upsert: bool) -> int:
    doc = await collection.find_one(query) or {}
    until = doc.get("locked_until")
    if until is not None and (until if until.tzinfo else until.replace(tzinfo=t.tzinfo)) <= t:
        doc["failed_attempts"] = 0
    count = int(doc.get("failed_attempts") or 0) + 1
    update = {"failed_attempts": count, "locked_until": t + LOCK_FOR if count >= MAX_FAILURES else None, "updated_at": t}
    if doc or upsert:
        await collection.update_one(query, {"$set": update}, upsert=upsert)
    return count


async def register_failure(email: str, ip: str, request: Request, kind: str, real_account: bool) -> None:
    """Count the failure for the account and the IP, apply a progressive delay, lock after 5 failures."""
    t = now()
    acct_key, ip_key = _lock_keys(email, ip)
    if real_account:
        acct = await _bump(db.users, {"email": email}, t, upsert=False)
    else:
        acct = await _bump(db.auth_lockouts, {"key": acct_key}, t, upsert=True)
    by_ip = await _bump(db.auth_lockouts, {"key": ip_key}, t, upsert=True)
    await log_event(kind, request)
    worst = max(acct, by_ip)
    if worst >= MAX_FAILURES:
        await log_event("lockout", request)
    await asyncio.sleep(min(DELAY_BASE * (2 ** (worst - 1)), 3.0))


async def clear_failures(email: str, ip: str) -> None:
    await db.users.update_one({"email": email}, {"$set": {"failed_attempts": 0, "locked_until": None}})
    await db.auth_lockouts.delete_many({"key": {"$in": _lock_keys(email, ip)}})


# ---------------------------------------------------------------- sessions
async def create_session(request: Request, response: Response, email: str) -> None:
    """Issues a brand-new session id (rotation) and revokes the one presented by the browser, if any."""
    old = _read(request.cookies.get(SESSION_COOKIE), "session")
    if old:
        await db.admin_sessions.update_one({"session_id": sid_hash(old["sid"])}, {"$set": {"revoked": True}})
    sid, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    t = now()
    await db.admin_sessions.insert_one({
        "session_id": sid_hash(sid), "user": email, "csrf_hash": sid_hash(csrf), "created_at": t, "last_seen_at": t,
        "expires_at": t + ABSOLUTE, "ip_hash": hash_key(client_ip(request)), "revoked": False,
    })
    max_age = int(ABSOLUTE.total_seconds())
    _cookie(response, SESSION_COOKIE, _jwt({"type": "session", "sid": sid}, ABSOLUTE), max_age)
    _cookie(response, CSRF_COOKIE, csrf, max_age, httponly=False)
    _clear(response, PREAUTH_COOKIE)
    await log_event("login_success", request)


async def active_session(request: Request) -> dict | None:
    """Valid signature, stored, not revoked, not expired, idle timeout respected, user still an admin."""
    data = _read(request.cookies.get(SESSION_COOKIE), "session")
    if not data or not isinstance(data.get("sid"), str):
        return None
    t = now()
    doc = await db.admin_sessions.find_one_and_update(
        {"session_id": sid_hash(data["sid"]), "revoked": False, "expires_at": {"$gt": t}, "last_seen_at": {"$gt": t - IDLE}},
        {"$set": {"last_seen_at": t}},
        projection={"_id": 0},
    )
    if not doc:
        return None
    user = await db.users.find_one({"email": doc.get("user")}, {"role": 1})
    if not user or user.get("role") != "admin":
        return None
    return doc


@dataclass
class AdminContext:
    email: str
    session_id: str


async def require_admin(request: Request) -> AdminContext:
    """The single authorization gate applied to every admin endpoint."""
    session = await active_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        cookie, header = request.cookies.get(CSRF_COOKIE, ""), request.headers.get("x-csrf-token", "")
        if not cookie or not header or not hmac.compare_digest(cookie, header) \
                or not hmac.compare_digest(sid_hash(header), session.get("csrf_hash", "")):
            raise HTTPException(status_code=403, detail="Forbidden.")
        await rate_limit("admin-mutation", client_ip(request), 60, 60)
    return AdminContext(email=session["user"], session_id=session["session_id"])


# ---------------------------------------------------------------- request bodies
class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class CodeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=6, max_length=24)


class ChangePasswordIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=1, max_length=256)
    confirm_password: str = Field(min_length=1, max_length=256)


# ---------------------------------------------------------------- login
@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response):
    ip = client_ip(request)
    await rate_limit("login", ip, 10, 3600)
    email = body.email.strip().lower()
    await _guard_locks(email, ip)
    user = await db.users.find_one({"email": email})
    ok = await asyncio.to_thread(verify_password, user.get("password_hash") if user else None, body.password)
    if not ok or not user or user.get("role") != "admin":
        await register_failure(email, ip, request, "login_failed", real_account=bool(user))
        raise HTTPException(status_code=401, detail=INVALID)
    await clear_failures(email, ip)
    if not REQUIRE_TOTP:
        await create_session(request, response, email)
        return {"next": "done"}
    await log_event("login_password_ok", request)
    token = _jwt({"type": "preauth", "sub": email, "jti": secrets.token_hex(8)}, PREAUTH_TTL)
    _cookie(response, PREAUTH_COOKIE, token, int(PREAUTH_TTL.total_seconds()))
    return {"next": "totp_verify" if user.get("totp_enabled") else "totp_setup"}


async def _preauth_user(request: Request) -> dict:
    data = _read(request.cookies.get(PREAUTH_COOKIE), "preauth")
    user = await db.users.find_one({"email": data.get("sub")}) if data else None
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=401, detail=STEP_EXPIRED)
    return user


def _qr(uri: str) -> str:
    """QR code rendered locally (no third-party QR service)."""
    buf = io.BytesIO()
    qrcode.make(uri, box_size=6, border=2).save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def _new_recovery_code() -> str:
    raw = secrets.token_hex(8)
    return "-".join(raw[i:i + 4] for i in range(0, 16, 4))


async def _match_totp(email: str, secret: str, code: str) -> bool:
    """6-digit code, +/-1 time step, each time step usable only once."""
    if len(code) != 6 or not code.isdigit():
        return False
    totp = pyotp.TOTP(secret)
    current = int(time.time()) // 30
    for counter in (current - 1, current, current + 1):
        if hmac.compare_digest(totp.at(counter * 30), code):
            try:
                await db.totp_used.insert_one({"key": hash_key(f"{email}:{counter}"), "at": now()})
            except DuplicateKeyError:
                return False
            return True
    return False


# ---------------------------------------------------------------- TOTP
@router.post("/totp/setup")
async def totp_setup(request: Request):
    user = await _preauth_user(request)
    if user.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="Two-factor authentication is already set up.")
    await _guard_locks(user["email"], client_ip(request))
    await rate_limit("totp-setup", client_ip(request), 10, 600)
    secret = pyotp.random_base32()
    codes = [_new_recovery_code() for _ in range(8)]
    await db.totp_pending.update_one({"user": user["email"]}, {"$set": {
        "secret_encrypted": encrypt(secret), "recovery_hashed": [code_hash(c) for c in codes], "created_at": now()}}, upsert=True)
    uri = pyotp.TOTP(secret).provisioning_uri(name=user["email"], issuer_name="Alex Cearnau Studio")
    return {"qr": _qr(uri), "secret": secret, "otpauth_uri": uri, "recovery_codes": codes}


@router.post("/totp/confirm")
async def totp_confirm(body: CodeIn, request: Request, response: Response):
    user = await _preauth_user(request)
    ip = client_ip(request)
    await rate_limit("totp", ip, 5, 600)
    await _guard_locks(user["email"], ip)
    pending = await db.totp_pending.find_one({"user": user["email"]})
    secret = decrypt(pending["secret_encrypted"]) if pending else None
    if user.get("totp_enabled") or not secret or not await _match_totp(user["email"], secret, body.code.strip()):
        await register_failure(user["email"], ip, request, "totp_failed", real_account=True)
        raise HTTPException(status_code=401, detail=INVALID_CODE)
    await db.users.update_one({"email": user["email"]}, {"$set": {
        "totp_secret_encrypted": pending["secret_encrypted"], "totp_enabled": True,
        "recovery_codes_hashed": pending["recovery_hashed"], "updated_at": now()}})
    await db.totp_pending.delete_one({"user": user["email"]})
    await clear_failures(user["email"], ip)
    await log_event("totp_enabled", request)
    await create_session(request, response, user["email"])
    return {"authenticated": True}


@router.post("/totp/verify")
async def totp_verify(body: CodeIn, request: Request, response: Response):
    user = await _preauth_user(request)
    ip = client_ip(request)
    await rate_limit("totp", ip, 5, 600)
    await _guard_locks(user["email"], ip)
    if not user.get("totp_enabled"):
        raise HTTPException(status_code=400, detail=STEP_EXPIRED)
    code = body.code.strip().lower()
    secret = decrypt(user.get("totp_secret_encrypted") or "")
    ok = bool(secret) and await _match_totp(user["email"], secret, code)
    recovery = False
    if not ok and len(code) != 6:
        hashed = code_hash(code)
        res = await db.users.update_one({"email": user["email"], "recovery_codes_hashed": hashed},
                                        {"$pull": {"recovery_codes_hashed": hashed}, "$set": {"updated_at": now()}})
        ok = recovery = res.modified_count == 1
    if not ok:
        await register_failure(user["email"], ip, request, "totp_failed", real_account=True)
        raise HTTPException(status_code=401, detail=INVALID_CODE)
    await clear_failures(user["email"], ip)
    if recovery:
        await db.admin_sessions.update_many({"user": user["email"]}, {"$set": {"revoked": True}})
        await log_event("recovery_code_used", request)
    else:
        await log_event("totp_verified", request)
    await create_session(request, response, user["email"])
    return {"authenticated": True}


# ---------------------------------------------------------------- session management
@router.get("/session")
async def session(request: Request):
    return {"authenticated": bool(await active_session(request))}


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Revokes the presented session and clears cookies. Requires the CSRF double-submit token."""
    cookie, header = request.cookies.get(CSRF_COOKIE, ""), request.headers.get("x-csrf-token", "")
    data = _read(request.cookies.get(SESSION_COOKIE), "session")
    if data:
        if not cookie or not header or not hmac.compare_digest(cookie, header):
            raise HTTPException(status_code=403, detail="Forbidden.")
        await db.admin_sessions.update_one({"session_id": sid_hash(data["sid"])}, {"$set": {"revoked": True}})
        await log_event("logout", request)
    _clear(response, SESSION_COOKIE, CSRF_COOKIE, PREAUTH_COOKIE)
    return {"ok": True}


@router.post("/change-password")
async def change_password(body: ChangePasswordIn, request: Request, admin: AdminContext = Depends(require_admin)):
    ip = client_ip(request)
    await _guard_locks(admin.email, ip)
    user = await db.users.find_one({"email": admin.email})
    if not await asyncio.to_thread(verify_password, user.get("password_hash"), body.current_password):
        await register_failure(admin.email, ip, request, "password_change_failed", real_account=True)
        raise HTTPException(status_code=400, detail="The current password is incorrect.")
    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=422, detail="The new passwords do not match.")
    problem = policy_error(body.new_password, admin.email)
    if problem:
        raise HTTPException(status_code=422, detail=problem)
    if body.new_password == body.current_password:
        raise HTTPException(status_code=422, detail="The new password must be different from the current one.")
    new_hash = await asyncio.to_thread(hash_password, body.new_password)
    await db.users.update_one({"email": admin.email}, {"$set": {"password_hash": new_hash, "updated_at": now()}})
    revoked = await db.admin_sessions.update_many({"user": admin.email, "session_id": {"$ne": admin.session_id}},
                                                  {"$set": {"revoked": True}})
    await clear_failures(admin.email, ip)
    await log_event("password_changed", request)
    return {"ok": True, "other_sessions_revoked": revoked.modified_count}


@router.get("/settings")
async def settings(admin: AdminContext = Depends(require_admin)):
    user = await db.users.find_one({"email": admin.email})
    weak_initial = bool(ADMIN_INITIAL_PASSWORD) and is_weak(ADMIN_INITIAL_PASSWORD) and await asyncio.to_thread(
        verify_password, user.get("password_hash"), ADMIN_INITIAL_PASSWORD)
    return {
        "email": admin.email,
        "totp_required": REQUIRE_TOTP,
        "totp_enabled": bool(user.get("totp_enabled")),
        "recovery_codes_remaining": len(user.get("recovery_codes_hashed") or []),
        "weak_initial_password": weak_initial,
        "idle_timeout_seconds": int(IDLE.total_seconds()),
    }
