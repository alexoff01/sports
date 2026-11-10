# Alex Cearnau — Sports Social Media Portfolio

Portfolio and digital business card. No shop, payments, accounts for visitors or newsletters. The only conversion is the contact form.

## Stack
- Frontend: React 19 (CRA + craco), Tailwind CSS, Framer Motion, Lenis smooth scroll, Zod + react-hook-form, self-hosted fonts (@fontsource Barlow Condensed + Plus Jakarta Sans).
- Backend: FastAPI, MongoDB (motor), argon2-cffi (Argon2id), PyJWT, pyotp, qrcode, cryptography, Pillow.
- Email: Emergent managed email (Resend). Storage: Emergent object storage for admin uploads.

## Structure
```
backend/
  server.py       app, security middleware, startup (indexes + seeding)
  core.py         db, env, rate limiting, hashing helpers
  config.py       environment loading + production start-up checks
  auth.py         admin login + TOTP MFA + sessions + CSRF + lockout
  seed.py         idempotent seeding of the single admin
  passwords.py    Argon2id hashing + password policy
  contact.py      contact form + admin inbox
  projects.py     public/admin project API, uploads, media
  emailer.py      managed email sender with safety gate
  seed_data.py    6 concept projects (fictional clubs/brands)
frontend/src/
  config/site.js  all contact/social values (TODO_CONFIRM placeholders never render)
  lib/            api client, SEO hook, intro flag
  components/site reusable UI (CtaLink, SectionHeader, ProjectCard, FilterTabs, Reveal, CookieBanner, ...)
  components/home, project, contact
  pages/          Home, Projects, ProjectDetail, About, Contact, PrivacyPolicy, CookiePolicy, NotFound
  admin/          lazy-loaded hidden studio (login, MFA, projects CRUD, inbox)
frontend/public/images  graded AI-generated images (AVIF/WebP/JPEG, sm + lg), see docs/image-credits.md
frontend/public/brand   owner-supplied logo (original + 40/80/120 px copies)
scripts/reset_admin_password.py  server-side password / two-factor reset
scripts/grade_images.py applies the shared colour grade and exports all formats
```

## Environment variables
See `backend/.env.example` and `frontend/.env.example` (names only). Real values live only in the untracked `.env` files.

| Variable | Where | Purpose |
|---|---|---|
| MONGO_URL, DB_NAME | backend | database |
| APP_ENV | backend | `production` (strict start-up checks) or `development` (also allows http://localhost:3000) |
| PUBLIC_BASE_URL | backend | the one allowed origin for CORS and the Origin check (https, no trailing slash) |
| COOKIE_SECURE | backend | `true` in production (enables `__Host-` cookies), `false` only for local http |
| ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD | backend | the single admin, seeded once at startup and never overwritten |
| ADMIN_PATH | backend | hidden studio route |
| ADMIN_REQUIRE_TOTP | backend | mandatory two-factor (default `true`) |
| JWT_SECRET | backend | signs session tokens (min 32 random bytes); also salts IP hashes |
| TOTP_ENCRYPTION_KEY | backend | Fernet key that encrypts TOTP secrets at rest |
| CONTACT_RECIPIENT | backend | where inquiries are delivered |
| EMERGENT_EMAIL_KEY, EMAIL_FROM_NAME | backend | managed email |
| EMERGENT_LLM_KEY | backend | object storage access |
| REACT_APP_BACKEND_URL | frontend | API base URL |
| REACT_APP_SITE_URL | frontend | canonical / Open Graph base |
| REACT_APP_ADMIN_PATH_HASH | frontend | SHA-256 hex of ADMIN_PATH without slashes (the path never ships in the bundle) |
| GENERATE_SOURCEMAP | frontend | keep `false` |

## Database (MongoDB collections)
- `projects`: id, slug (unique), title, category, project_type (Concept/Personal/Real), label, summary, tags, cover_image, cover_alt, gallery, videos, context, objective, strategy, execution, outcome, platforms, captions[{platform,text}], published, featured, order, created_at, updated_at
- `messages`: contact inquiries (TTL 12 months)
- `users`: the single admin (email, password_hash, role, totp_secret_encrypted, totp_enabled, recovery_codes_hashed, failed_attempts, locked_until, created_at, updated_at)
- `admin_sessions` (TTL), `auth_lockouts` (TTL), `totp_pending` (TTL), `totp_used` (TTL), `security_events` (TTL 90 days), `rate_limits` (TTL), `media`, `upload_sessions` (TTL), `admin_prefs`

Row Level Security does not exist in MongoDB; the equivalent is enforced in the API: public routes query `published: true` only, every admin route depends on `require_admin`. Indexes are created on startup.

## Admin
1. The account is created automatically at backend startup from `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` in `backend/.env`. Changing these values later does not change an existing account.
2. Open `/<ADMIN_PATH>` (see `backend/.env`; never linked), sign in, scan the QR with an authenticator app, save the recovery codes and enter the code. Two-factor is then required on every sign-in.
3. Change the password in Studio > Settings (at least 12 characters).
4. Lost password or authenticator: on the server run `python scripts/reset_admin_password.py` (add `--reset-totp` to clear two-factor). This revokes all sessions.
5. Tests: `cd backend && python -m pytest tests -q` (uses an isolated database and a generated password).

## Development
- `sudo supervisorctl restart backend frontend`
- Re-grade images: `python scripts/grade_images.py`

## Deployment
Deploy with Emergent (frontend + backend + MongoDB). Before launch follow the checklist in `SECURITY.md`.

## TODO_CONFIRM
- Social profile URLs (LinkedIn, Instagram, TikTok, X) in `frontend/src/config/site.js`
- Approved quote for the About page (`SITE.quote`)
- Legal details in the Privacy/Cookie policies (postal address, processors, transfers, retention for hiring processes, hosting cookies)
- Production domain in `sitemap.xml`, `robots.txt` and env files
- Final images (a real portrait of Alex for About)

## Domains: primary + staging
- **Primary (canonical, indexed):** `PUBLIC_BASE_URL` / `REACT_APP_SITE_URL` (https://alexcearnau.com).
- **Staging (never indexed):** the Emergent preview address, listed in `STAGING_HOSTS` / `REACT_APP_STAGING_HOSTS`. It shows a small "Staging preview" label, serves `robots.txt` with `Disallow: /`, `noindex` meta and `X-Robots-Tag: noindex, nofollow`.
- `ALLOWED_ORIGINS` (backend) and `REACT_APP_ALLOWED_ORIGINS` (frontend) hold the exact https origins. CORS, the Origin check and CSRF compare against that list only. The frontend calls the API on its own origin, so each address has its own host-only `__Host-` cookies and admin sessions are additionally bound to the host they were created on: a session on one address is never valid on the other.
- Admin link: `<address><ADMIN_PATH>` on both addresses (value in `backend/.env`). Security never relies on the path: Argon2id, mandatory TOTP, lockout, rate limits, CSRF, Origin checks and server-side authorization protect it. Every unknown path, the admin path and retired paths return the same 404 response; repeated 404s per IP are rate-limited.

### How pages are served
- **Staging (dev server):** `frontend/src/setupProxy.js` adds per-route `<head>`, JSON-LD, the real HTTP status (404 for unknown paths and drafts), host-aware `robots.txt`/`sitemap.xml`, www→apex 301 and staging `X-Robots-Tag`.
- **Production (static build on the platform CDN):** `yarn build` runs `scripts/prerender.js`, which writes one HTML file per public route and published project (title, description, canonical, Open Graph, JSON-LD, h1 and intro already in the source) plus `robots.txt` and `sitemap.xml` for the primary domain. **Redeploy after publishing a new project** so it is prerendered and listed in the static sitemap. The always-current sitemap is also at `/api/seo/sitemap.xml`. A static host cannot return real 404 status codes or custom headers for HTML pages; unknown routes fall back to the SPA (client-side `noindex`).

### Manual steps (you)
1. **Hosting panel (Emergent → Deployments → Manage → Domain):** add `alexcearnau.com` and `www.alexcearnau.com`, enable the **www → root redirect (301)**. SSL is provisioned automatically once DNS is correct.
2. **Registrar DNS:** create the records the hosting panel shows for the apex (A/ALIAS/CNAME-flattening as instructed) and for `www` (CNAME). Remove old conflicting A/AAAA records. Wait for propagation and the certificate.
3. **Environment for production:** `PUBLIC_BASE_URL=https://alexcearnau.com`, `ALLOWED_ORIGINS=https://alexcearnau.com,<staging origin>`, `STAGING_HOSTS=<staging host>`, `APP_ENV=production`, `COOKIE_SECURE=true`; frontend `REACT_APP_SITE_URL`, `REACT_APP_ALLOWED_ORIGINS`, `REACT_APP_STAGING_HOSTS`, optional `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION`. Note: the platform may rewrite `REACT_APP_BACKEND_URL`/`CORS_ORIGINS` when a domain is verified; the app uses `ALLOWED_ORIGINS`.
4. **Headers the platform cannot set from the app for static HTML** (ask Emergent support or set at the CDN if possible): `Strict-Transport-Security: max-age=31536000` (no includeSubDomains/preload yet), CSP (see `SECURITY.md`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Robots-Tag: noindex` on staging hosts, Brotli/gzip and long caching for `/static/*` (already provided by the CDN). **Disable Cloudflare Web Analytics / "browser insights" for the domain** (it injects `static.cloudflareinsights.com` without consent).
5. Follow `docs/SEO-CHECKLIST.md` after launch and `docs/GDPR.md` for privacy operations.

## Legal texts
The Privacy Policy, Cookie Policy and `docs/GDPR.md` are templates prepared in good faith. They must be reviewed by a legal professional before launch; this project does not claim certified legal compliance. Replace every `TODO_CONFIRM`.
