import { useState } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage, mediaUrl } from "@/lib/api";
import { ProjectCard } from "@/components/site/ProjectCard";
import { ImageDrop } from "@/admin/ImageDrop";
import { slugify, toPayload } from "@/admin/payload";

const CATEGORIES = ["Content Creation", "Strategy", "Video"];
const TYPES = ["Concept", "Personal", "Real"];
const PLATFORMS = ["Instagram", "TikTok", "YouTube Shorts", "X"];
const STEPS = [["context", "Context"], ["objective", "Objective"], ["strategy", "Strategy"], ["execution", "Creative Execution"], ["outcome", "Intended Outcome"]];
const LABEL = "mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-300";

const Text = ({ id, label, value, onChange, area, ...rest }) => (
  <div>
    <label htmlFor={id} className={LABEL}>{label}</label>
    {area ? <textarea id={id} rows={4} className="field" value={value} onChange={(e) => onChange(e.target.value)} data-testid={`editor-${id}`} {...rest} /> : <input id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} data-testid={`editor-${id}`} {...rest} />}
  </div>
);

const Select = ({ id, label, value, options, onChange }) => (
  <div>
    <label htmlFor={id} className={LABEL}>{label}</label>
    <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} data-testid={`editor-${id}`}>{options.map((o) => <option key={o}>{o}</option>)}</select>
  </div>
);

export const ProjectEditor = ({ project, onClose }) => {
  const [form, setForm] = useState(() => toPayload(project ?? {}));
  const [tagText, setTagText] = useState((project?.tags ?? []).join(", "));
  const [slugTouched, setSlugTouched] = useState(Boolean(project));
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v, ...(k === "title" && !slugTouched ? { slug: slugify(v) } : {}) }));

  const togglePlatform = (pl) => set("platforms")(form.platforms.includes(pl) ? form.platforms.filter((x) => x !== pl) : [...form.platforms, pl]);
  const setCaption = (i, key, v) => set("captions")(form.captions.map((c, j) => (j === i ? { ...c, [key]: v } : c)));

  const save = async () => {
    setSaving(true);
    const body = { ...form, tags: tagText.split(",").map((t) => t.trim()).filter(Boolean) };
    try {
      if (project) await api.put(`/admin/projects/${project.id}`, body);
      else await api.post("/admin/projects", body);
      toast.success("Project saved");
      onClose(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the project."));
    } finally {
      setSaving(false);
    }
  };

  const preview = { ...form, id: "preview", tags: tagText.split(",").map((t) => t.trim()).filter(Boolean), cover_image: form.cover_image || "/images/stadium-night-1600.webp" };

  return (
    <div data-testid="project-editor">
      <button type="button" onClick={() => onClose(false)} className="inline-flex min-h-[44px] items-center gap-2 text-sm uppercase tracking-[0.16em] text-slate-300 hover:text-white" data-testid="editor-back-btn"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to projects</button>
      <h1 className="t-h2 mt-4">{project ? "Edit project" : "New project"}</h1>
      <div className="mt-8 grid gap-10 xl:grid-cols-12">
        <form className="space-y-6 xl:col-span-7" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="grid gap-6 sm:grid-cols-2">
            <Text id="title" label="Title" value={form.title} onChange={set("title")} maxLength={120} />
            <Text id="slug" label="Slug" value={form.slug} onChange={(v) => { setSlugTouched(true); set("slug")(slugify(v)); }} maxLength={80} />
            <Select id="category" label="Category" value={form.category} options={CATEGORIES} onChange={set("category")} />
            <Select id="project_type" label="Project type badge" value={form.project_type} options={TYPES} onChange={set("project_type")} />
            <Text id="label" label="Label (e.g. Concept Campaign)" value={form.label} onChange={set("label")} maxLength={40} />
            <Text id="tags" label="Tags (comma separated)" value={tagText} onChange={setTagText} />
          </div>
          <Text id="summary" label="Short description" value={form.summary} onChange={set("summary")} area maxLength={280} />
          <div>
            <p className={LABEL}>Cover image</p>
            {form.cover_image && <img src={mediaUrl(form.cover_image)} alt="" className="mb-3 h-40 w-full object-cover" />}
            <ImageDrop testId="editor-cover-drop" onUploaded={set("cover_image")} />
          </div>
          <Text id="cover_alt" label="Cover alt text" value={form.cover_alt} onChange={set("cover_alt")} maxLength={200} />
          <div>
            <p className={LABEL}>Gallery</p>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {form.gallery.map((g) => (
                <div key={g} className="relative"><img src={mediaUrl(g)} alt="" className="h-24 w-full object-cover" /><button type="button" aria-label="Remove image" onClick={() => set("gallery")(form.gallery.filter((x) => x !== g))} className="absolute right-1 top-1 grid h-8 w-8 place-items-center bg-ink-950/80"><X className="h-4 w-4" /></button></div>
              ))}
            </div>
            <ImageDrop multiple testId="editor-gallery-drop" onUploaded={(url) => setForm((f) => ({ ...f, gallery: [...f.gallery, url].slice(0, 8) }))} />
          </div>
          {STEPS.map(([k, l]) => <Text key={k} id={k} label={l} value={form[k]} onChange={set(k)} area maxLength={3000} />)}
          <fieldset>
            <legend className={LABEL}>Platforms</legend>
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map((pl) => (
                <label key={pl} className="flex min-h-[44px] items-center gap-2 border border-line px-3 text-sm"><input type="checkbox" checked={form.platforms.includes(pl)} onChange={() => togglePlatform(pl)} className="accent-[#2F6BFF]" data-testid={`editor-platform-${pl.toLowerCase().replace(/\s+/g, "-")}`} />{pl}</label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className={LABEL}>Sample captions</legend>
            {form.captions.map((c, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-12">
                <select aria-label="Caption platform" className="field sm:col-span-3" value={c.platform} onChange={(e) => setCaption(i, "platform", e.target.value)}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select>
                <input aria-label="Caption text" className="field sm:col-span-8" value={c.text} maxLength={600} onChange={(e) => setCaption(i, "text", e.target.value)} />
                <button type="button" aria-label="Remove caption" onClick={() => set("captions")(form.captions.filter((_, j) => j !== i))} className="grid h-12 place-items-center border border-line sm:col-span-1"><X className="h-4 w-4" /></button>
              </div>
            ))}
            {form.captions.length < 6 && <button type="button" onClick={() => set("captions")([...form.captions, { platform: "Instagram", text: "" }])} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-volt-bright" data-testid="editor-add-caption-btn"><Plus className="h-4 w-4" aria-hidden="true" />Add caption</button>}
          </fieldset>
          <div className="flex flex-wrap gap-6">
            <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => set("published")(e.target.checked)} className="accent-[#2F6BFF]" data-testid="editor-published" />Published</label>
            <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured")(e.target.checked)} className="accent-[#2F6BFF]" data-testid="editor-featured" />Featured on Home</label>
          </div>
          <button type="submit" disabled={saving} className="inline-flex min-h-[52px] items-center border border-volt bg-volt px-8 font-display font-bold uppercase tracking-[0.14em] disabled:opacity-60" data-testid="editor-save-btn">{saving ? "Saving…" : "Save project"}</button>
        </form>
        <aside className="xl:col-span-5" aria-label="Live preview">
          <div className="sticky top-24 space-y-4">
            <p className="eyebrow">Live preview</p>
            <div className="pointer-events-none"><ProjectCard project={preview} /></div>
            <div className="border border-line p-5 text-sm text-slate-300">
              {STEPS.map(([k, l]) => <p key={k} className="mb-2 line-clamp-2"><span className="font-semibold text-paper">{l}: </span>{form[k] || "—"}</p>)}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
