import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Picture } from "@/components/site/Picture";
import { CoverPlaceholder } from "@/components/football/CoverPlaceholder";

export const TypeBadge = ({ type, label }) => (
  <span
    data-testid="project-type-badge"
    className="inline-flex items-center gap-2 border border-volt/60 bg-ink-950/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-paper backdrop-blur-md"
  >
    <span className="h-1.5 w-1.5 rounded-full bg-volt" aria-hidden="true" />
    {label || type}
  </span>
);

const Frame = ({ project, sizes, className, index }) => {
  const [failed, setFailed] = useState(false);
  return (
  <div className={`relative overflow-hidden bg-ink-900 ${className}`}>
    {project.cover_image && !failed ? (
      <Picture
        src={project.cover_image}
        sizes={sizes}
        alt={project.cover_alt}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover object-center transition-transform duration-1000 ease-cine group-hover:scale-[1.05]"
      />
    ) : (
      <CoverPlaceholder index={index} />
    )}
    <span aria-hidden="true" className="card-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
      <span className="tag border-transparent bg-volt text-white">{project.category}</span>
      <TypeBadge type={project.project_type} label={project.label} />
    </div>
  </div>
  );
};

// Very subtle 3D tilt for cards on fine-pointer devices.
const TiltCard = ({ children }) => {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 150, damping: 20 });
  const sry = useSpring(ry, { stiffness: 150, damping: 20 });
  const onMove = (e) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 6);
    rx.set(((e.clientY - r.top) / r.height - 0.5) * -6);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };
  return (
    <motion.div className="h-full" style={{ rotateX: srx, rotateY: sry, transformPerspective: 1200 }} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </motion.div>
  );
};

export const ProjectCard = ({ project, index = 0, sizes = "(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw", frameClass = "aspect-[4/3]", headingLevel = "h3" }) => {
  const H = headingLevel;
  return (
    <TiltCard>
    <Link
      to={`/projects/${project.slug}`}
      data-testid={`project-card-${project.slug}`}
      className="group relative flex h-full flex-col border border-line bg-ink-900/85 transition-[border-color,box-shadow] duration-500 hover:border-volt hover:shadow-[0_0_0_1px_var(--volt),0_24px_60px_-20px_rgba(47,107,255,0.45)]"
    >
      <Frame project={project} sizes={sizes} className={frameClass} index={index} />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <H className="t-h3 text-paper">
            <span className="mr-3 font-body text-xs font-semibold tracking-[0.2em] text-volt-bright">
              {String(index + 1).padStart(2, "0")}
            </span>
            {project.title}
          </H>
          <ArrowUpRight aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-volt-bright transition-transform duration-500 ease-cine group-hover:-translate-y-1 group-hover:translate-x-1" />
        </div>
        <p className="body-copy">{project.summary}</p>
        <ul className="mt-auto flex flex-wrap gap-2 pt-2" aria-label="Tags">
          {(project.tags ?? []).map((t) => (
            <li key={t} className="tag">{t}</li>
          ))}
        </ul>
      </div>
    </Link>
    </TiltCard>
  );
};
