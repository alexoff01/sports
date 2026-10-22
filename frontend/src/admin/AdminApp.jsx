import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import { AdminAuthFlow } from "@/admin/AdminAuthFlow";
import { AdminDashboard } from "@/admin/AdminDashboard";
import { useIdleSession } from "@/admin/useIdleSession";

const ADMIN_EMAIL_LABEL = "Signed in";

const setMeta = (name, content) => {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const readCsrf = () => document.cookie.match(/(?:^|; )(?:__Host-)?admin_csrf=([^;]+)/)?.[1];

export default function AdminApp() {
  const [state, setState] = useState({ checking: true, email: null });
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const verifyMode = pathname.replace(/\/$/, "").endsWith("/verify");

  useEffect(() => {
    document.title = "Studio";
    setMeta("robots", "noindex, nofollow, noarchive");
    setMeta("referrer", "no-referrer");
    const id = api.interceptors.request.use((cfg) => {
      const token = readCsrf();
      if (token && cfg.method && cfg.method.toLowerCase() !== "get") cfg.headers["X-CSRF-Token"] = decodeURIComponent(token);
      return cfg;
    });
    api
      .get("/admin-auth/session")
      .then((r) => setState({ checking: false, email: r.data?.authenticated ? ADMIN_EMAIL_LABEL : null }))
      .catch(() => setState({ checking: false, email: null }));
    return () => api.interceptors.request.eject(id);
  }, []);

  const onAuthed = useCallback(() => {
    setState({ checking: false, email: ADMIN_EMAIL_LABEL });
    navigate(`/${process.env.REACT_APP_ADMIN_PATH}`, { replace: true });
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await api.post("/admin-auth/logout");
    } catch {
      /* session already gone */
    } finally {
      setState({ checking: false, email: null });
    }
  }, []);

  useIdleSession(Boolean(state.email), logout);

  return (
    <div className="min-h-screen bg-ink-950 font-body text-paper" data-testid="admin-root">
      {state.checking ? (
        <div className="grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-volt" aria-label="Loading" /></div>
      ) : state.email ? (
        <AdminDashboard email={state.email} onLogout={logout} />
      ) : (
        <AdminAuthFlow verifyMode={verifyMode} onAuthed={onAuthed} />
      )}
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
