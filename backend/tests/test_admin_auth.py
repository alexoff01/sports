"""Admin auth + authorization tests.

Run: cd /app/backend && python -m pytest tests -q
Uses an isolated database (<DB_NAME>_pytest) and a password generated at runtime, so the real admin
account and its password are never touched or needed. Object storage is replaced by an in-memory fake.
"""
import asyncio
import io
import os
import secrets
import subprocess
import sys
from datetime import timedelta
from pathlib import Path

import pytest
from dotenv import load_dotenv

BACKEND = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND / ".env")
os.environ["DB_NAME"] = os.environ.get("DB_NAME", "portfolio") + "_pytest"
os.environ["ADMIN_INITIAL_PASSWORD"] = TEST_PASSWORD = "T-" + secrets.token_urlsafe(18)
os.environ["AUTH_DELAY_BASE_SECONDS"] = "0.005"
os.environ["ADMIN_REQUIRE_TOTP"] = "true"
sys.path.insert(0, str(BACKEND))

import httpx  # noqa: E402
import pymongo  # noqa: E402
import pyotp  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from PIL import Image  # noqa: E402
from pymongo.errors import DuplicateKeyError  # noqa: E402

import auth  # noqa: E402
import projects  # noqa: E402
from config import ADMIN_EMAIL, ALLOWED_ORIGINS  # noqa: E402
from passwords import verify_password  # noqa: E402
from seed import ensure_user_indexes, seed_admin  # noqa: E402
from server import app  # noqa: E402

MONGO = pymongo.MongoClient(os.environ["MONGO_URL"])
DB = MONGO[os.environ["DB_NAME"]]
ORIGIN = ALLOWED_ORIGINS[0]
STORE: dict[str, bytes] = {}


def _fake_put(path, data, content_type):
    STORE[path] = data.read() if hasattr(data, "read") else data
    return path


projects.init_storage = lambda force=False: "fake"
projects._put = _fake_put
projects._get = lambda path: STORE[path]


SHARED: dict = {}


class VClient:
    """A browser-like client (own cookie jar, own IP) on top of one shared TestClient / event loop."""

    def __init__(self, ip):
        self.cookies = httpx.Cookies()
        self.headers = {"Origin": ORIGIN, "X-Forwarded-For": ip}

    def request(self, method, url, headers=None, **kw):
        base = SHARED["client"]
        base.cookies = self.cookies
        r = base.request(method, url, headers={**self.headers, **(headers or {})}, **kw)
        self.cookies = httpx.Cookies(base.cookies)
        return r

    def get(self, url, **kw):
        return self.request("GET", url, **kw)

    def post(self, url, **kw):
        return self.request("POST", url, **kw)

    def put(self, url, **kw):
        return self.request("PUT", url, **kw)

    def delete(self, url, **kw):
        return self.request("DELETE", url, **kw)


def new_client(ip="203.0.113.10"):
    return VClient(ip)


def with_cookie(name, value, ip="203.0.113.10"):
    c = VClient(ip)
    c.headers["Cookie"] = f"{name}={value}"
    return c


@pytest.fixture(scope="module", autouse=True)
def app_ready():
    MONGO.drop_database(os.environ["DB_NAME"])
    with TestClient(app, base_url="https://testserver") as c:  # runs startup: indexes + seed
        SHARED["client"] = c
        yield c
    MONGO.drop_database(os.environ["DB_NAME"])


@pytest.fixture(autouse=True)
def clean_state():
    DB.rate_limits.delete_many({})
    DB.auth_lockouts.delete_many({})
    DB.totp_used.delete_many({})
    DB.users.update_many({}, {"$set": {"failed_attempts": 0, "locked_until": None}})
    yield


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get(auth.CSRF_COOKIE) or ""}


def user():
    return DB.users.find_one({"email": ADMIN_EMAIL})


def totp_secret():
    return auth.decrypt(user()["totp_secret_encrypted"])


def ensure_enrolled():
    """Enrol TOTP once (via the real API) and return the recovery codes."""
    if user().get("totp_enabled"):
        return None
    c = new_client()
    assert c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD}).json()["next"] == "totp_setup"
    setup = c.post("/api/admin-auth/totp/setup").json()
    assert setup["qr"].startswith("data:image/png;base64,") and len(setup["recovery_codes"]) == 8
    assert c.post("/api/admin-auth/totp/confirm", json={"code": pyotp.TOTP(setup["secret"]).now()}).status_code == 200
    pytest.recovery_codes = setup["recovery_codes"]
    return setup


def signed_in(ip="203.0.113.10"):
    ensure_enrolled()
    DB.totp_used.delete_many({})
    c = new_client(ip)
    r = c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200 and r.json()["next"] == "totp_verify", r.text
    r = c.post("/api/admin-auth/totp/verify", json={"code": pyotp.TOTP(totp_secret()).now()})
    assert r.status_code == 200, r.text
    return c


def project_body(slug, published=False):
    return {
        "title": "Test Project", "slug": slug, "category": "Strategy", "project_type": "Concept", "label": "Concept Campaign",
        "summary": "A test project summary text.", "tags": ["a"], "cover_image": "/images/hero-stadium-lg.webp",
        "cover_alt": "Alt text here", "gallery": [], "videos": [], "context": "Context text here.", "objective": "Objective text.",
        "strategy": "Strategy text here.", "execution": "Execution text here.", "outcome": "Outcome text here.",
        "platforms": ["Instagram"], "captions": [], "published": published, "featured": False,
    }


# ------------------------------------------------------------------ seeding
def test_seed_creates_one_admin_from_env_and_never_overwrites():
    docs = list(DB.users.find({}))
    assert len(docs) == 1 and docs[0]["email"] == ADMIN_EMAIL and docs[0]["role"] == "admin"
    assert docs[0]["password_hash"].startswith("$argon2id$v=19$m=19456,t=2,p=1$")
    assert TEST_PASSWORD not in str(docs[0])
    assert set(docs[0]) - {"_id"} == {"email", "password_hash", "role", "totp_secret_encrypted", "totp_enabled",
                                      "recovery_codes_hashed", "failed_attempts", "locked_until", "created_at", "updated_at"}

    async def run():
        mc = AsyncIOMotorClient(os.environ["MONGO_URL"])
        d = mc[os.environ["DB_NAME"] + "_seed"]
        await mc.drop_database(d.name)
        await ensure_user_indexes(d)
        first = await seed_admin(d, "owner@example.com", "short1")
        h1 = (await d.users.find_one({}))["password_hash"]
        again = await seed_admin(d, "owner@example.com", "a-different-password-123")
        h2 = (await d.users.find_one({}))["password_hash"]
        second = await seed_admin(d, "intruder@example.com", "another-password-123")
        count = await d.users.count_documents({})
        dup = None
        try:
            await d.users.insert_one({"email": "x@example.com", "role": "admin"})
        except DuplicateKeyError:
            dup = "blocked"
        await mc.drop_database(d.name)
        return first, again, second, count, h1 == h2, verify_password(h1, "short1"), dup

    first, again, second, count, unchanged, ok, dup = asyncio.run(run())
    assert (first, again, second, count, unchanged, ok, dup) == ("created", "exists", "refused", 1, True, True, "blocked")


# ------------------------------------------------------------------ no account-creation surface
def test_no_registration_or_user_endpoints():
    paths = {getattr(r, "path", "") for r in app.routes}
    for word in ("register", "signup", "sign-up", "users", "reset", "forgot", "magic", "link", "invite"):
        assert not any(word in p for p in paths), word
    auth_paths = {p for p in paths if p.startswith("/api/admin-auth")}
    assert auth_paths == {"/api/admin-auth/login", "/api/admin-auth/totp/setup", "/api/admin-auth/totp/confirm",
                          "/api/admin-auth/totp/verify", "/api/admin-auth/session", "/api/admin-auth/logout",
                          "/api/admin-auth/change-password", "/api/admin-auth/settings"}
    c = new_client()
    for p in ("/api/admin-auth/register", "/api/register", "/api/users", "/api/admin-auth/request-link"):
        assert c.post(p, json={"email": "a@b.co", "password": "x" * 20}).status_code in (404, 405)


# ------------------------------------------------------------------ login
def test_wrong_email_and_wrong_password_are_identical():
    c = new_client()
    a = c.post("/api/admin-auth/login", json={"email": "nobody@example.com", "password": "Wrong-password-1"})
    b = c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": "Wrong-password-1"})
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json() == {"detail": "Invalid credentials."}
    assert "set-cookie" not in a.headers and "set-cookie" not in b.headers
    assert sorted(a.headers.keys()) == sorted(b.headers.keys())


def test_login_does_not_create_session_before_totp():
    c = new_client()
    r = c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL.upper(), "password": TEST_PASSWORD})
    assert r.status_code == 200 and r.json()["next"] in ("totp_setup", "totp_verify")
    assert c.cookies.get(auth.PREAUTH_COOKIE) and not c.cookies.get(auth.SESSION_COOKIE)
    assert c.get("/api/admin-auth/session").json() == {"authenticated": False}
    assert c.get("/api/admin/projects").status_code == 401


def test_account_lockout_after_five_failures_any_ip():
    for i in range(5):
        r = new_client(f"198.51.100.{i}").post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": f"bad-{i}"})
        assert r.status_code == 401
    r = new_client("198.51.100.99").post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 429 and int(r.headers["retry-after"]) > 800 and "minute" in r.json()["detail"]
    assert user()["failed_attempts"] == 5 and user()["locked_until"] is not None


def test_ip_lockout_and_unknown_email_lockout_look_the_same():
    c = new_client("192.0.2.50")
    for i in range(5):
        assert c.post("/api/admin-auth/login", json={"email": f"x{i}@example.com", "password": "nope-nope"}).status_code == 401
    r = c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 429
    DB.auth_lockouts.delete_many({})
    for _ in range(5):
        new_client("192.0.2.51").post("/api/admin-auth/login", json={"email": "ghost@example.com", "password": "nope-nope"})
    ghost = new_client("192.0.2.52").post("/api/admin-auth/login", json={"email": "ghost@example.com", "password": "nope-nope"})
    assert ghost.status_code == 429 and ghost.json()["detail"].startswith("Too many attempts")


def test_success_resets_failure_counter():
    c = new_client("192.0.2.60")
    for _ in range(4):
        c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": "bad-password"})
    assert c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD}).status_code == 200
    assert user()["failed_attempts"] == 0
    for _ in range(4):
        assert c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": "bad-password"}).status_code == 401
    assert c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD}).status_code == 200


def test_login_rate_limit_10_per_hour():
    c = new_client("192.0.2.70")
    for _ in range(10):
        assert c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD}).status_code == 200
    r = c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 429 and r.json()["detail"].startswith("Too many requests")


# ------------------------------------------------------------------ TOTP
def test_totp_requires_preauth():
    c = new_client()
    for p in ("/api/admin-auth/totp/setup", "/api/admin-auth/totp/confirm", "/api/admin-auth/totp/verify"):
        assert c.post(p, json={"code": "123456"}).status_code in (401, 422)
        assert c.post(p, json={"code": "123456"}).status_code != 200


def test_totp_setup_confirm_verify_reuse_and_recovery():
    setup = ensure_enrolled()
    u = user()
    assert u["totp_enabled"] is True and len(u["recovery_codes_hashed"]) >= 7
    if setup:
        assert setup["secret"] not in str(u) and setup["recovery_codes"][0] not in str(u)
    DB.totp_used.delete_many({})
    code = pyotp.TOTP(totp_secret()).now()
    c = new_client("192.0.2.80")
    assert c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD}).json()["next"] == "totp_verify"
    assert c.post("/api/admin-auth/totp/verify", json={"code": "000000" if code != "000000" else "111111"}).status_code == 401
    r = c.post("/api/admin-auth/totp/verify", json={"code": code})
    assert r.status_code == 200 and c.get("/api/admin-auth/session").json() == {"authenticated": True}
    # Same code again (new pre-auth) is rejected as a replay.
    c2 = new_client("192.0.2.81")
    c2.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
    assert c2.post("/api/admin-auth/totp/verify", json={"code": code}).status_code == 401
    # Recovery code works once.
    rc = pytest.recovery_codes.pop()
    c3 = new_client("192.0.2.82")
    c3.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
    before = len(user()["recovery_codes_hashed"])
    assert c3.post("/api/admin-auth/totp/verify", json={"code": rc}).status_code == 200
    assert len(user()["recovery_codes_hashed"]) == before - 1
    c4 = new_client("192.0.2.83")
    c4.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
    assert c4.post("/api/admin-auth/totp/verify", json={"code": rc}).status_code == 401


def test_session_id_rotates_on_verify():
    c = signed_in("192.0.2.84")
    old = c.cookies.get(auth.SESSION_COOKIE)
    DB.totp_used.delete_many({})
    c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
    assert c.post("/api/admin-auth/totp/verify", json={"code": pyotp.TOTP(totp_secret()).now()}).status_code == 200
    assert c.cookies.get(auth.SESSION_COOKIE) != old
    stale = with_cookie(auth.SESSION_COOKIE, old)
    assert stale.get("/api/admin/projects").status_code == 401


def test_totp_verify_rate_limit_5_per_10_minutes():
    ensure_enrolled()
    c = new_client("192.0.2.90")
    c.post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
    statuses = [c.post("/api/admin-auth/totp/verify", json={"code": "999999"}).status_code for _ in range(6)]
    assert statuses[:5] == [401] * 5 and statuses[5] == 429


def test_session_endpoint_returns_only_authenticated_flag():
    assert new_client().get("/api/admin-auth/session").json() == {"authenticated": False}
    assert signed_in().get("/api/admin-auth/session").json() == {"authenticated": True}


# ------------------------------------------------------------------ authorization on every admin endpoint
def _admin_routes():
    out = []
    for r in app.routes:
        path = getattr(r, "path", "")
        if path.startswith("/api/admin/") or path in ("/api/admin-auth/change-password", "/api/admin-auth/settings"):
            for m in r.methods - {"HEAD", "OPTIONS"}:
                out.append((m, path.replace("{project_id}", "00000000-0000-0000-0000-000000000000")
                            .replace("{message_id}", "00000000-0000-0000-0000-000000000000")
                            .replace("{media_id}", "00000000-0000-0000-0000-000000000000")
                            .replace("{upload_id}", "00000000-0000-0000-0000-000000000000"), r))
    return out


def test_every_admin_route_uses_require_admin():
    routes = _admin_routes()
    assert len(routes) >= 14
    for _, path, r in routes:
        deps = {d.call for d in r.dependant.dependencies}
        assert auth.require_admin in deps, path


def _call(c, method, path, headers=None):
    return c.request(method, path + ("?index=0" if path.endswith("/chunk") else ""), headers=headers or {}, json={})


def test_admin_routes_reject_missing_expired_revoked_idle_sessions_and_missing_csrf():
    anon = new_client()
    for m, p, _ in _admin_routes():
        assert _call(anon, m, p).status_code == 401, (m, p)

    c = signed_in()
    for m, p, _ in _admin_routes():
        if m != "GET":
            assert _call(c, m, p).status_code == 403, (m, p)  # session ok, CSRF header missing
            assert _call(c, m, p, {"X-CSRF-Token": "forged"}).status_code == 403, (m, p)
    assert c.get("/api/admin/projects").status_code == 200

    def session_doc():
        return DB.admin_sessions.find_one({"session_id": auth.sid_hash(auth._read(c.cookies.get(auth.SESSION_COOKIE), "session")["sid"])})

    sid = session_doc()["_id"]
    DB.admin_sessions.update_one({"_id": sid}, {"$set": {"last_seen_at": auth.now() - timedelta(minutes=31)}})
    assert c.get("/api/admin/projects").status_code == 401  # idle timeout
    c = signed_in()
    sid = session_doc()["_id"]
    DB.admin_sessions.update_one({"_id": sid}, {"$set": {"expires_at": auth.now() - timedelta(seconds=1)}})
    assert c.get("/api/admin/projects").status_code == 401  # absolute expiry
    c = signed_in()
    DB.admin_sessions.update_one({"_id": session_doc()["_id"]}, {"$set": {"revoked": True}})
    assert c.get("/api/admin/projects").status_code == 401  # revoked
    forged = with_cookie(auth.SESSION_COOKIE, "eyJhbGciOiJIUzI1NiJ9.eyJ0eXBlIjoic2Vzc2lvbiJ9.bad")
    assert forged.get("/api/admin/projects").status_code == 401  # bad signature


def test_logout_revokes_session():
    c = signed_in()
    cookie = c.cookies.get(auth.SESSION_COOKIE)
    assert c.post("/api/admin-auth/logout", headers=csrf(c)).status_code == 200
    replay = with_cookie(auth.SESSION_COOKIE, cookie)
    assert replay.get("/api/admin/projects").status_code == 401
    assert replay.get("/api/admin-auth/session").json() == {"authenticated": False}


def test_origin_mismatch_rejected():
    c = signed_in()
    r = c.post("/api/admin/projects", json=project_body("test-origin"), headers={**csrf(c), "Origin": "https://evil.example"})
    assert r.status_code == 403
    assert new_client().post("/api/admin-auth/login", json={"email": "a@b.co", "password": "x"}, headers={"Origin": "https://evil.example"}).status_code == 403


def test_admin_mutation_rate_limit_60_per_minute():
    c = signed_in("192.0.2.95")
    pid = c.post("/api/admin/projects", json=project_body("test-ratelimit"), headers=csrf(c)).json()["id"]
    codes = [c.post(f"/api/admin/projects/{pid}/publish", json={"published": False}, headers=csrf(c)).status_code for _ in range(60)]
    assert codes.count(429) >= 1 and codes[0] == 200
    DB.rate_limits.delete_many({})
    c.delete(f"/api/admin/projects/{pid}", headers=csrf(c))


# ------------------------------------------------------------------ password change
def test_change_password_policy_and_revokes_other_sessions():
    global TEST_PASSWORD
    a, b = signed_in("192.0.2.101"), signed_in("192.0.2.102")
    h = csrf(a)
    url = "/api/admin-auth/change-password"
    assert a.post(url, json={"current_password": "wrong-one", "new_password": "N" * 14, "confirm_password": "N" * 14}, headers=h).status_code == 400
    assert a.post(url, json={"current_password": TEST_PASSWORD, "new_password": "short", "confirm_password": "short"}, headers=h).status_code == 422
    assert a.post(url, json={"current_password": TEST_PASSWORD, "new_password": ADMIN_EMAIL, "confirm_password": ADMIN_EMAIL}, headers=h).status_code == 422
    assert a.post(url, json={"current_password": TEST_PASSWORD, "new_password": "N" * 14, "confirm_password": "M" * 14}, headers=h).status_code == 422
    new = "New-" + secrets.token_urlsafe(14)
    r = a.post(url, json={"current_password": TEST_PASSWORD, "new_password": new, "confirm_password": new}, headers=h)
    assert r.status_code == 200 and r.json()["other_sessions_revoked"] >= 1
    assert a.get("/api/admin/projects").status_code == 200
    assert b.get("/api/admin/projects").status_code == 401
    old_try = new_client("192.0.2.103").post("/api/admin-auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
    assert old_try.status_code == 401
    TEST_PASSWORD = new
    assert a.get("/api/admin-auth/settings").json()["weak_initial_password"] is False


# ------------------------------------------------------------------ public API never exposes drafts
def test_public_api_never_returns_drafts_or_internal_fields():
    c = signed_in()
    r = c.post("/api/admin/projects", json=project_body("test-draft"), headers=csrf(c))
    assert r.status_code == 201
    pid = r.json()["id"]
    pub = new_client()
    assert all(p["slug"] != "test-draft" for p in pub.get("/api/projects").json())
    assert pub.get("/api/projects/test-draft").status_code == 404
    assert c.post(f"/api/admin/projects/{pid}/publish", json={"published": True}, headers=csrf(c)).status_code == 200
    item = pub.get("/api/projects/test-draft").json()
    assert not {"published", "order", "created_at", "updated_at", "_id"} & set(item)
    assert c.post(f"/api/admin/projects/{pid}/publish", json={"published": False}, headers=csrf(c)).status_code == 200
    assert pub.get("/api/projects/test-draft").status_code == 404
    assert c.delete(f"/api/admin/projects/{pid}", headers=csrf(c)).status_code == 200


# ------------------------------------------------------------------ uploads
def _png_with_exif():
    img = Image.new("RGB", (64, 48), (10, 20, 200))
    exif = Image.Exif()
    exif[0x010F] = "SecretCameraMaker"
    buf = io.BytesIO()
    img.save(buf, "PNG", exif=exif)
    return buf.getvalue()


def test_image_upload_validation_and_exif_strip():
    c = signed_in()
    h = csrf(c)
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    assert c.post("/api/admin/uploads", files={"file": ("x.png", svg, "image/png")}, headers=h).status_code == 415
    assert c.post("/api/admin/uploads", files={"file": ("x.jpg", b"<html></html>", "image/jpeg")}, headers=h).status_code == 415
    assert c.post("/api/admin/uploads", files={"file": ("x.exe", b"MZ\x90\x00" * 10, "image/png")}, headers=h).status_code == 415
    big = b"\x89PNG\r\n\x1a\n" + b"0" * (10 * 1024 * 1024)
    assert c.post("/api/admin/uploads", files={"file": ("big.png", big, "image/png")}, headers=h).status_code == 413
    r = c.post("/api/admin/uploads", files={"file": ("photo.png", _png_with_exif(), "image/png")}, headers=h)
    assert r.status_code == 201, r.text
    url = r.json()["url"]
    media_id = url.rsplit("/", 1)[1]
    assert "photo" not in url
    for key, data in STORE.items():
        if media_id in key:
            assert b"SecretCameraMaker" not in data
    webp = c.get(url, headers={"Accept": "image/webp"})
    avif = c.get(url, headers={"Accept": "image/avif,image/webp"})
    assert webp.headers["content-type"] == "image/webp" and avif.headers["content-type"] == "image/avif"
    assert webp.headers["x-content-type-options"] == "nosniff"
    assert new_client().get(url).status_code == 401  # not used by a published project yet
    assert c.delete(f"/api/admin/media/{media_id}", headers=h).status_code == 200
    assert c.get(url).status_code == 404


def test_chunked_video_upload():
    c = signed_in()
    h = csrf(c)
    fake = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom" + b"\x00" * 2000
    init = c.post("/api/admin/uploads/video/init", json={"size": len(fake), "content_type": "video/mp4"}, headers=h).json()
    assert init["chunk_size"] == 5 * 1024 * 1024
    assert c.put(f"/api/admin/uploads/video/{init['upload_id']}/chunk?index=0", content=fake, headers=h).status_code == 200
    r = c.post(f"/api/admin/uploads/video/{init['upload_id']}/complete", headers=h)
    assert r.status_code == 201 and r.json()["content_type"] == "video/mp4"
    rng = c.get(r.json()["url"], headers={"Range": "bytes=0-99"})
    assert rng.status_code == 206 and len(rng.content) == 100 and rng.headers["content-type"] == "video/mp4"
    bad = c.post("/api/admin/uploads/video/init", json={"size": 100, "content_type": "video/mp4"}, headers=h).json()
    assert c.put(f"/api/admin/uploads/video/{bad['upload_id']}/chunk?index=0", content=b"<html>" + b"0" * 94, headers=h).status_code == 415
    too_big = c.post("/api/admin/uploads/video/init", json={"size": 101 * 1024 * 1024, "content_type": "video/mp4"}, headers=h)
    assert too_big.status_code == 422


# ------------------------------------------------------------------ headers
def test_security_headers():
    r = new_client().get("/api/admin-auth/session")
    assert r.headers["cache-control"] == "no-store"
    assert r.headers["referrer-policy"] == "no-referrer"
    assert r.headers["x-robots-tag"] == "noindex, nofollow"
    assert "frame-ancestors 'none'" in r.headers["content-security-policy"]
    assert "unsafe-inline" not in r.headers["content-security-policy"]
    assert r.headers["x-content-type-options"] == "nosniff"
    assert "max-age=" in r.headers["strict-transport-security"]


# ------------------------------------------------------------------ production config
def _import_config(**overrides):
    env = {**os.environ, "APP_ENV": "production", **overrides}
    return subprocess.run([sys.executable, "-c", "import config"], cwd=BACKEND, env=env, capture_output=True, text=True)


@pytest.mark.parametrize("name,value", [("JWT_SECRET", ""), ("JWT_SECRET", "short"), ("ADMIN_EMAIL", ""),
                                        ("ADMIN_PATH", ""), ("ADMIN_PATH", "/x"), ("TOTP_ENCRYPTION_KEY", "nope")])
def test_production_refuses_missing_or_weak_secrets(name, value):
    r = _import_config(**{name: value})
    assert r.returncode != 0 and name in r.stderr
    secret_values = [os.environ.get("JWT_SECRET", ""), os.environ.get("TOTP_ENCRYPTION_KEY", "")]
    assert not any(v and v in r.stderr for v in secret_values)


def test_weak_initial_password_never_blocks_startup():
    assert _import_config(ADMIN_INITIAL_PASSWORD="short").returncode == 0
