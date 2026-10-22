import { useCallback, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { Logo } from "@/components/site/Logo";
import { ProjectList } from "@/admin/ProjectList";
import { ProjectEditor } from "@/admin/ProjectEditor";
import { MessagesPanel } from "@/admin/MessagesPanel";

const TAB = "min-h-[44px] border-b-2 px-4 font-display text-base font-bold uppercase tracking-[0.14em] transition-colors";

export const AdminDashboard = ({ email, onLogout }) => {
  const [view, setView] = useState({ tab: "projects", editing: null });
  const [projects, setProjects] = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/projects");
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load projects."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closeEditor = (changed) => {
    setView({ tab: "projects", editing: null });
    if (changed) load();
  };

  return (
    <div data-testid="admin-dashboard">
      <header className="sticky top-0 z-40 border-b border-line bg-ink-950/90 backdrop-blur-xl">
        <div className="container-x flex min-h-[68px] flex-wrap items-center justify-between gap-3 py-2">
          <Logo height="h-9" testId="admin-dashboard-logo-link" />
          <nav className="flex" aria-label="Studio sections">
            {["projects", "inbox"].map((t) => (
              <button key={t} type="button" onClick={() => setView({ tab: t, editing: null })} className={`${TAB} ${view.tab === t ? "border-volt text-white" : "border-transparent text-slate-400 hover:text-white"}`} data-testid={`admin-tab-${t}`}>{t}</button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 md:inline">{email}</span>
            <button type="button" onClick={onLogout} className="inline-flex min-h-[44px] items-center gap-2 border border-line px-4 text-sm font-semibold hover:border-volt" data-testid="admin-logout-btn"><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</button>
          </div>
        </div>
      </header>
      <main className="container-x py-10">
        {view.tab === "inbox" && <MessagesPanel />}
        {view.tab === "projects" && !view.editing && (
          <ProjectList projects={projects} setProjects={setProjects} reload={load} onEdit={(p) => setView({ tab: "projects", editing: p ?? "new" })} />
        )}
        {view.tab === "projects" && view.editing && <ProjectEditor project={view.editing === "new" ? null : view.editing} onClose={closeEditor} />}
      </main>
    </div>
  );
};
