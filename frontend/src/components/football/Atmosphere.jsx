import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

// Large faint equipment line-art drifting with scroll in empty section margins (md and up only).
export const DriftMotif = ({ icon: Icon, className = "", distance = 60 }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [distance, -distance]);
  const rotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-6, 6]);
  return (
    <motion.div ref={ref} aria-hidden="true" style={{ y, rotate }} className={`pointer-events-none absolute hidden text-volt-bright/[0.12] md:block ${className}`} data-testid="drift-motif">
      <Icon className="h-full w-full" strokeWidth={0.8} />
    </motion.div>
  );
};

// Soft diagonal floodlight beam for atmosphere behind content.
export const LightBeam = ({ className = "" }) => (
  <div aria-hidden="true" className={`pointer-events-none absolute h-[150%] w-[36%] -rotate-[24deg] bg-gradient-to-b from-[rgba(130,165,255,0.16)] via-[rgba(130,165,255,0.05)] to-transparent ${className}`} />
);

// Gentle radial highlight placed behind headings to lift dark areas.
export const GlowHalo = ({ className = "" }) => (
  <div aria-hidden="true" className={`pointer-events-none absolute rounded-full bg-[radial-gradient(circle,rgba(47,107,255,0.2),transparent_65%)] ${className}`} />
);
