import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, LogOut, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { Logo } from "@/components/site/Logo";
import { ProjectList } from "@/admin/ProjectList";
import { ProjectEditor } from "@/admin/ProjectEditor";
import { MessagesPanel } from "@/admin/MessagesPanel";
import { MediaPanel } from "@/admin/MediaPanel";
import { SettingsPanel } from "@/admin/SettingsPanel";

const TAB = "min-h-[44px] shrink-0 border-b-2 px-3 font-display text-sm font-bold uppercase tracking-[0.14em] transition-colors sm:px-4 sm:text-base";
const TABS = [["projects", "Projects"], ["inbox", "Messages"], ["media", "Media"], ["settings", "Settings"]];

export const AdminDashboard = ({ onLogout }) => {
  const [view, setView] = useState({ tab: "projects", editing: null });
  const [projects, setProjects] = useState([]);
  const [account, setAccount] = useState(null);
  const [bannerOpen, setBannerOpen] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/projects");
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.response?.status !== 401) toast.error(errorMessage(err, "Could not load projects."));
    }
  }, []);

  const loadAccount = useCallback(async () => {
    try {
      setAccount((await api.get("/admin-auth/settings")).data);
    } catch {
      /* handled by the session guard */
    }
  }, []);

  useEffect(() => {
    load();
    loadAccount();
  }, [load, loadAccount]);

  const closeEditor = (changed) => {
    setView({ tab: "projects", editing: null });
    if (changed) load();
  };

  return (
    <div data-testid="admin-dashboard">
      <header className="sticky top-0 z-40 border-b border-line bg-ink-950/90 backdrop-blur-xl">
        <div className="container-x flex min-h-[64px] flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
          <Logo height="h-9" testId="admin-dashboard-logo-link" />
          <button type="button" onClick={onLogout} className="inline-flex min-h-[44px] items-center gap-2 border border-line px-4 text-sm font-semibold hover:border-volt md:order-last" data-testid="admin-logout-btn"><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</button>
          <nav className="-mx-1 flex w-full overflow-x-auto md:mx-0 md:w-auto" aria-label="Studio sections">
            {TABS.map(([t, label]) => (
              <button key={t} type="button" aria-current={view.tab === t ? "page" : undefined} onClick={() => setView({ tab: t, editing: null })} className={`${TAB} ${view.tab === t ? "border-volt text-white" : "border-transparent text-slate-400 hover:text-white"}`} data-testid={`admin-tab-${t}`}>{label}</button>
            ))}
          </nav>
        </div>
      </header>
      {account?.weak_initial_password && bannerOpen && (
        <div className="border-b border-amber-400/40 bg-amber-400/10" role="status" data-testid="admin-weak-password-banner">
          <div className="container-x flex items-start gap-3 py-3 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
            <p className="flex-1">You are still using the initial password. We recommend choosing a longer one (at least 12 characters).{" "}
              <button type="button" onClick={() => setView({ tab: "settings", editing: null })} className="font-semibold underline underline-offset-4" data-testid="admin-weak-password-change">Change password</button>
            </p>
            <button type="button" aria-label="Dismiss" onClick={() => setBannerOpen(false)} className="grid h-8 w-8 place-items-center" data-testid="admin-weak-password-dismiss"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      <main className="container-x py-8 sm:py-10">
        {view.tab === "inbox" && <MessagesPanel />}
        {view.tab === "media" && <MediaPanel />}
        {view.tab === "settings" && <SettingsPanel account={account} reload={loadAccount} onLogout={onLogout} />}
        {view.tab === "projects" && !view.editing && (
          <ProjectList projects={projects} setProjects={setProjects} reload={load} onEdit={(p) => setView({ tab: "projects", editing: p ?? "new" })} />
        )}
        {view.tab === "projects" && view.editing && <ProjectEditor project={view.editing === "new" ? null : view.editing} onClose={closeEditor} />}
      </main>
    </div>
  );
};
