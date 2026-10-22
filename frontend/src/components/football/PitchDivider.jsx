import { motion } from "framer-motion";

const EASE = [0.65, 0, 0.35, 1];
const view = { once: true, amount: 0.6 };

// Halfway line with centre circle that draws itself once when scrolled into view.
export const PitchDivider = ({ className = "" }) => (
  <div aria-hidden="true" className={`container-x pointer-events-none flex items-center py-6 ${className}`} data-testid="pitch-divider">
    <motion.span className="h-px flex-1 origin-right bg-gradient-to-l from-volt/60 to-transparent" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={view} transition={{ duration: 1.1, ease: EASE }} />
    <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0 text-volt-bright/70" fill="none" stroke="currentColor" strokeWidth="1.2">
      <motion.circle cx="32" cy="32" r="27" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={view} transition={{ duration: 1.1, delay: 0.3, ease: EASE }} />
      <motion.path d="M0 32H64" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={view} transition={{ duration: 0.8, ease: EASE }} />
      <circle cx="32" cy="32" r="2" fill="currentColor" />
    </svg>
    <motion.span className="h-px flex-1 origin-left bg-gradient-to-r from-volt/60 to-transparent" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={view} transition={{ duration: 1.1, ease: EASE }} />
  </div>
);
