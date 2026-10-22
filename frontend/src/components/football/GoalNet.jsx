import { useId, useRef } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";

// Subtle goal-net mesh that sways slightly and drifts with scroll; the sway pauses off-screen.
export const GoalNet = ({ className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-24, 24]);

  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none absolute ${className}`} data-testid="goal-net">
      <motion.div style={{ y }} className="h-full w-full">
        <svg className="net-sway h-full w-full" style={{ animationPlayState: inView ? "running" : "paused" }}>
          <defs>
            <pattern id={`net-${id}`} width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <path d="M0 0H26M0 0V26" stroke="rgba(150,180,255,0.24)" strokeWidth="1" />
            </pattern>
            <radialGradient id={`fade-${id}`} cx="60%" cy="40%" r="65%">
              <stop offset="0" stopColor="white" />
              <stop offset="1" stopColor="black" />
            </radialGradient>
            <mask id={`mask-${id}`}>
              <rect width="100%" height="100%" fill={`url(#fade-${id})`} />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill={`url(#net-${id})`} mask={`url(#mask-${id})`} />
        </svg>
      </motion.div>
    </div>
  );
};
