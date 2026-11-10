import { useEffect } from "react";
import { SITE } from "@/config/site";
import { api } from "@/lib/api";

const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const PRIMARY_HOST = (SITE.url ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

// Only the primary domain may be indexed; staging and any other address are always noindex.
export const isPrimaryHost = () => typeof window !== "undefined" && window.location.hostname.toLowerCase() === PRIMARY_HOST;

export const useSeo = ({ title, description, path = "/", noindex = false, image }) => {
  useEffect(() => {
    const full = `${title} | Alex Cearnau`;
    const base = SITE.url ?? window.location.origin;
    const url = `${base}${path}`;
    const img = image ? (image.startsWith("http") ? image : `${base}${image}`) : `${base}/og-image.jpg`;
    document.title = full;
    setMeta("name", "description", description);
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
    setMeta("name", "twitter:title", full);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", img);
    setMeta("name", "robots", noindex || !isPrimaryHost() ? "noindex, nofollow" : "index, follow");
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);
  }, [title, description, path, noindex, image]);

  // Keep the structured data in step with client-side navigation (same source as the prerendered HTML).
  useEffect(() => {
    let live = true;
    api
      .get("/seo/page", { params: { path } })
      .then(({ data }) => {
        if (!live) return;
        document.head.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());
        if (!data?.jsonld) return;
        const el = document.createElement("script");
        el.type = "application/ld+json";
        el.id = "seo-jsonld";
        el.textContent = JSON.stringify(data.jsonld);
        document.head.appendChild(el);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [path]);
};
