import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/site/Logo";
import { FIRST_VISIT } from "@/lib/intro";

export const IntroLoader = () => {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(FIRST_VISIT);

  useEffect(() => {
    if (!show) return undefined;
    try {
      window.sessionStorage.setItem("mv_intro", "1");
    } catch {
      /* storage unavailable: the intro simply shows once per page load */
    }
    const timer = setTimeout(() => setShow(false), reduce ? 250 : 1100);
    const onKey = (e) => e.key === "Escape" && setShow(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [show, reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          data-testid="intro-loader"
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-ink-950"
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
        >
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} onClick={(e) => e.stopPropagation()}>
            <Logo height="h-14" testId="intro-logo-link" onNavigate={() => setShow(false)} />
          </motion.div>
          <div className="mt-8 h-px w-56 overflow-hidden bg-line">
            <motion.div className="h-full origin-left bg-volt" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.95, ease: [0.76, 0, 0.24, 1] }} />
          </div>
          <button
            type="button"
            onClick={() => setShow(false)}
            data-testid="intro-skip-btn"
            className="absolute bottom-8 right-6 min-h-[44px] px-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300 hover:text-white"
          >
            Skip intro
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
