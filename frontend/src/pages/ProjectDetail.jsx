import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { useSeo } from "@/lib/seo";
import { responsive } from "@/lib/api";
import { useProject } from "@/hooks/useProjects";
import { MaskedHeadline } from "@/components/site/MaskedHeadline";
import { Reveal } from "@/components/site/Reveal";
import { TypeBadge } from "@/components/site/ProjectCard";
import { CtaBand } from "@/components/site/CtaBand";
import { PhoneMockup } from "@/components/project/PhoneMockup";
import NotFound from "@/pages/NotFound";

const STEPS = [
  { key: "context", label: "Context" },
  { key: "objective", label: "Objective" },
  { key: "strategy", label: "Strategy" },
  { key: "execution", label: "Creative Execution" },
  { key: "outcome", label: "Intended Outcome" },
];

const DetailHero = ({ p }) => (
  <section className="relative overflow-hidden pt-36 md:pt-44" aria-labelledby="project-title">
    <div className="container-x">
      <Link to="/projects" data-testid="back-to-projects-link" className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300 hover:text-white">
        <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> All projects
      </Link>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <TypeBadge type={p.project_type} label={`${p.project_type} project`} />
        <span className="tag">{p.label}</span>
        <span className="tag">{p.category}</span>
      </div>
      <MaskedHeadline testId="project-title" className="t-h1 mt-6 max-w-5xl" delay={0.25} lines={[{ text: p.title }]} />
      <Reveal delay={0.3}><p className="lead mt-6 max-w-2xl">{p.summary}</p></Reveal>
      <Reveal delay={0.35}>
        <dl className="mt-10 grid grid-cols-2 gap-6 border-y border-line py-6 md:grid-cols-4">
          <div><dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Type</dt><dd className="mt-2 font-display text-xl font-bold uppercase">{p.label}</dd></div>
          <div><dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Category</dt><dd className="mt-2 font-display text-xl font-bold uppercase">{p.category}</dd></div>
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Platforms</dt>
            <dd className="mt-2 flex flex-wrap gap-2" data-testid="project-platforms">{(p.platforms ?? []).map((pl) => <span key={pl} className="tag border-volt/60 text-paper">{pl}</span>)}</dd>
          </div>
        </dl>
      </Reveal>
    </div>
    <Reveal delay={0.2} className="container-x mt-12">
      <div className="relative aspect-[16/10] overflow-hidden border border-line md:aspect-[21/9] [clip-path:polygon(0_0,100%_0,100%_100%,6%_100%,0_88%)]">
        <img {...responsive(p.cover_image)} alt={p.cover_alt} className="h-full w-full object-cover" />
      </div>
    </Reveal>
  </section>
);

const CaseStudy = ({ p }) => (
  <section className="container-x grid gap-12 py-section lg:grid-cols-12" aria-label="Case study">
    <nav aria-label="Case study sections" className="hidden lg:col-span-3 lg:block">
      <ol className="sticky top-32 space-y-1 border-l border-line">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <a href={`#${s.key}`} className="flex min-h-[44px] items-center gap-3 pl-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300 hover:text-white">
              <span className="text-volt-bright">{String(i + 1).padStart(2, "0")}</span>{s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
    <div className="space-y-16 lg:col-span-8 lg:col-start-5">
      {STEPS.map((s, i) => (
        <Reveal key={s.key} as="article" id={s.key} className="scroll-mt-32 border-t border-line pt-8" data-testid={`case-step-${s.key}`}>
          <p className="eyebrow">Step {String(i + 1).padStart(2, "0")}</p>
          <h2 className="t-h2 mt-4">{s.label}</h2>
          <p className="lead mt-6 whitespace-pre-line">{p[s.key]}</p>
        </Reveal>
      ))}
      <p className="flex gap-3 border border-line bg-ink-900 p-5 text-sm leading-relaxed text-slate-300" data-testid="project-disclaimer">
        <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-volt-bright" />
        {p.project_type === "Real"
          ? "Real project. Details shared with permission."
          : "This is a concept or personal project. Clubs and brands named are fictional, and the intended outcome describes objectives and hypotheses, not achieved results."}
      </p>
    </div>
  </section>
);

const Mockups = ({ p }) => {
  const images = [p.cover_image, ...(p.gallery ?? [])].slice(0, 3);
  const captions = p.captions ?? [];
  return (
    <section className="border-t border-line bg-ink-900/40 py-section" aria-labelledby="mockups-title">
      <div className="container-x">
        <p className="eyebrow">Content Mockups</p>
        <h2 id="mockups-title" className="t-h2 mt-5">How it would look <span className="text-volt">in the feed.</span></h2>
        <div className="mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <Reveal key={`${img}-${i}`} delay={i * 0.1}>
              <PhoneMockup index={i} image={img} alt={i === 0 ? p.cover_alt : `${p.title} concept visual ${i + 1}`} platform={captions[i]?.platform ?? p.platforms?.[i] ?? "Instagram"} caption={captions[i]?.text} />
            </Reveal>
          ))}
        </div>
        {captions.length > 0 && (
          <div className="mt-20">
            <h3 className="t-h3">Sample captions</h3>
            <ul className="mt-6 divide-y divide-line border-y border-line" data-testid="sample-captions">
              {captions.map((c, i) => (
                <li key={i} className="grid gap-2 py-5 md:grid-cols-12">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-volt-bright md:col-span-3">{c.platform}</span>
                  <p className="text-paper md:col-span-9">“{c.text}”</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

export default function ProjectDetail() {
  const { slug } = useParams();
  const { project, loading, error } = useProject(slug);
  useSeo({
    title: project?.title ?? "Project",
    description: project?.summary ?? "Sports social media concept project by Alex Cearnau.",
    path: `/projects/${slug}`,
  });
  if (loading) return <div className="min-h-screen" aria-busy="true" />;
  if (error || !project) return <NotFound />;
  return (
    <>
      <DetailHero p={project} />
      <CaseStudy p={project} />
      <Mockups p={project} />
      <CtaBand />
    </>
  );
}
