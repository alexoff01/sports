export const toPayload = (p) => ({
  title: p.title ?? "",
  slug: p.slug ?? "",
  category: p.category ?? "Content Creation",
  project_type: p.project_type ?? "Concept",
  label: p.label ?? "Concept Campaign",
  summary: p.summary ?? "",
  tags: p.tags ?? [],
  cover_image: p.cover_image ?? "",
  cover_alt: p.cover_alt ?? "",
  gallery: p.gallery ?? [],
  videos: p.videos ?? [],
  context: p.context ?? "",
  objective: p.objective ?? "",
  strategy: p.strategy ?? "",
  execution: p.execution ?? "",
  outcome: p.outcome ?? "",
  platforms: p.platforms ?? [],
  captions: p.captions ?? [],
  published: Boolean(p.published),
  featured: Boolean(p.featured),
});

export const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
