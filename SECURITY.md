# Security controls

Stack: React (CRA) frontend, FastAPI backend, MongoDB, Emergent object storage and managed email.

## Admin access (verified by `backend/tests/test_admin_auth.py` and a live end-to-end run)
- **Single pre-seeded account, no registration.** At startup `seed.py` creates the one admin from `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` if it does not exist. It never overwrites an existing account and refuses to create a second one (a unique index on `role` also enforces one admin at database level). There is no sign-up, invite, user listing, user-creation or email-reset endpoint.
- **Passwords**: Argon2id (OWASP parameters m=19 MiB, t=2, p=1). Every login runs exactly one Argon2 verification (against a dummy hash when the email is unknown), so a wrong email and a wrong password give identical responses ("Invalid credentials."). Passwords chosen in Settings or with the reset script need at least 12 characters and must differ from the email. A weak initial password only logs a warning (never the value) and shows a one-time banner in the studio.
- **Recovery**: `python scripts/reset_admin_password.py` on the server (hidden input, revokes all sessions; `--reset-totp` also clears two-factor for a lost device). There is no email reset flow.
- **Mandatory TOTP** (`ADMIN_REQUIRE_TOTP=true`): the password step only issues a signed 5-minute pre-auth cookie. First sign-in enrols TOTP (QR rendered locally, manual key, 8 single-use recovery codes shown once). Codes accept a +/-1 step window and cannot be replayed. Secrets are encrypted at rest (Fernet, `TOTP_ENCRYPTION_KEY`); recovery codes are stored as keyed hashes and consumed on use.
- **Sessions**: random session id inside a signed JWT, cookie `__Host-admin_session` (HttpOnly, Secure, SameSite=Strict, Path=/). Stored server-side (hashed id, TTL index) so they can be revoked; 12-hour absolute lifetime, 30-minute idle timeout; the id rotates on every successful two-factor step; logout and password change revoke sessions. The studio warns before the idle sign-out.
- **Lockout**: 5 failed password or TOTP attempts lock the account and the IP for 15 minutes with a progressive delay; success resets the counter. Messages stay generic.
- **Rate limits (per IP)**: login 10/hour, TOTP verify/confirm 5 per 10 minutes, admin mutations and uploads 60/minute, contact form 5/hour.
- **Authorization**: one dependency, `require_admin`, guards every admin endpoint (projects, publish, reorder, uploads, media, messages, settings, change password). It checks signature, stored session, revocation, absolute and idle expiry, and the admin role. Tests enumerate all admin routes and prove 401 without a valid session and 403 without CSRF.
- **CSRF**: double-submit token (`__Host-admin_csrf` cookie + `X-CSRF-Token` header, also bound to the session server-side) on every state-changing admin request, plus SameSite=Strict and a strict `Origin` check. CORS allows only `PUBLIC_BASE_URL` (plus `http://localhost:3000` when `APP_ENV=development`).
- **Audit trail**: security events (login failed/succeeded, TOTP, lockout, password changed, logout) with a hashed IP only, TTL 90 days. Passwords, hashes, tokens and full IPs are never stored in events or logs.
- **Production start-up guard**: with `APP_ENV=production` the backend refuses to start if `ADMIN_EMAIL`, `JWT_SECRET` (min 32 bytes), `ADMIN_PATH`, `TOTP_ENCRYPTION_KEY` or an https `PUBLIC_BASE_URL` is missing or weak.

## Data and uploads
- **Public data**: public endpoints return only `published: true` projects through a field allowlist (no order, timestamps or draft flag). Uploaded media is public only when used by a published project.
- **Uploads** (admin only): magic-byte allowlist (JPEG, PNG, WebP, AVIF; MP4/WebM videos), 10 MB images / 100 MB videos (videos in 5 MB chunks), random UUID names, images decoded and re-encoded (EXIF stripped, max 2400 px, 50 MP cap) into WebP and AVIF (served by `Accept` negotiation). SVG, HTML and executables are rejected. Media is served with the correct type and `nosniff`. Deleting media hides it immediately (soft delete); stored objects stay in object storage.
- **Contact form**: server-side schema validation, control-character stripping, honeypot, rate limit, HTML-escaped email template.

## Headers
API responses: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP `default-src 'none'; frame-ancestors 'none'` (no inline scripts), `Permissions-Policy`, COOP. Admin and auth responses add `Cache-Control: no-store`, `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex, nofollow`.

## Admin discoverability
The studio route is `ADMIN_PATH` (backend `.env`). Only its SHA-256 digest (`REACT_APP_ADMIN_PATH_HASH`) is in the frontend environment; the path itself never appears in HTML, sitemap, robots.txt, source maps (disabled) or the public bundle. Studio code is a separate lazy-loaded chunk and sets `noindex, nofollow`. Security never relies on hiding the path.

## Not covered by the app (hosting layer)
- CSP/HSTS and `X-Robots-Tag` for the static HTML pages (including the studio route) must be set by the host. Suggested CSP: `default-src 'self'; script-src 'self' 'sha256-<inline-script-hashes>'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`.
- The Emergent preview injects `emergent-main.js` and its edge adds its own CORS headers; review both before hosting elsewhere.
- The client IP for per-IP limits is taken from the first `X-Forwarded-For` entry; account-level lockout still applies if that header is spoofed.

## Pre-launch checklist
1. Set `PUBLIC_BASE_URL`, `REACT_APP_BACKEND_URL`, `REACT_APP_SITE_URL` to the production domain (no code change needed); update `public/sitemap.xml` and `robots.txt` URLs.
2. Keep `APP_ENV=production`, `COOKIE_SECURE=true`, `ADMIN_REQUIRE_TOTP=true`.
3. Sign in, enrol TOTP, store the recovery codes offline, then change the initial password in Settings.
4. Configure the frontend security headers above at the host.
5. Run `yarn audit` and `pip-audit`; fix high/critical findings.
