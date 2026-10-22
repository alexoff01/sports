import base64
import io
import os
import re
import secrets
from datetime import timedelta

import bcrypt
import jwt
import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from core import client_ip, db, hash_key, now, rate_limit

JWT_SECRET = os.environ["JWT_SECRET"]
ALGO = "HS256"
ADMIN_EMAILS = {e.strip().lower() for e in os.environ["ADMIN_EMAILS"].split(",") if e.strip()}
SESSION_MIN = 30
PENDING_MIN = 5
MAX_FAILS = 5
LOCK_MIN = 15
GENERIC = "Invalid credentials."
SESSION_COOKIE = "mv_session"
PENDING_COOKIE = "mv_pending"
DUMMY_HASH = bcrypt.hashpw(b"timing-equaliser", bcrypt.gensalt()).decode()

router = APIRouter(prefix="/api/admin/auth")


def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt(rounds=12)).decode()


def check_pw(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def strong_password(p: str) -> bool:
    return (
        len(p) >= 14
        and re.search(r"[a-z]", p)
        and re.search(r"[A-Z]", p)
        and re.search(r"\d", p)
        and re.search(r"[^A-Za-z0-9]", p)
    ) is not None and len(p) >= 14


async def seed_admin() -> None:
    email = os.environ["ADMIN_EMAIL"].strip().lower()
    password = os.environ["ADMIN_PASSWORD"]
    if email not in ADMIN_EMAILS:
        raise RuntimeError("ADMIN_EMAIL must be in ADMIN_EMAILS")
    if not strong_password(password):
        raise RuntimeError("ADMIN_PASSWORD does not meet the password policy")
    existing = await db.admins.find_one({"email": email})
    if existing is None:
        await db.admins.insert_one(
            {"email": email, "password_hash": hash_pw(password), "mfa_enabled": False, "created_at": now()}
        )
    elif not check_pw(password, existing["password_hash"]):
        await db.admins.update_one({"email": email}, {"$set": {"password_hash": hash_pw(password)}})


def _set_cookie(resp: Response, name: str, value: str, minutes: int) -> None:
    resp.set_cookie(name, value, max_age=minutes * 60, httponly=True, secure=True, samesite="strict", path="/api")


def _token(payload: dict, minutes: int) -> str:
    return jwt.encode({**payload, "exp": now() + timedelta(minutes=minutes)}, JWT_SECRET, algorithm=ALGO)


def _decode(token: str | None, kind: str) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[ALGO])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    if data.get("type") != kind:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return data


async def _locked(ident: str) -> bool:
    since = now() - timedelta(minutes=LOCK_MIN)
    return await db.login_attempts.count_documents({"ident": ident, "at": {"$gte": since}}) >= MAX_FAILS


async def _fail(ident: str) -> None:
    await db.login_attempts.insert_one({"ident": ident, "at": now()})


async def get_admin(request: Request) -> str:
    data = _decode(request.cookies.get(SESSION_COOKIE), "access")
    session = await db.sessions.find_one({"sid": hash_key(data.get("sid", "")), "expires_at": {"$gt": now()}})
    if not session or session["email"] != data.get("sub") or data.get("sub") not in ADMIN_EMAILS:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    admin = await db.admins.find_one({"email": data["sub"], "mfa_enabled": True}, {"_id": 0, "email": 1})
    if not admin:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return admin["email"]


class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class TotpIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(pattern=r"^\d{6}$")


def _qr_data_uri(uri: str) -> str:
    buf = io.BytesIO()
    qrcode.make(uri, box_size=6, border=2).save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response):
    ip = client_ip(request)
    await rate_limit("auth", ip, 20, 900)
    email = body.email.lower()
    ident = hash_key(f"{ip}:{email}")
    if await _locked(ident) or await _locked(hash_key(email)):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")
    admin = await db.admins.find_one({"email": email}) if email in ADMIN_EMAILS else None
    valid = check_pw(body.password, admin["password_hash"] if admin else DUMMY_HASH) and admin is not None
    if not valid:
        await _fail(ident)
        await _fail(hash_key(email))
        raise HTTPException(status_code=401, detail=GENERIC)
    _set_cookie(response, PENDING_COOKIE, _token({"sub": email, "type": "mfa_pending"}, PENDING_MIN), PENDING_MIN)
    if admin.get("mfa_enabled"):
        return {"step": "totp"}
    secret = admin.get("pending_totp") or pyotp.random_base32()
    await db.admins.update_one({"email": email}, {"$set": {"pending_totp": secret}})
    uri = pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="Alex Cearnau Studio")
    return {"step": "enroll", "qr": _qr_data_uri(uri), "secret": secret}


@router.post("/verify")
async def verify(body: TotpIn, request: Request, response: Response):
    ip = client_ip(request)
    await rate_limit("auth", ip, 20, 900)
    email = _decode(request.cookies.get(PENDING_COOKIE), "mfa_pending")["sub"]
    ident = hash_key(f"{ip}:{email}")
    if await _locked(ident) or await _locked(hash_key(email)):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")
    admin = await db.admins.find_one({"email": email})
    secret = admin.get("totp_secret") if admin.get("mfa_enabled") else admin.get("pending_totp")
    if not secret or admin.get("last_totp") == body.code or not pyotp.TOTP(secret).verify(body.code, valid_window=1):
        await _fail(ident)
        await _fail(hash_key(email))
        raise HTTPException(status_code=401, detail="Invalid code.")
    update = {"last_totp": body.code, "last_login_at": now()}
    if not admin.get("mfa_enabled"):
        update.update({"totp_secret": secret, "mfa_enabled": True})
    await db.admins.update_one({"email": email}, {"$set": update, "$unset": {"pending_totp": ""}})
    await db.login_attempts.delete_many({"ident": {"$in": [ident, hash_key(email)]}})
    sid = secrets.token_urlsafe(32)
    await db.sessions.insert_one(
        {"sid": hash_key(sid), "email": email, "expires_at": now() + timedelta(minutes=SESSION_MIN)}
    )
    _set_cookie(response, SESSION_COOKIE, _token({"sub": email, "sid": sid, "type": "access"}, SESSION_MIN), SESSION_MIN)
    response.delete_cookie(PENDING_COOKIE, path="/api")
    return {"email": email}


@router.get("/me")
async def me(email: str = Depends(get_admin)):
    return {"email": email}


@router.post("/refresh")
async def refresh(request: Request, response: Response, email: str = Depends(get_admin)):
    data = _decode(request.cookies.get(SESSION_COOKIE), "access")
    await db.sessions.update_one(
        {"sid": hash_key(data["sid"])}, {"$set": {"expires_at": now() + timedelta(minutes=SESSION_MIN)}}
    )
    _set_cookie(response, SESSION_COOKIE, _token({"sub": email, "sid": data["sid"], "type": "access"}, SESSION_MIN), SESSION_MIN)
    return {"email": email}


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=[ALGO], options={"verify_exp": False})
            await db.sessions.delete_one({"sid": hash_key(data.get("sid", ""))})
        except jwt.InvalidTokenError:
            pass
    response.delete_cookie(SESSION_COOKIE, path="/api")
    response.delete_cookie(PENDING_COOKIE, path="/api")
    return {"ok": True}
