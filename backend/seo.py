"""SEO for a React SPA: per-route metadata, JSON-LD, host-aware robots.txt and a dynamic sitemap.

The staging dev-server middleware (frontend/src/setupProxy.js) and the production prerender step
(frontend/scripts/prerender.js) both read /api/seo/page, so every route gets the same title, description,
canonical, Open Graph tags, JSON-LD, robots directive and HTTP status from one place.
Page titles and descriptions below are copied verbatim from the React pages (keep them in sync).
"""
import re
from xml.sax.saxutils import escape

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse, Response

from config import PRIMARY_HOST, PUBLIC_BASE_URL
from core import db

router = APIRouter(prefix="/api/seo")

BRAND = "Alex Cearnau"
LEGAL_UPDATED = "2026-11-10"
DEFAULT_IMAGE = "/og-image.jpg"
# Only confirmed profile URLs belong here (mirrors confirmed entries of frontend/src/config/site.js).
SAME_AS: list[str] = []

PAGES = {
    "/": {"title": "Sports Social Media & Content Creator", "type": "home", "h1": "Sports stories. Real impact.",
          "description": "Alex Cearnau: sports social media, football content creation and sports storytelling concepts. Open to junior roles, internships and collaborations.",
          "intro": "Sports social media, content creation, strategy and storytelling. I turn matchdays, players and supporters into content people want to follow."},
    "/projects": {"title": "Projects", "type": "collection", "h1": "Selected projects. Turning sport into stories.",
                  "description": "Selected sports social media projects by Alex Cearnau: matchday coverage, player storytelling, vertical video and fan engagement concepts.",
                  "intro": "Concept campaigns and personal projects for football clubs, players and supporters. Each one is labelled clearly and shows the thinking: context, objective, strategy, execution and the outcome it aims for."},
    "/about": {"title": "About Me", "type": "profile", "h1": "Sports lover. Digital creator.",
               "description": "About Alex Cearnau: sports lover and digital creator from Oradea, Romania. Social Media in Sports, FC Barcelona Innovation Hub, 2025.",
               "intro": "I'm Alex Cearnau, a football fan from Oradea, Romania, building a career in sports social media and digital content."},
    "/contact": {"title": "Contact", "type": "contact", "h1": "Let's create something that moves people.",
                 "description": "Get in touch with Alex Cearnau about sports social media roles, internships, collaborations and sports content projects.",
                 "intro": "Open to job opportunities, internships, collaborations and sports content projects. Tell me a little about what you have in mind and I'll get back to you."},
    "/privacy-policy": {"title": "Privacy Policy", "type": "legal", "h1": "Privacy Policy",
                        "description": "How Alex Cearnau's portfolio website handles personal data under the GDPR.", "intro": ""},
    "/cookie-policy": {"title": "Cookie Policy", "type": "legal", "h1": "Cookie Policy",
                       "description": "Which cookies and similar technologies Alex Cearnau's portfolio uses and how to manage consent.", "intro": ""},
}
NOT_FOUND = {"title": "Page not found", "h1": "Offside.", "description": "The page you are looking for does not exist.", "intro": ""}
TYPE_LABEL = {"Concept": "Concept campaign", "Personal": "Personal project", "Real": "Client project"}
SLUG_RE = re.compile(r"^/projects/([a-z0-9]+(?:-[a-z0-9]+)*)$")


def _abs(path: str) -> str:
    return path if path.startswith("https://") else f"{PUBLIC_BASE_URL}{path}"


def _normalize(path: str) -> str:
    path = "/" + (path or "/").split("?", 1)[0].split("#", 1)[0].strip("/")
    return path if path == "/" else path.rstrip("/")


def classify_host(host: str | None) -> str:
    """'primary', 'www' (must 301 to primary) or 'staging' (everything else: never indexed)."""
    h = (host or "").strip().lower().split(":", 1)[0]
    if h and h == PRIMARY_HOST:
        return "primary"
    if h and h == f"www.{PRIMARY_HOST}":
        return "www"
    return "staging"


def person() -> dict:
    data = {
        "@type": "Person", "@id": _abs("/#person"), "name": BRAND, "jobTitle": "Sports Social Media & Content Creator",
        "url": _abs("/"), "image": _abs("/icon-512.png"),
        "address": {"@type": "PostalAddress", "addressLocality": "Oradea", "addressRegion": "Bihor", "addressCountry": "RO"},
        "knowsAbout": ["Sports social media", "Football content creation", "Social media strategy", "Sports digital marketing", "Content creation"],
        "hasCredential": {
            "@type": "EducationalOccupationalCredential", "name": "Social Media in Sports", "credentialCategory": "Course certificate",
            "dateCreated": "2025", "recognizedBy": {"@type": "Organization", "name": "FC Barcelona Innovation Hub"},
        },
    }
    if SAME_AS:
        data["sameAs"] = SAME_AS
    return data


def website() -> dict:
    return {"@type": "WebSite", "@id": _abs("/#website"), "name": BRAND, "url": _abs("/"), "inLanguage": "en",
            "publisher": {"@id": _abs("/#person")}}


async def published_projects() -> list[dict]:
    fields = {"_id": 0, "slug": 1, "title": 1, "summary": 1, "cover_image": 1, "cover_alt": 1, "tags": 1,
              "project_type": 1, "category": 1, "created_at": 1, "updated_at": 1}
    return await db.projects.find({"published": True}, fields).sort("order", 1).to_list(500)


def _date(value) -> str | None:
    return value.date().isoformat() if hasattr(value, "date") else None


def _project_ld(p: dict, url: str) -> list[dict]:
    work = {
        "@type": "CreativeWork", "@id": f"{url}#work", "name": p["title"], "url": url,
        "description": f"{TYPE_LABEL.get(p.get('project_type'), 'Project')}: {p.get('summary', '')}",
        "image": _abs(p["cover_image"]), "author": {"@id": _abs("/#person")}, "genre": p.get("category"),
        "keywords": ", ".join(p.get("tags") or []), "inLanguage": "en",
    }
    if _date(p.get("created_at")):
        work["datePublished"] = _date(p["created_at"])
    if _date(p.get("updated_at")):
        work["dateModified"] = _date(p["updated_at"])
    crumbs = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": _abs("/")},
        {"@type": "ListItem", "position": 2, "name": "Projects", "item": _abs("/projects")},
        {"@type": "ListItem", "position": 3, "name": p["title"], "item": url},
    ]}
    return [work, crumbs]


async def page_meta(path: str, host: str | None) -> dict:
    kind = classify_host(host)
    path = _normalize(path)
    if kind == "www":
        return {"status": 301, "redirect": _abs(path if path != "/" else "/")}
    indexable_host = kind == "primary"
    meta = PAGES.get(path)
    graph: list[dict] = [website(), person()]
    image, image_alt, links = DEFAULT_IMAGE, f"{BRAND}, sports social media portfolio", []
    status = 200
    if meta:
        url = _abs(path if path != "/" else "/")
        page_type = {"home": "WebPage", "collection": "CollectionPage", "profile": "ProfilePage",
                     "contact": "ContactPage", "legal": "WebPage"}[meta["type"]]
        page = {"@type": page_type, "@id": f"{url}#webpage", "url": url, "name": f"{meta['title']} | {BRAND}",
                "description": meta["description"], "isPartOf": {"@id": _abs("/#website")}, "inLanguage": "en"}
        if meta["type"] in ("home", "profile"):
            page["mainEntity" if meta["type"] == "profile" else "about"] = {"@id": _abs("/#person")}
        if meta["type"] == "collection":
            items = await published_projects()
            page["mainEntity"] = {"@type": "ItemList", "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "url": _abs(f"/projects/{p['slug']}"), "name": p["title"]}
                for i, p in enumerate(items)]}
            links = [{"href": f"/projects/{p['slug']}", "text": p["title"]} for p in items]
        graph.append(page)
        title, description, h1, intro = f"{meta['title']} | {BRAND}", meta["description"], meta["h1"], meta["intro"]
        robots = "index, follow" if indexable_host else "noindex, nofollow"
    else:
        match = SLUG_RE.match(path)
        project = await db.projects.find_one({"slug": match.group(1), "published": True}, {"_id": 0}) if match else None
        if project:
            url = _abs(path)
            graph += _project_ld(project, url)
            title, description = f"{project['title']} | {BRAND}", project["summary"]
            h1, intro, image, image_alt = project["title"], project["summary"], project["cover_image"], project.get("cover_alt", project["title"])
            links = [{"href": "/projects", "text": "View all sports social media projects"},
                     {"href": "/contact", "text": "Get in touch about a collaboration"}]
            robots = "index, follow" if indexable_host else "noindex, nofollow"
        else:
            # Unknown paths, drafts, the admin path and the retired admin path all get this identical 404.
            status, url = 404, None
            title, description, h1, intro = f"{NOT_FOUND['title']} | {BRAND}", NOT_FOUND["description"], NOT_FOUND["h1"], ""
            robots, graph = "noindex, nofollow", []
    if not links and status == 200:
        links = [{"href": "/projects", "text": "View all sports social media projects"},
                 {"href": "/contact", "text": "Get in touch about a collaboration"}]
    return {
        "status": status, "title": title, "description": description, "canonical": url, "robots": robots,
        "og": {"type": "article" if SLUG_RE.match(path) and status == 200 else "website", "url": url,
               "image": _abs(image), "image_alt": image_alt, "site_name": BRAND, "locale": "en_GB"},
        "jsonld": {"@context": "https://schema.org", "@graph": graph} if graph else None,
        "h1": h1, "intro": intro, "links": links, "staging": kind != "primary",
    }


@router.get("/page")
async def seo_page(request: Request, path: str = "/", host: str | None = None):
    return await page_meta(path, host or request.headers.get("host"))


@router.get("/routes")
async def seo_routes():
    """Indexable public paths (for build-time prerendering). Never includes drafts or the admin path."""
    return [*PAGES.keys(), *(f"/projects/{p['slug']}" for p in await published_projects())]


@router.get("/robots.txt", response_class=PlainTextResponse)
async def robots(request: Request, host: str | None = None):
    if classify_host(host or request.headers.get("host")) != "primary":
        return PlainTextResponse("# Staging preview: not for indexing\nUser-agent: *\nDisallow: /\n")
    return PlainTextResponse(f"User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {_abs('/sitemap.xml')}\n")


@router.get("/sitemap.xml")
async def sitemap():
    """Always built for the primary domain, from published projects only."""
    projects = await published_projects()
    latest = max((p["updated_at"] for p in projects if p.get("updated_at")), default=None)
    rows = []
    for path, meta in PAGES.items():
        lastmod = LEGAL_UPDATED if meta["type"] == "legal" else (_date(latest) if path in ("/", "/projects") else None)
        priority = {"home": "1.0", "collection": "0.9", "legal": "0.2"}.get(meta["type"], "0.7")
        rows.append((_abs(path), lastmod, priority))
    rows += [(_abs(f"/projects/{p['slug']}"), _date(p.get("updated_at")), "0.8") for p in projects]
    body = "".join(
        f"  <url><loc>{escape(loc)}</loc>{f'<lastmod>{lm}</lastmod>' if lm else ''}<priority>{pr}</priority></url>\n"
        for loc, lm, pr in rows)
    xml = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n'
    return Response(content=xml, media_type="application/xml")
