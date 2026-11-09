# Live regression: CSRF / Origin / session gates on the public preview URL (uses real admin + e2e TOTP secret)
import os
import time

import pyotp
import pytest
import requests
from dotenv import dotenv_values

FRONT = dotenv_values("/app/frontend/.env")
BACK = dotenv_values("/app/backend/.env")
BASE_URL = FRONT["REACT_APP_BACKEND_URL"].rstrip("/")
SECRET_FILE = "/tmp/e2e_totp_secret"


@pytest.fixture(scope="module")
def admin():
    if not os.path.exists(SECRET_FILE):
        pytest.skip("no e2e totp secret")
    s = requests.Session()
    s.headers.update({"Origin": BASE_URL})
    r = s.post(f"{BASE_URL}/api/admin-auth/login", json={"email": BACK["ADMIN_EMAIL"], "password": BACK["ADMIN_INITIAL_PASSWORD"]})
    assert r.status_code == 200, r.text
    assert r.json()["next"] == "totp_verify"
    totp = pyotp.TOTP(open(SECRET_FILE).read().strip())
    for offset in (0, 30):
        r = s.post(f"{BASE_URL}/api/admin-auth/totp/verify", json={"code": totp.at(time.time() + offset)})
        if r.status_code == 200:
            break
    assert r.status_code == 200, r.text
    csrf = next(c.value for c in s.cookies if c.name.endswith("admin_csrf"))
    yield s, csrf
    s.post(f"{BASE_URL}/api/admin-auth/logout", headers={"X-CSRF-Token": csrf})


def test_no_session_401():
    r = requests.post(f"{BASE_URL}/api/admin/projects/reorder", json={"ids": ["x"]}, headers={"Origin": BASE_URL})
    assert r.status_code == 401
    assert requests.get(f"{BASE_URL}/api/admin/projects").status_code == 401


def test_session_get_ok(admin):
    s, _ = admin
    r = s.get(f"{BASE_URL}/api/admin/projects")
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 6
    assert "_id" not in r.json()[0]


def test_missing_csrf_403(admin):
    s, _ = admin
    r = s.post(f"{BASE_URL}/api/admin/projects/reorder", json={"ids": ["x"]})
    assert r.status_code == 403


def test_wrong_csrf_403(admin):
    s, _ = admin
    r = s.post(f"{BASE_URL}/api/admin/projects/reorder", json={"ids": ["x"]}, headers={"X-CSRF-Token": "nope"})
    assert r.status_code == 403


def test_evil_origin_403(admin):
    s, csrf = admin
    r = s.post(f"{BASE_URL}/api/admin/projects/reorder", json={"ids": ["x"]},
               headers={"X-CSRF-Token": csrf, "Origin": "https://evil.example"})
    assert r.status_code == 403


def test_valid_csrf_passes_gate(admin):
    s, csrf = admin
    r = s.post(f"{BASE_URL}/api/admin/projects/reorder", json={"ids": ["does-not-exist"]}, headers={"X-CSRF-Token": csrf})
    assert r.status_code == 422  # passes CSRF, rejected by validation (no data changed)


def test_settings(admin):
    s, _ = admin
    d = s.get(f"{BASE_URL}/api/admin-auth/settings").json()
    assert d["email"] == BACK["ADMIN_EMAIL"] and d["totp_enabled"] is True


def test_invalid_video_init_type(admin):
    s, csrf = admin
    r = s.post(f"{BASE_URL}/api/admin/uploads/video/init", json={"size": 10, "content_type": "video/avi"}, headers={"X-CSRF-Token": csrf})
    assert r.status_code == 422


def test_public_projects_no_internal_fields():
    r = requests.get(f"{BASE_URL}/api/projects")
    assert r.status_code == 200
    for p in r.json():
        assert "published" not in p and "order" not in p and "_id" not in p
