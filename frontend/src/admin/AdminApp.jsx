import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import { AdminLogin } from "@/admin/AdminLogin";
import { AdminDashboard } from "@/admin/AdminDashboard";
import { useIdleSession } from "@/admin/useIdleSession";

export default function AdminApp() {
  const [state, setState] = useState({ checking: true, email: null });

  useEffect(() => {
    document.title = "Studio";
    let robots = document.head.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex, nofollow, noarchive");
    api
      .get("/admin/auth/me")
      .then((r) => setState({ checking: false, email: r.data?.email ?? null }))
      .catch(() => setState({ checking: false, email: null }));
    return undefined;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/admin/auth/logout");
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
        <AdminLogin onSuccess={(email) => setState({ checking: false, email })} />
      )}
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
