import { motion, useReducedMotion } from "framer-motion";

const MARKS = [
  { x: 110, y: 200, t: "o" }, { x: 250, y: 90, t: "x" }, { x: 390, y: 210, t: "o" },
  { x: 540, y: 110, t: "x" }, { x: 690, y: 190, t: "o" },
];
const ARROWS = ["M128 190 C 170 140, 210 110, 236 98", "M405 200 C 450 170, 500 130, 528 116", "M552 122 C 600 150, 640 175, 674 186"];
const HEADS = ["M228 92l10 5-8 8", "M520 108l10 7-9 7", "M664 180l11 6-10 6"];

const draw = (reduce, delay) => ({
  initial: reduce ? false : { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { duration: 0.7, delay, ease: [0.65, 0, 0.35, 1] },
});

// Faint X/O markers and movement arrows that sketch themselves behind a headline, like a tactics board.
export const TacticsBoard = ({ className = "", delay = 0.5 }) => {
  const reduce = useReducedMotion();
  return (
    <svg aria-hidden="true" viewBox="0 0 800 300" className={`pointer-events-none absolute text-volt-bright/25 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" data-testid="tactics-board">
      {MARKS.map((m, i) =>
        m.t === "o" ? (
          <motion.circle key={i} cx={m.x} cy={m.y} r="13" {...draw(reduce, delay + i * 0.12)} />
        ) : (
          <motion.path key={i} d={`M${m.x - 11} ${m.y - 11}L${m.x + 11} ${m.y + 11}M${m.x + 11} ${m.y - 11}L${m.x - 11} ${m.y + 11}`} {...draw(reduce, delay + i * 0.12)} />
        ),
      )}
      {ARROWS.map((d, i) => (
        <motion.path key={d} d={d} {...draw(reduce, delay + 0.6 + i * 0.18)} />
      ))}
      {HEADS.map((d, i) => (
        <motion.path key={d} d={d} {...draw(reduce, delay + 1.1 + i * 0.18)} />
      ))}
    </svg>
  );
};
