# PRD — Alex Cearnau Sports Social Media Portfolio

## Original problem statement
Build a complete, production-ready portfolio / business-card website for Alex Cearnau, an aspiring sports social media and digital marketing professional (original brand name later removed at the owner's request). Positioning: "Sports Lover. Digital Creator." Portfolio and digital business card ONLY (no shop, cart, pricing, payments, visitor accounts, newsletters, comments). Single conversion: collaboration/job inquiry via Contact. Pages: Home · Projects (+ /projects/[slug] case studies: Context → Objective → Strategy → Creative Execution → Intended Outcome) · About Me · Contact, plus Privacy Policy and Cookie Policy. Never invent clients, results, stats. Qualification: "Social Media in Sports, FC Barcelona Innovation Hub, 2025" + non-affiliation note. Confirmed email alexmcearnau@gmail.com (obfuscated). Socials TODO_CONFIRM, not rendered. Premium cinematic black/navy + electric blue design, purposeful motion, reduced-motion support. GDPR cookie banner with equal Accept/Reject/Customize. Hidden admin with mandatory TOTP MFA, server-side authz, secure uploads. Strong security headers, rate limiting, honeypot, SEO, accessibility. (Full brief in the first conversation message.)

## User choices
- Keep React + FastAPI + MongoDB stack (instead of Next.js + Supabase)
- Contact: Emergent-managed email to alexmcearnau@gmail.com + protected admin inbox
- Admin: email + password with mandatory TOTP
- Quote: neutral placeholder marked TODO_CONFIRM
- Imagery: royalty-free stock, consistently graded

## Architecture
- Backend: server.py, core.py, auth.py, contact.py, projects.py, emailer.py, seed_data.py
- Frontend: config/site.js, lib/, components/site|home|project|contact, pages/, admin/ (lazy chunk at the hidden ADMIN_PATH)
- Docs: README.md, SECURITY.md, .env.example files

## Implemented (2026-10-22)
- 4 public pages + project detail + legal pages + custom 404 + error boundary
- 6 seeded concept projects (fictional clubs/brands), DB-driven, filter tabs with layout animation
- Intro loader (first visit/session, skippable), masked headline reveals, hero Ken Burns + scroll parallax + 3D tilt phone mockup, marquee, Lenis smooth scroll, page curtain transition
- Cookie consent (localStorage, version + 6-month expiry, settings dialog, footer link)
- Contact form: zod + server validation, honeypot, rate limit, Origin check, email delivery + stored inbox
- Admin: login + TOTP enrol/verify, sessions, lockout, idle logout, project CRUD/reorder/publish, uploads with magic-byte check + EXIF strip, inbox
- SEO: meta per page, canonical, OG/Twitter, JSON-LD Person/WebSite, sitemap.xml, robots.txt, favicon set

## Implemented (2026-10-22, change request 2)
- Removed all previous brand references site-wide (code, meta, JSON-LD, email from-name, TOTP issuer, storage path, docs)
- Owner logo (public/brand/logo.png, unchanged) in header, footer, intro, admin login/dashboard; logo-only (no name text); every instance is a router Link to Home (smooth scroll to top on Home, closes mobile menu)
- Favicons/app icons (16/32/180/192/512 + ico) and OG image generated from the logo
- 16 AI-generated, uniformly graded images (AVIF/WebP/JPEG, sm/lg, width/height, picture element); old stock images removed; seed data + DB paths updated; docs/image-credits.md

## Implemented (2026-10-22, change request 3)
- Global fixed SiteBackground (home hero image, route-based overlay), FloodlightIntro (beams + logo sweep), MatchClockProgress, SpotlightCursor, BallTrajectory, TacticsBoard, PitchDivider, GoalNet, DriftMotif/LightBeam/GlowHalo, CoverPlaceholder, football line-art motif set, diagonal page wipe, card sweep + tilt, quote word reveal, themed 404
- Tailwind ink/volt colours switched to rgb channels so opacity modifiers work

## Implemented (2026-11-09, change request 4: pre-created admin account)
- Magic-link login removed. Single admin seeded from env (Argon2id), email + password login, mandatory TOTP (setup with QR, manual key, 8 recovery codes; verify with replay protection), revocable sessions (12 h / 30 min idle, rotation), lockout per account + IP, CSRF double-submit bound to session, rate limits, audit events (hashed IP, TTL 90 d), production start-up guard
- Settings: change password (>=12, not email, revokes other sessions), TOTP status, recovery codes left; one-time weak-password banner; idle warning dialog
- Projects: publish endpoint, videos field, drag-and-drop reorder; Media library; chunked mp4/webm uploads; images re-encoded to WebP + AVIF
- Studio route recognised by SHA-256 digest only; no admin code/path in public bundle; source maps off
- scripts/reset_admin_password.py (+ --reset-totp); backend/tests/test_admin_auth.py (30 tests)

## Implemented (2026-11-10, change request 5: domains, short admin path, SEO, GDPR)
- Login bug fixed (origin allowlist out of date after preview host change); specific login error messages
- ALLOWED_ORIGINS (primary + staging), host-bound sessions, staging noindex/robots/label, HSTS on primary only, /api X-Robots-Tag
- Short ADMIN_PATH with forbidden-name check; identical 404 for unknown/admin/retired paths; 404 rate limits (API + staging HTML)
- /api/seo/page|routes|robots.txt|sitemap.xml; staging dev-server middleware (setupProxy.js); production prerender (scripts/prerender.js)
- JSON-LD: WebSite, Person (Oradea/Bihor/RO, credential), ProfilePage, CollectionPage+ItemList, ContactPage, CreativeWork+BreadcrumbList
- Breadcrumbs + related projects; GDPR: consent record, export/erase per sender, policies v2.0/1.1, retention env, security.txt, docs/GDPR.md, docs/SEO-CHECKLIST.md

## Backlog
- P0: Fill TODO_CONFIRM items (socials, quote, legal details, production domain, portrait)
- P1: Frontend CSP/HSTS headers at hosting layer; dependency audit; Lighthouse pass

## Next tasks
- Collect confirmed social URLs and approved quote from Alex
- Production deploy and domain update in sitemap/robots/env
