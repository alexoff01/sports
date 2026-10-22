import { motion, useReducedMotion } from "framer-motion";

// Quick diagonal light-sweep wipe with a pitch-line pattern between pages (≤450ms, off for reduced motion).
export const PageTransition = ({ children }) => {
  const reduce = useReducedMotion();
  return (
    <>
      {!reduce && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed inset-y-0 -left-[20vw] z-[60] w-[140vw] border-r-2 border-volt bg-ink-900 [background-image:repeating-linear-gradient(90deg,transparent_0_119px,rgba(47,107,255,0.16)_119px_120px)]"
          style={{ skewX: -12 }}
          initial={{ x: "0%" }}
          animate={{ x: "112%" }}
          transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
        />
      )}
      <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.1 }}>
        {children}
      </motion.div>
    </>
  );
};
