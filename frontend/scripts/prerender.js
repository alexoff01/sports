/* Production build step (runs after `craco build`): writes a prerendered HTML file per public route with
 * the correct <head>, JSON-LD and crawlable h1/intro, plus robots.txt and sitemap.xml for the primary domain.
 * Data comes from the backend (/api/seo/*). If the backend cannot be reached the build still succeeds and the
 * plain SPA shell is used. */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { inject } = require("../seo/inject");

const BUILD = path.resolve(process.env.BUILD_PATH || path.join(__dirname, "..", "build"));
const BACKEND = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
const HOST = (process.env.REACT_APP_SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const STATIC_ROUTES = ["/", "/projects", "/about", "/contact", "/privacy-policy", "/cookie-policy"];

const get = async (url, kind = "json") => {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${r.status} for ${url}`);
  return kind === "json" ? r.json() : r.text();
};

const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

(async () => {
  const template = fs.readFileSync(path.join(BUILD, "index.html"), "utf8");
  const q = `host=${encodeURIComponent(HOST)}`;
  let routes = STATIC_ROUTES;
  try {
    routes = await get(`${BACKEND}/api/seo/routes`);
  } catch (err) {
    console.warn(`prerender: backend unreachable (${err.message}); prerendering static routes only`);
  }
  let done = 0;
  for (const route of routes) {
    try {
      const meta = await get(`${BACKEND}/api/seo/page?path=${encodeURIComponent(route)}&${q}`);
      if (meta.status !== 200) continue;
      const html = inject(template, meta);
      if (route === "/") {
        write(path.join(BUILD, "index.html"), html);
      } else {
        write(path.join(BUILD, route, "index.html"), html);
        write(path.join(BUILD, `${route}.html`), html);
      }
      done += 1;
    } catch (err) {
      console.warn(`prerender: skipped ${route} (${err.message})`);
    }
  }
  try {
    write(path.join(BUILD, "robots.txt"), await get(`${BACKEND}/api/seo/robots.txt?${q}`, "text"));
    write(path.join(BUILD, "sitemap.xml"), await get(`${BACKEND}/api/seo/sitemap.xml`, "text"));
  } catch (err) {
    console.warn(`prerender: kept static robots.txt/sitemap.xml (${err.message})`);
  }
  console.log(`prerender: ${done}/${routes.length} routes written for ${HOST}`);
})().catch((err) => {
  console.warn(`prerender: skipped (${err.message})`);
});
