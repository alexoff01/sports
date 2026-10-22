# Security controls

Stack actually used: React (CRA) frontend, FastAPI backend, MongoDB, Emergent object storage and managed email.
(The original brief named Next.js + Supabase; the owner chose to keep this stack.)

## Implemented and verified (curl, 2026-10-22)
- **Admin authentication**: single whitelisted account (`ADMIN_EMAILS`), bcrypt (12 rounds), password policy enforced at seed (>=14 chars, upper, lower, digit, symbol). No sign-up endpoint exists.
- **Mandatory TOTP MFA**: password step only issues a 5-minute `mv_pending` cookie; a session is created only after a valid TOTP code. First login forces enrolment (QR). Codes cannot be replayed.
- **Sessions**: `mv_session` cookie is httpOnly, Secure, SameSite=Strict, Path=/api, 30-minute lifetime, server-side session record (revoked on logout). The studio UI signs out after 15 minutes of inactivity.
- **Brute force**: 5 failed attempts per IP+email or per email lock login/verify for 15 minutes; 20 auth requests per IP per 15 minutes. Generic errors ("Invalid credentials.") and a dummy bcrypt check for unknown emails prevent user enumeration.
- **Authorization**: every `/api/admin/*` route depends on `get_admin` (cookie + session + MFA + whitelist). Unauthenticated calls return 401 (verified for projects, messages, uploads, me).
- **Public data**: `/api/projects` returns published projects only; drafts return 404. Uploaded media is served publicly only when referenced by a published project, otherwise admin-only.
- **CSRF**: all POST/PUT/PATCH/DELETE under `/api` must carry an `Origin` in `CORS_ORIGINS` (403 otherwise) plus SameSite=Strict cookies. CORS is restricted to the same list.
- **Contact form**: Pydantic schema validation server-side (Zod client-side), control-character stripping, honeypot field (silently dropped), 5 submissions per IP per hour, HTML-escaped email template, no caller-controlled recipient/subject/body. Validation errors never echo input.
- **Uploads**: magic-byte allowlist (JPEG, PNG, WebP, AVIF), 8 MB limit, decoded and re-encoded to WebP with Pillow (strips EXIF/metadata, max 2400 px, 50 MP decompression cap), random UUID filenames, 60 uploads per hour. SVG/HTML/executables are rejected (verified with an SVG renamed to .jpg → 415).
- **Privacy in logs and storage**: IPs/emails used for rate limiting are stored only as salted SHA-256 hashes with a 2-hour TTL; logs never contain message content or addresses. Messages auto-delete after 12 months (TTL index).
- **API headers**: HSTS (2 years, preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`. `/api/admin/*` adds `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`. OpenAPI/docs endpoints are disabled.
- **Admin discoverability**: the studio route comes from `REACT_APP_ADMIN_PATH`, is not linked, not in the sitemap or robots.txt, sets `noindex, nofollow`, and its code is a separate lazy-loaded chunk. Note: the path string is present in the main JS bundle (not in the HTML). Security never relies on hiding it.
- **Secrets**: only in `.env` files (examples in `.env.example`); no secret reaches the frontend bundle.
- **Emails are obfuscated**: stored reversed/split in `src/config/site.js` and assembled in the browser.
- **Errors**: custom 404 page, React error boundary page, generic JSON 500 responses.

## Not implemented / not verified here
- **Frontend CSP with nonces and HSTS for HTML pages**: a CRA single-page app is static, so nonce-based CSP must be set by the hosting layer. Recommended header for the static site (no inline scripts needed except the JSON-LD block, which can be hashed):
  `default-src 'self'; script-src 'self' 'sha256-<hash-of-inline-scripts>'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`
  plus HSTS, nosniff, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `COOP: same-origin`, and `X-Robots-Tag: noindex, nofollow` for `/<ADMIN_PATH>*`.
- The Emergent preview injects `emergent-main.js` in `index.html`; review it before production hosting elsewhere.
- Video uploads (mp4/webm) are not enabled.
- TOTP secrets are stored unencrypted in MongoDB (DB access must be restricted).
- `yarn audit` / `pip-audit` not run in this session.
- Lighthouse scores not measured.

## Pre-launch checklist
1. Replace all `TODO_CONFIRM` values (socials, legal details, quote, final images).
2. Generate a new `JWT_SECRET` and `ADMIN_PASSWORD` for production; pick a new `REACT_APP_ADMIN_PATH`.
3. Set `CORS_ORIGINS`, `REACT_APP_BACKEND_URL`, `REACT_APP_SITE_URL` to the production domain; update `public/sitemap.xml` and `robots.txt` URLs.
4. Log in once, enrol TOTP, and store the backup secret safely.
5. Configure the frontend security headers above at the host.
6. Run `yarn audit` and `pip-audit`; fix high/critical findings.
7. Have the Privacy and Cookie policies reviewed by a legal professional.
