import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSeo } from "@/lib/seo";
import { useProjects } from "@/hooks/useProjects";
import { MaskedHeadline } from "@/components/site/MaskedHeadline";
import { FilterTabs } from "@/components/site/FilterTabs";
import { ProjectCard } from "@/components/site/ProjectCard";
import { Reveal } from "@/components/site/Reveal";
import { CtaBand } from "@/components/site/CtaBand";
import { TacticsBoard } from "@/components/football/TacticsBoard";
import { PitchDivider } from "@/components/football/PitchDivider";
import { DriftMotif, GlowHalo } from "@/components/football/Atmosphere";
import { BootIcon, CornerFlagIcon } from "@/components/football/motifs";

const FILTERS = ["All", "Content Creation", "Strategy", "Video"];

export default function Projects() {
  useSeo({
    title: "Projects",
    description: "Selected sports social media projects by Alex Cearnau: matchday coverage, player storytelling, vertical video and fan engagement concepts.",
    path: "/projects",
  });
  const { projects, loading, error } = useProjects();
  const [filter, setFilter] = useState("All");
  const visible = useMemo(() => (filter === "All" ? projects : projects.filter((p) => p.category === filter)), [projects, filter]);

  return (
    <>
      <section className="container-x relative pb-14 pt-40 md:pt-48" aria-labelledby="projects-title">
        <GlowHalo className="-left-32 top-10 h-[460px] w-[460px]" />
        <TacticsBoard className="right-0 top-24 w-[90%] max-w-[760px] opacity-80 md:top-28" />
        <p className="eyebrow">Portfolio</p>
        <MaskedHeadline testId="projects-title" className="t-h1 mt-6" delay={0.25} lines={[{ text: "Selected projects" }, { text: "Turning sport into stories.", accent: true }]} />
        <Reveal delay={0.4}>
          <p className="lead mt-8 max-w-2xl">
            Concept campaigns and personal projects for football clubs, players and supporters. Each one is labelled clearly and shows the thinking: context, objective, strategy, execution and the outcome it aims for.
          </p>
        </Reveal>
      </section>
      <section className="container-x relative pb-section" aria-label="Project list">
        <DriftMotif icon={BootIcon} className="-right-10 top-1/3 -z-10 h-40 w-80" />
        <DriftMotif icon={CornerFlagIcon} className="-left-12 bottom-24 -z-10 h-56 w-56" distance={40} />
        <div className="flex flex-col gap-4 border-y border-line py-5 md:flex-row md:items-center md:justify-between">
          <FilterTabs options={FILTERS} value={filter} onChange={setFilter} />
          <p className="text-sm text-slate-400" aria-live="polite" data-testid="projects-count">
            {visible.length} {visible.length === 1 ? "project" : "projects"}
          </p>
        </div>
        {error && !loading && <p className="body-copy mt-10" data-testid="projects-error">Projects could not be loaded right now. Please try again later.</p>}
        <motion.ul layout className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8" data-testid="projects-grid">
          <AnimatePresence mode="popLayout">
            {visible.map((project, i) => (
              <motion.li
                layout
                key={project.id}
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
              >
                <ProjectCard project={project} index={i} headingLevel="h2" />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </section>
      <PitchDivider />
      <CtaBand />
    </>
  );
}
