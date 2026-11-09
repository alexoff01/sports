import { useCallback, useEffect, useState } from "react";
import { Film, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, errorMessage, mediaUrl } from "@/lib/api";
import { ImageDrop } from "@/admin/ImageDrop";
import { VideoDrop } from "@/admin/VideoDrop";
import { formatBytes } from "@/admin/ui";

export const MediaPanel = () => {
  const [items, setItems] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/media");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setItems([]);
      if (err?.response?.status !== 401) toast.error(errorMessage(err, "Could not load media."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (m) => {
    try {
      await api.delete(`/admin/media/${m.id}`);
      toast.success("File deleted");
      setItems((list) => list.filter((x) => x.id !== m.id));
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the file."));
    }
  };

  return (
    <section aria-labelledby="media-title" data-testid="media-panel">
      <h1 id="media-title" className="t-h2">Media</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-400">Uploaded files get random names. Images are resized, stripped of EXIF data and converted to WebP and AVIF. Files used by a project cannot be deleted until you remove them from that project.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ImageDrop multiple testId="media-image-drop" onUploaded={load} />
        <VideoDrop testId="media-video-drop" onUploaded={load} />
      </div>
      {items === null ? (
        <div className="mt-10 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-volt" aria-label="Loading" /></div>
      ) : items.length === 0 ? (
        <p className="mt-10 text-slate-400" data-testid="media-empty">No uploads yet.</p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" data-testid="media-grid">
          {items.map((m) => (
            <li key={m.id} className="border border-line bg-ink-900" data-testid={`media-item-${m.id}`}>
              {m.kind === "video" ? (
                <div className="grid aspect-video place-items-center bg-ink-950"><Film className="h-8 w-8 text-volt-bright" aria-hidden="true" /></div>
              ) : (
                <img src={mediaUrl(m.url)} alt="" loading="lazy" className="aspect-video w-full object-cover" />
              )}
              <div className="flex items-center justify-between gap-2 p-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate uppercase tracking-[0.14em] text-slate-300">{m.kind}{m.width ? ` · ${m.width}×${m.height}` : ""}</p>
                  <p className="text-slate-500">{formatBytes(m.size)} · {m.in_use ? <span className="text-emerald-400">in use</span> : "unused"}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button" disabled={m.in_use} title={m.in_use ? "Used by a project" : "Delete"} aria-label="Delete file" className="grid h-10 w-10 shrink-0 place-items-center border border-line hover:border-red-400 disabled:opacity-30" data-testid={`media-delete-${m.id}`}><Trash2 className="h-4 w-4" /></button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-sm border-line-strong bg-ink-900">
                    <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                    <AlertDialogDescription>It will no longer be available anywhere. This cannot be undone.</AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(m)} className="bg-red-600 hover:bg-red-500" data-testid="media-delete-confirm">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
