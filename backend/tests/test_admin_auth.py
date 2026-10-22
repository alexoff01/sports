"""Admin passwordless auth tests. Run: cd /app/backend && python -m pytest tests -q"""
import os
import sys
from datetime import datetime, timedelta, timezone

import pymongo
import pyotp
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import auth  # noqa: E402
from core import ALLOWED_ORIGINS  # noqa: E402
from server import app  # noqa: E402

DB = pymongo.MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
ORIGIN = {"Origin": ALLOWED_ORIGINS[0]}
SENT = []


def _reset():
    DB.rate_limits.delete_many({})
    DB.security_events.delete_many({})
    DB.admin_login_tokens.delete_many({})
    DB.admin_sessions.delete_many({})
    DB.admin_security.delete_many({})
    DB.projects.delete_many({"slug": {"$regex": "^test-"}})


@pytest.fixture(scope="module")
def client():
    async def fake_deliver(token):
        SENT.append(token)

    auth._deliver_link = fake_deliver
    _reset()
    with TestClient(app, base_url="https://testserver") as c:
        yield c
    _reset()


@pytest.fixture(autouse=True)
def clean_limits():
    DB.rate_limits.delete_many({})
    DB.security_events.delete_many({"type": "totp_failed"})
    yield


def make_token(expired=False):
    raw = "tok-" + os.urandom(16).hex()
    exp = datetime.now(timezone.utc) + (timedelta(minutes=-1) if expired else timedelta(minutes=10))
    DB.admin_login_tokens.insert_one({"token_hash": auth.hmac_hash(raw), "created_at": datetime.now(timezone.utc), "expires_at": exp, "used": False})
    return raw


def secret():
    return auth._fernet.decrypt(DB.admin_security.find_one({"_id": "admin"})["totp_secret_encrypted"].encode()).decode()


def login(c):
    c.cookies.clear()
    r = c.post("/api/admin-auth/verify-link", json={"token": make_token()}, headers=ORIGIN)
    assert r.status_code == 200
    if r.json()["next"] == "totp_setup":
        s = c.post("/api/admin-auth/totp/setup", headers=ORIGIN).json()
        code = pyotp.TOTP(s["secret"]).now()
        assert c.post("/api/admin-auth/totp/confirm", json={"code": code}, headers=ORIGIN).status_code == 200
        return s["recovery_codes"]
    DB.admin_security.update_one({"_id": "admin"}, {"$unset": {"last_code": ""}})
    assert c.post("/api/admin-auth/totp/verify", json={"code": pyotp.TOTP(secret()).now()}, headers=ORIGIN).status_code == 200
    return None


def csrf(c):
    return {**ORIGIN, "X-CSRF-Token": c.cookies.get(auth.CSRF_COOKIE)}


def test_identical_responses_for_authorized_and_unknown_email(client):
    SENT.clear()
    a = client.post("/api/admin-auth/request-link", json={"email": "ALEXMCEARNAU@gmail.com"}, headers=ORIGIN)
    b = client.post("/api/admin-auth/request-link", json={"email": "someone@else.com"}, headers=ORIGIN)
    assert a.status_code == b.status_code == 200 and a.json() == b.json()
    assert len(SENT) == 1


def test_token_single_use_expiry_tamper_and_prefetch(client):
    raw = make_token()
    assert client.get(f"/api/admin-auth/verify-link?token={raw}").status_code == 405
    assert client.post("/api/admin-auth/verify-link", json={"token": raw + "x"}, headers=ORIGIN).status_code == 400
    assert client.post("/api/admin-auth/verify-link", json={"token": raw}, headers=ORIGIN).status_code == 200
    assert client.post("/api/admin-auth/verify-link", json={"token": raw}, headers=ORIGIN).status_code == 400
    assert client.post("/api/admin-auth/verify-link", json={"token": make_token(expired=True)}, headers=ORIGIN).status_code == 400


def test_new_link_invalidates_older_links(client):
    old = make_token()
    client.post("/api/admin-auth/request-link", json={"email": auth.ADMIN_EMAIL}, headers=ORIGIN)
    assert client.post("/api/admin-auth/verify-link", json={"token": old}, headers=ORIGIN).status_code == 400


def test_totp_setup_session_reuse_and_lockout(client):
    codes = login(client)
    assert codes and len(codes) == 8
    assert client.get("/api/admin-auth/session").json() == {"authenticated": True}
    client.cookies.clear()
    client.post("/api/admin-auth/verify-link", json={"token": make_token()}, headers=ORIGIN)
    code = pyotp.TOTP(secret()).now()
    DB.admin_security.update_one({"_id": "admin"}, {"$set": {"last_code": code}})
    assert client.post("/api/admin-auth/totp/verify", json={"code": code}, headers=ORIGIN).status_code == 401
    for _ in range(4):
        client.post("/api/admin-auth/totp/verify", json={"code": "000000"}, headers=ORIGIN)
    assert client.post("/api/admin-auth/totp/verify", json={"code": "000001"}, headers=ORIGIN).status_code == 429


def test_recovery_code_is_single_use_and_revokes_sessions(client):
    DB.admin_sessions.insert_one({"session_id": "other", "revoked": False, "expires_at": datetime.now(timezone.utc) + timedelta(hours=1), "last_seen_at": datetime.now(timezone.utc)})
    rc = DB.admin_security.find_one({"_id": "admin"})
    code = "abcd-1234"
    DB.admin_security.update_one({"_id": "admin"}, {"$set": {"recovery_codes_hashed": rc["recovery_codes_hashed"] + [auth.hmac_hash(code)]}})
    for expected in (200, 401):
        client.cookies.clear()
        client.post("/api/admin-auth/verify-link", json={"token": make_token()}, headers=ORIGIN)
        assert client.post("/api/admin-auth/totp/verify", json={"code": code}, headers=ORIGIN).status_code == expected
    assert DB.admin_sessions.find_one({"session_id": "other"})["revoked"] is True


ADMIN_CALLS = [
    ("get", "/api/admin/projects", None), ("post", "/api/admin/projects", {}), ("put", "/api/admin/projects/x", {}),
    ("delete", "/api/admin/projects/x", None), ("post", "/api/admin/projects/reorder", {"ids": ["x"]}),
    ("get", "/api/admin/messages", None), ("delete", "/api/admin/messages/x", None), ("post", "/api/admin-auth/logout", None),
]


@pytest.mark.parametrize("method,path,body", ADMIN_CALLS)
def test_admin_endpoints_reject_without_session(client, method, path, body):
    client.cookies.clear()
    kw = {"headers": ORIGIN} | ({"json": body} if body is not None else {})
    assert getattr(client, method)(path, **kw).status_code == 401


def test_upload_rejects_without_session(client):
    client.cookies.clear()
    r = client.post("/api/admin/uploads", files={"file": ("a.jpg", b"\xff\xd8\xff" + b"0" * 64, "image/jpeg")}, headers=ORIGIN)
    assert r.status_code == 401


def test_csrf_revocation_and_expiry(client):
    login(client)
    assert client.delete("/api/admin/projects/none", headers=ORIGIN).status_code == 403
    assert client.delete("/api/admin/projects/none", headers=csrf(client)).status_code == 404
    DB.admin_sessions.update_many({}, {"$set": {"last_seen_at": datetime.now(timezone.utc) - timedelta(minutes=31)}})
    assert client.get("/api/admin/projects").status_code == 401
    login(client)
    assert client.post("/api/admin-auth/logout", headers=csrf(client)).status_code == 200
    assert client.get("/api/admin/projects").status_code == 401


def test_drafts_never_public(client):
    login(client)
    body = {"title": "Test Draft", "slug": "test-draft", "category": "Video", "project_type": "Concept", "label": "Concept Campaign",
            "summary": "A draft used only by tests.", "tags": [], "cover_image": "/images/hero-stadium-lg.webp", "cover_alt": "Test cover",
            "gallery": [], "context": "Context text.", "objective": "Objective text.", "strategy": "Strategy text.",
            "execution": "Execution text.", "outcome": "Outcome text.", "platforms": ["X"], "captions": [], "published": False, "featured": False}
    assert client.post("/api/admin/projects", json=body, headers=csrf(client)).status_code == 201
    assert "test-draft" not in [p["slug"] for p in client.get("/api/projects").json()]
    assert client.get("/api/projects/test-draft").status_code == 404


def test_rate_limit_on_request_link(client):
    codes = [client.post("/api/admin-auth/request-link", json={"email": "x@y.com"}, headers=ORIGIN).status_code for _ in range(6)]
    assert codes[-1] == 429


def test_no_user_or_password_routes_exist():
    paths = " ".join(getattr(r, "path", "") for r in app.routes).lower()
    for word in ("register", "signup", "users", "password", "/login"):
        assert word not in paths
