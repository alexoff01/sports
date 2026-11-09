import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, errorMessage, mediaUrl } from "@/lib/api";

const ICON_BTN = "grid h-11 w-11 place-items-center border border-line transition-colors hover:border-volt disabled:opacity-30";

export const ProjectList = ({ projects, setProjects, reload, onEdit }) => {
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const reorder = async (from, to) => {
    if (from === null || from === to || to < 0 || to >= projects.length) return;
    const next = [...projects];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setProjects(next);
    try {
      await api.post("/admin/projects/reorder", { ids: next.map((p) => p.id) });
      toast.success("Order saved", { id: "order" });
    } catch (err) {
      toast.error(errorMessage(err));
      reload();
    }
  };

  const togglePublish = async (p, published) => {
    setProjects((list) => list.map((x) => (x.id === p.id ? { ...x, published } : x)));
    try {
      await api.post(`/admin/projects/${p.id}/publish`, { published });
      toast.success(published ? "Published" : "Moved to drafts");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      reload();
    }
  };

  const remove = async (p) => {
    try {
      await api.delete(`/admin/projects/${p.id}`);
      toast.success("Project deleted");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const endDrag = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  return (
    <section aria-labelledby="admin-projects-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="admin-projects-title" className="t-h2">Projects</h1>
          <p className="mt-2 text-sm text-slate-400">Drag rows to reorder (or use the arrows). Only published projects appear on the site.</p>
        </div>
        <button type="button" onClick={() => onEdit(null)} className="inline-flex min-h-[48px] items-center gap-2 border border-volt bg-volt px-5 font-display font-bold uppercase tracking-[0.12em]" data-testid="admin-new-project-btn"><Plus className="h-4 w-4" aria-hidden="true" />New project</button>
      </div>
      {projects.length === 0 && <p className="mt-8 text-slate-400" data-testid="admin-project-empty">No projects yet.</p>}
      <ul className="mt-8 divide-y divide-line border-y border-line" data-testid="admin-project-list">
        {projects.map((p, i) => (
          <li
            key={p.id}
            draggable
            onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }}
            onDragOver={(e) => { e.preventDefault(); if (dragOver !== i) setDragOver(i); }}
            onDrop={(e) => { e.preventDefault(); reorder(dragFrom ?? Number(e.dataTransfer.getData("text/plain")), i); endDrag(); }}
            onDragEnd={endDrag}
            className={`flex flex-col gap-4 py-4 transition-colors md:flex-row md:items-center ${dragFrom === i ? "opacity-40" : ""} ${dragOver === i && dragFrom !== i ? "bg-volt/10 outline outline-1 outline-volt" : ""}`}
            data-testid={`admin-project-row-${p.slug}`}
          >
            <div className="flex items-center gap-3 md:contents">
              <GripVertical className="hidden h-5 w-5 shrink-0 cursor-grab text-slate-500 active:cursor-grabbing md:block" aria-hidden="true" />
              <img src={mediaUrl(p.cover_image)} alt="" className="h-16 w-24 shrink-0 object-cover md:h-20 md:w-32" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-bold uppercase sm:text-xl">{p.title}</p>
                <p className="text-xs text-slate-400">{p.category} · {p.project_type} · Updated {p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="mr-2 flex min-h-[44px] items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-300">
                <Switch checked={p.published} onCheckedChange={(v) => togglePublish(p, v)} className="data-[state=checked]:bg-volt" data-testid={`admin-publish-toggle-${p.slug}`} />
                <span className={p.published ? "text-emerald-400" : ""}>{p.published ? "Live" : "Draft"}</span>
              </label>
              <button type="button" aria-label="Move up" className={ICON_BTN} disabled={i === 0} onClick={() => reorder(i, i - 1)} data-testid={`admin-move-up-${p.slug}`}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label="Move down" className={ICON_BTN} disabled={i === projects.length - 1} onClick={() => reorder(i, i + 1)} data-testid={`admin-move-down-${p.slug}`}><ArrowDown className="h-4 w-4" /></button>
              <button type="button" aria-label={`Edit ${p.title}`} className={ICON_BTN} onClick={() => onEdit(p)} data-testid={`admin-edit-${p.slug}`}><Pencil className="h-4 w-4" /></button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button type="button" aria-label={`Delete ${p.title}`} className={`${ICON_BTN} hover:border-red-400`} data-testid={`admin-delete-${p.slug}`}><Trash2 className="h-4 w-4" /></button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-sm border-line-strong bg-ink-900">
                  <AlertDialogTitle>Delete “{p.title}”?</AlertDialogTitle>
                  <AlertDialogDescription>This permanently removes the project. This cannot be undone.</AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="admin-delete-cancel">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(p)} className="bg-red-600 hover:bg-red-500" data-testid="admin-delete-confirm">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
