import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import { AdminAuthFlow } from "@/admin/AdminAuthFlow";
import { AdminDashboard } from "@/admin/AdminDashboard";
import { IdleWarning } from "@/admin/IdleWarning";
import { useIdleSession } from "@/admin/useIdleSession";

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

// Hidden studio. Authorization is enforced by the API on every request; this UI only reflects it.
export default function AdminApp() {
  const [state, setState] = useState({ checking: true, authed: false, notice: "" });
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const basePath = useMemo(() => `/${pathname.split("/")[1] ?? ""}`, []); // studio root, fixed at mount

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
      .then((r) => setState({ checking: false, authed: Boolean(r.data?.authenticated), notice: "" }))
      .catch(() => setState({ checking: false, authed: false, notice: "" }));
    return () => api.interceptors.request.eject(id);
  }, []);

  // Unauthenticated access to any studio screen lands on the sign-in form at the studio root.
  useEffect(() => {
    if (!state.checking && !state.authed && pathname !== basePath) navigate(basePath, { replace: true });
  }, [state.checking, state.authed, pathname, basePath, navigate]);

  const onAuthed = useCallback(() => {
    setState({ checking: false, authed: true, notice: "" });
    navigate(basePath, { replace: true });
  }, [navigate, basePath]);

  const endSession = useCallback(async (notice = "") => {
    try {
      await api.post("/admin-auth/logout");
    } catch {
      /* session already gone */
    } finally {
      setState({ checking: false, authed: false, notice });
    }
  }, []);

  const logout = useCallback(() => endSession("You have been signed out."), [endSession]);
  const expire = useCallback(() => endSession("You were signed out after 30 minutes of inactivity."), [endSession]);
  const idle = useIdleSession(state.authed, expire);

  return (
    <div className="min-h-screen bg-ink-950 font-body text-paper" data-testid="admin-root">
      {state.checking ? (
        <div className="grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-volt" aria-label="Loading" /></div>
      ) : state.authed ? (
        <AdminDashboard onLogout={logout} />
      ) : (
        <AdminAuthFlow onAuthed={onAuthed} notice={state.notice} />
      )}
      {state.authed && <IdleWarning secondsLeft={idle.secondsLeft} onStay={idle.stay} onLogout={logout} />}
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
