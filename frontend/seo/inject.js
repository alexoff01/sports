/* Shared by src/setupProxy.js (staging dev server) and scripts/prerender.js (production build).
 * Puts the per-route <head> (title, description, canonical, robots, Open Graph, Twitter, JSON-LD) and a
 * crawlable fallback (the page's real h1, intro and links) into the SPA shell. React replaces the
 * fallback inside #root when it starts, so visitors and crawlers see the same content. */
const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STRIP = [
  /<title>[\s\S]*?<\/title>/gi,
  /<meta\s+name="(description|robots|twitter:[^"]+|google-site-verification|msvalidate\.01)"[^>]*>/gi,
  /<meta\s+property="og:[^"]+"[^>]*>/gi,
  /<link\s+rel="canonical"[^>]*>/gi,
  /<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,
];

const inject = (template, meta, env = process.env) => {
  let html = template;
  STRIP.forEach((re) => {
    html = html.replace(re, "");
  });
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="robots" content="${esc(meta.robots)}" />`,
    meta.canonical && `<link rel="canonical" href="${esc(meta.canonical)}" />`,
    `<meta property="og:type" content="${esc(meta.og.type)}" />`,
    `<meta property="og:site_name" content="${esc(meta.og.site_name)}" />`,
    `<meta property="og:locale" content="${esc(meta.og.locale)}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    meta.og.url && `<meta property="og:url" content="${esc(meta.og.url)}" />`,
    `<meta property="og:image" content="${esc(meta.og.image)}" />`,
    `<meta property="og:image:alt" content="${esc(meta.og.image_alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${esc(meta.og.image)}" />`,
    !meta.staging && env.GOOGLE_SITE_VERIFICATION && `<meta name="google-site-verification" content="${esc(env.GOOGLE_SITE_VERIFICATION)}" />`,
    !meta.staging && env.BING_SITE_VERIFICATION && `<meta name="msvalidate.01" content="${esc(env.BING_SITE_VERIFICATION)}" />`,
    meta.jsonld &&
      `<script type="application/ld+json" id="seo-jsonld">${JSON.stringify(meta.jsonld).replace(/</g, "\\u003c")}</script>`,
  ].filter(Boolean);
  html = html.replace("</head>", `${tags.join("\n")}\n</head>`);
  const links = (meta.links ?? []).map((l) => `<li><a href="${esc(l.href)}">${esc(l.text)}</a></li>`).join("");
  const fallback =
    `<main class="container-x pt-40 pb-section"><h1 class="t-h1">${esc(meta.h1)}</h1>` +
    (meta.intro ? `<p class="lead mt-6 max-w-2xl">${esc(meta.intro)}</p>` : "") +
    (links ? `<nav aria-label="Page links"><ul class="mt-8 space-y-2">${links}</ul></nav>` : "") +
    "</main>";
  return html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${fallback}</div>`);
};

module.exports = { inject, esc };
