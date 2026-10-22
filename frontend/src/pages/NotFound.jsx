import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useSeo } from "@/lib/seo";
import { BallIcon } from "@/components/football/motifs";

// Ball rolling out past the goal line, played once.
const BallOut = () => {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="relative mt-10 h-16 w-full max-w-xl overflow-hidden" data-testid="not-found-ball">
      <span className="absolute inset-x-0 bottom-0 h-px bg-line-strong" />
      <span className="absolute bottom-0 left-[62%] h-full w-[2px] bg-paper/80" />
      <motion.div className="absolute bottom-1 left-0 h-12 w-12 text-paper" initial={reduce ? false : { x: -60, rotate: 0 }} animate={{ x: 470, rotate: 720 }} transition={{ duration: 1.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }} style={reduce ? { x: 470 } : undefined}>
        <BallIcon className="h-full w-full" strokeWidth={1.6} />
      </motion.div>
    </div>
  );
};

export default function NotFound() {
  useSeo({ title: "Page not found", description: "The page you are looking for does not exist.", path: "/404", noindex: true });
  return (
    <section className="container-x flex min-h-[85vh] flex-col justify-center pb-20 pt-40" data-testid="not-found-page">
      <p className="eyebrow">Error 404</p>
      <h1 className="h-display mt-6">Off<span className="text-volt">side.</span></h1>
      <BallOut />
      <p className="lead mt-8 max-w-xl">This page does not exist or has moved. Head back to the home page or browse the projects.</p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link to="/" data-testid="not-found-home-link" className="inline-flex min-h-[52px] items-center border border-volt bg-volt px-7 font-display font-bold uppercase tracking-[0.14em]">Back to home</Link>
        <Link to="/projects" className="inline-flex min-h-[52px] items-center border border-line-strong px-7 font-display font-bold uppercase tracking-[0.14em]">View projects</Link>
      </div>
    </section>
  );
}
