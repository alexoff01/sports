# Alex Cearnau — Sports Social Media Portfolio

Portfolio and digital business card. No shop, payments, accounts for visitors or newsletters. The only conversion is the contact form.

## Stack
- Frontend: React 19 (CRA + craco), Tailwind CSS, Framer Motion, Lenis smooth scroll, Zod + react-hook-form, self-hosted fonts (@fontsource Barlow Condensed + Plus Jakarta Sans).
- Backend: FastAPI, MongoDB (motor), bcrypt, PyJWT, pyotp, Pillow.
- Email: Emergent managed email (Resend). Storage: Emergent object storage for admin uploads.

## Structure
```
backend/
  server.py       app, security middleware, startup (indexes + seeding)
  core.py         db, env, rate limiting, hashing helpers
  auth.py         admin login + TOTP MFA + sessions
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
scripts/grade_images.py applies the shared colour grade and exports all formats
```

## Environment variables
See `backend/.env.example` and `frontend/.env.example`.

| Variable | Where | Purpose |
|---|---|---|
| MONGO_URL, DB_NAME | backend | database |
| CORS_ORIGINS | backend | allowed origins (CORS + CSRF Origin check) |
| JWT_SECRET | backend | signs session tokens; also salts IP hashes |
| ADMIN_EMAILS | backend | whitelist of admin emails |
| ADMIN_EMAIL, ADMIN_PASSWORD | backend | seeded admin (password policy enforced) |
| CONTACT_RECIPIENT | backend | where inquiries are delivered |
| EMERGENT_EMAIL_KEY, EMAIL_FROM_NAME | backend | managed email |
| EMERGENT_LLM_KEY | backend | object storage access |
| REACT_APP_BACKEND_URL | frontend | API base URL |
| REACT_APP_SITE_URL | frontend | canonical / Open Graph base |
| REACT_APP_ADMIN_PATH | frontend | hidden studio route |

## Database (MongoDB collections)
- `projects`: id, slug (unique), title, category, project_type (Concept/Personal/Real), label, summary, tags, cover_image, cover_alt, gallery, context, objective, strategy, execution, outcome, platforms, captions[{platform,text}], published, featured, order, created_at, updated_at
- `messages`: contact inquiries (TTL 12 months)
- `admins`, `sessions` (TTL), `login_attempts` (TTL), `rate_limits` (TTL), `media`

Row Level Security does not exist in MongoDB; the equivalent is enforced in the API: public routes query `published: true` only, every admin route requires a valid MFA session. Indexes are created on startup.

## Admin
1. Set `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `backend/.env` and restart the backend (the account is seeded or its password updated).
2. Open `/<REACT_APP_ADMIN_PATH>` (currently `/studio-x7k2`), sign in, scan the QR with an authenticator app and enter the code. MFA is then mandatory on every login.
3. To reset MFA (lost device): unset `totp_secret` and set `mfa_enabled: false` on the admin document.

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
