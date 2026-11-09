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
2. Open `/<ADMIN_PATH>` (see `backend/.env`; it is never linked), sign in, scan the QR with an authenticator app, save the recovery codes and enter the code. Two-factor is then required on every sign-in.
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
