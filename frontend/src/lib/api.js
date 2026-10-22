import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;

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
