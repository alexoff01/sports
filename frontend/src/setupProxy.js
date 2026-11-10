/* Staging preview only: the CRA dev server runs this; production is a static build (see scripts/prerender.js).
 * - www.<primary> -> 301 to the primary domain
 * - host-aware robots.txt and sitemap.xml (from the backend; the host is checked against the allowlist there)
 * - X-Robots-Tag: noindex on every non-primary host
 * - real HTTP status per route (404 for unknown paths, drafts, the admin path and retired paths alike)
 * - per-route <head> + crawlable fallback injected into the HTML
 * - rate limit on repeated 404s per IP */
const { inject } = require("../seo/inject");

const BACKEND = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
const PRIMARY = (process.env.REACT_APP_SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
const SELF = `http://127.0.0.1:${process.env.PORT}`;
const SKIP = /^\/(api\/|static\/|sockjs-node|ws(\/|$)|__)/;
const NOT_FOUND_LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map();
const cache = new Map();

const cached = async (key, ttl, load) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
};

const clientIp = (req) => String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();

const tooMany404 = (ip) => {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length >= NOT_FOUND_LIMIT;
};

module.exports = (app) => {
  app.use(async (req, res, next) => {
    const path = req.path || "/";
    if (SKIP.test(path)) return next();
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase().split(":")[0];
    if (PRIMARY && host === `www.${PRIMARY}`) {
      return res.redirect(301, `https://${PRIMARY}${req.originalUrl === "/" ? "/" : req.originalUrl}`);
    }
    if (host !== PRIMARY) res.setHeader("X-Robots-Tag", "noindex, nofollow");
    else res.setHeader("Strict-Transport-Security", "max-age=31536000");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    try {
      if (path === "/robots.txt" || path === "/sitemap.xml") {
        const r = await fetch(`${BACKEND}/api/seo${path}?host=${encodeURIComponent(host)}`);
        res.status(r.status).type(path.endsWith(".xml") ? "application/xml" : "text/plain");
        return res.send(await r.text());
      }
      if (/\.[a-z0-9]+$/i.test(path)) return next();
      const ip = clientIp(req);
      if (tooMany404(ip)) return res.status(429).set("Retry-After", "600").type("text/plain").send("Too many requests.");
      const method = req.method === "HEAD" ? "GET" : req.method;
      const meta = method !== "GET"
        ? await cached(`404|${host}`, 30000, async () => (await fetch(`${BACKEND}/api/seo/page?path=/__none__&host=${encodeURIComponent(host)}`)).json())
        : await cached(`${path}|${host}`, 30000, async () => (await fetch(`${BACKEND}/api/seo/page?path=${encodeURIComponent(path)}&host=${encodeURIComponent(host)}`)).json());
      if (meta.status === 301 && meta.redirect) return res.redirect(301, meta.redirect);
      const template = await cached("template", 3000, async () => (await fetch(`${SELF}/index.html`)).text());
      if (meta.status === 404) {
        hits.get(ip).push(Date.now());
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      }
      res.status(meta.status === 404 ? 404 : 200).set("Cache-Control", "no-cache").type("html");
      return res.send(inject(template, meta));
    } catch (err) {
      return next();
    }
  });
};
