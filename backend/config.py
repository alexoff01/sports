"""Central configuration. Reads only environment variables (backend/.env locally). Never logs secret values."""
import base64
import binascii
import logging
import os
import re
import secrets
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger("portfolio.config")


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def _flag(name: str, default: bool) -> bool:
    raw = _env(name)
    return default if not raw else raw.lower() in ("1", "true", "yes", "on")


APP_ENV = _env("APP_ENV", "production").lower()
IS_PROD = APP_ENV == "production"

ADMIN_EMAIL = _env("ADMIN_EMAIL").lower()
ADMIN_INITIAL_PASSWORD = os.environ.get("ADMIN_INITIAL_PASSWORD") or ""
ADMIN_PATH = "/" + _env("ADMIN_PATH").strip("/") if _env("ADMIN_PATH").strip("/") else ""
REQUIRE_TOTP = _flag("ADMIN_REQUIRE_TOTP", True)
COOKIE_SECURE = _flag("COOKIE_SECURE", True)
PUBLIC_BASE_URL = _env("PUBLIC_BASE_URL").rstrip("/")

_jwt = _env("JWT_SECRET")
_totp_key = _env("TOTP_ENCRYPTION_KEY")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PATH_RE = re.compile(r"^/[A-Za-z0-9_-]{12,64}$")


def _valid_fernet(key: str) -> bool:
    try:
        return len(base64.urlsafe_b64decode(key.encode())) == 32
    except (binascii.Error, ValueError):
        return False


def config_problems() -> list[str]:
    """Names of missing/weak settings (never their values)."""
    problems = []
    if not EMAIL_RE.match(ADMIN_EMAIL):
        problems.append("ADMIN_EMAIL")
    if len(_jwt.encode()) < 32 or len(set(_jwt)) < 10:
        problems.append("JWT_SECRET")
    if not PATH_RE.match(ADMIN_PATH or ""):
        problems.append("ADMIN_PATH")
    if not _valid_fernet(_totp_key):
        problems.append("TOTP_ENCRYPTION_KEY")
    if not PUBLIC_BASE_URL.startswith("https://") or "*" in PUBLIC_BASE_URL:
        problems.append("PUBLIC_BASE_URL")
    return problems


def check_config() -> None:
    """Production refuses to start with missing or weak secrets; development falls back to ephemeral values."""
    problems = config_problems()
    if IS_PROD and problems:
        raise RuntimeError("Refusing to start: missing or weak settings: " + ", ".join(problems))
    if problems:
        logger.warning("Development mode with missing/weak settings: %s", ", ".join(problems))


check_config()

# Development fallbacks (production never reaches these because check_config raised).
JWT_SECRET = _jwt if len(_jwt.encode()) >= 32 else secrets.token_urlsafe(48)
TOTP_ENCRYPTION_KEY = _totp_key if _valid_fernet(_totp_key) else base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()

ALLOWED_ORIGINS = [PUBLIC_BASE_URL] if PUBLIC_BASE_URL and "*" not in PUBLIC_BASE_URL else []
if APP_ENV == "development":
    ALLOWED_ORIGINS.append("http://localhost:3000")
