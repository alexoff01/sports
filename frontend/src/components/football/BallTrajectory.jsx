import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

const PATH = "M -40 560 C 260 330, 640 140, 1240 250";

// One-time dashed shot trajectory drawing across the hero, with a ball glint travelling along it.
export const BallTrajectory = ({ delay = 0 }) => {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden="true" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" data-testid="ball-trajectory">
      <defs>
        <mask id={`traj-${id}`}>
          <motion.path d={PATH} stroke="white" strokeWidth="8" fill="none" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay, ease: [0.65, 0, 0.35, 1] }} />
        </mask>
      </defs>
      <path d={PATH} mask={`url(#traj-${id})`} stroke="rgba(150,180,255,0.5)" strokeWidth="1.5" strokeDasharray="6 10" fill="none" />
      {!reduce && (
        <circle r="4.5" fill="#fff" opacity="0" style={{ filter: "drop-shadow(0 0 6px rgba(130,165,255,0.9))" }}>
          <animateMotion dur="1.6s" begin={`${delay}s`} fill="freeze" path={PATH} calcMode="spline" keyTimes="0;1" keySplines="0.65 0 0.35 1" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="1.7s" begin={`${delay}s`} fill="freeze" />
        </circle>
      )}
    </svg>
  );
};
