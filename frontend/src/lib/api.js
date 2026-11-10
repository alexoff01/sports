import axios from "axios";

// The API is served under /api on every allowed address (primary domain and staging preview).
// When the page runs on one of those addresses we call the API on the same origin, so host-only
// cookies, CORS and the Origin check always match. Otherwise fall back to REACT_APP_BACKEND_URL.
const ALLOWED = (process.env.REACT_APP_ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
const here = typeof window !== "undefined" ? window.location.origin : "";
const BASE = ALLOWED.includes(here) ? here : process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL: BASE ? `${BASE}/api` : undefined,
  withCredentials: true,
  timeout: 30000,
});

export const hasBackend = Boolean(BASE);

export const mediaUrl = (src) => (src?.startsWith("/api/") ? `${BASE ?? ""}${src}` : src);

export const errorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${d?.field ? `${d.field}: ` : ""}${d?.msg ?? ""}`).join(" ");
  return fallback;
};
