import { motion, useScroll, useSpring, useTransform } from "framer-motion";

// Decorative scroll progress: a top light line plus a match-clock dial without digits (aria-hidden).
export const MatchClockProgress = () => {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const rotate = useTransform(progress, [0, 1], [0, 360]);
  const dialOpacity = useTransform(progress, [0, 0.9, 0.97], [1, 1, 0]);
  return (
    <div aria-hidden="true" className="pointer-events-none" data-testid="match-clock-progress">
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[55] h-[2px] origin-left bg-volt shadow-[0_0_12px_rgba(47,107,255,0.8)]" />
      <motion.div style={{ opacity: dialOpacity }} className="fixed bottom-5 left-5 z-40 hidden h-11 w-11 rounded-full border border-line-strong bg-ink-950/75 md:block">
        <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full text-volt-bright/70">
          <path d="M22 4v4M40 22h-4M22 40v-4M4 22h4" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <motion.div style={{ rotate }} className="absolute inset-0">
          <span className="absolute left-1/2 top-[7px] h-[15px] w-px bg-volt" />
        </motion.div>
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper" />
      </motion.div>
    </div>
  );
};
