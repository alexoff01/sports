import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { MaskedHeadline } from "@/components/site/MaskedHeadline";
import { CtaLink } from "@/components/site/CtaLink";
import { HERO_DELAY } from "@/lib/intro";
import { responsive } from "@/lib/api";

const EASE = [0.22, 1, 0.36, 1];

const PhoneConcept = ({ rx, ry }) => (
  <motion.div style={{ rotateX: rx, rotateY: ry, transformPerspective: 1100 }} className="relative w-[260px] xl:w-[290px]">
    <div className="relative aspect-[9/19] overflow-hidden rounded-[26px] border border-line-strong bg-ink-900 p-2 shadow-[0_40px_120px_-30px_rgba(47,107,255,0.55)]">
      <div className="relative h-full overflow-hidden rounded-[20px]">
        <img {...responsive("/images/phone-filming-1600.webp", "300px")} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-x-3 top-3 flex gap-1" aria-hidden="true">
          {[1, 1, 0.4, 0].map((v, i) => (
            <span key={i} className="h-[2px] flex-1 bg-white/30"><span className="block h-full bg-white" style={{ width: `${v * 100}%` }} /></span>
          ))}
        </div>
        <span className="absolute left-3 top-7 bg-volt px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">Live · 63'</span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 to-transparent p-4 pt-16">
          <p className="font-display text-2xl font-extrabold uppercase leading-none">Goal from pitch level</p>
          <p className="mt-2 text-[11px] text-slate-300">Matchday story concept</p>
        </div>
      </div>
    </div>
    <p className="mt-4 text-center text-[11px] uppercase tracking-[0.24em] text-slate-400">Concept mockup</p>
  </motion.div>
);

export const HomeHero = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "22%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-12%"]);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 120, damping: 18 });
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 18 });

  const onMove = (e) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section ref={ref} onMouseMove={onMove} data-testid="home-hero" className="grain relative flex min-h-[100svh] items-end overflow-hidden" aria-labelledby="hero-title">
      <motion.div style={{ y: imageY }} className="absolute inset-0 h-[118%]">
        <motion.img
          {...responsive("/images/stadium-night-1600.webp")}
          alt="Floodlit football stadium packed with supporters during a night match"
          fetchPriority="high"
          initial={reduce ? false : { scale: 1.18 }}
          animate={{ scale: 1.04 }}
          transition={{ duration: 2.8, ease: EASE }}
          className="h-full w-full object-cover object-center"
        />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-ink-950/20 to-transparent" />

      <motion.div style={{ y: contentY }} className="container-x relative z-10 grid items-end gap-12 pb-16 pt-36 md:pb-24 lg:grid-cols-12">
        <div className="lg:col-span-9">
          <motion.p className="eyebrow" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: HERO_DELAY, ease: EASE }}>
            Alex Cearnau · Mativo Hub
          </motion.p>
          <MaskedHeadline
            testId="hero-title"
            className="h-display mt-7"
            delay={HERO_DELAY + 0.1}
            lines={[{ text: "Sports stories." }, { text: "Real impact.", accent: true }]}
          />
          <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: HERO_DELAY + 0.55, ease: EASE }}>
            <p className="lead mt-8 max-w-xl">
              Sports social media, content creation, strategy and storytelling. I turn matchdays, players and supporters into content people want to follow.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <CtaLink to="/projects" testId="hero-view-work-btn">View My Work</CtaLink>
              <CtaLink to="/about" variant="ghost" icon={false} testId="hero-about-btn">About Me</CtaLink>
            </div>
          </motion.div>
        </div>
        <motion.div className="hidden justify-end lg:col-span-3 lg:flex" initial={reduce ? false : { opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: HERO_DELAY + 0.4, ease: EASE }}>
          <PhoneConcept rx={rx} ry={ry} />
        </motion.div>
      </motion.div>

      <div className="absolute bottom-6 right-5 z-10 hidden items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-300 md:flex sm:right-8 lg:right-12" aria-hidden="true">
        Scroll
        <span className="relative block h-10 w-px overflow-hidden bg-white/20"><span className="scroll-cue absolute inset-0 bg-volt" /></span>
      </div>
    </section>
  );
};
