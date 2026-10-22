import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/site/SectionHeader";
import { ProjectCard } from "@/components/site/ProjectCard";
import { Reveal } from "@/components/site/Reveal";
import { useProjects } from "@/hooks/useProjects";

const LAYOUT = [
  { col: "lg:col-span-7", frame: "aspect-[4/3] lg:aspect-[16/11]" },
  { col: "lg:col-span-5", frame: "aspect-[4/3] lg:aspect-[5/4]" },
  { col: "lg:col-span-5", frame: "aspect-[4/3] lg:aspect-[5/4]" },
  { col: "lg:col-span-7", frame: "aspect-[4/3] lg:aspect-[16/11]" },
];

export const SelectedProjects = () => {
  const { projects, loading } = useProjects();
  const featured = [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured)].slice(0, 4);

  return (
    <section aria-labelledby="selected-title" className="py-section" data-testid="home-selected-projects">
      <div className="container-x">
        <SectionHeader eyebrow="Selected Projects" id="selected-title" title={<>Work from <span className="text-volt">the touchline.</span></>} intro="Concept and personal projects built around real sports moments: matchdays, players and the supporters who follow them.">
          <Link to="/projects" data-testid="view-all-projects-link" className="group inline-flex min-h-[44px] items-center gap-3 font-display text-lg font-bold uppercase tracking-[0.14em] text-paper">
            View all projects
            <ArrowRight aria-hidden="true" className="h-5 w-5 text-volt-bright transition-transform duration-500 ease-cine group-hover:translate-x-2" />
          </Link>
        </SectionHeader>
        <div className="mt-14 grid gap-6 lg:grid-cols-12 lg:gap-8">
          {loading &&
            LAYOUT.map((l, i) => <div key={i} className={`${l.col} h-[420px] animate-pulse border border-line bg-ink-900`} aria-hidden="true" />)}
          {featured.map((project, i) => (
            <Reveal key={project.id} delay={(i % 2) * 0.12} className={LAYOUT[i].col}>
              <ProjectCard project={project} index={i} frameClass={LAYOUT[i].frame} sizes="(min-width:1024px) 58vw, 100vw" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
