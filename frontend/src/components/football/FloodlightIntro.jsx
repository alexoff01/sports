import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/site/Logo";
import { FIRST_VISIT } from "@/lib/intro";

const BEAMS = [10, 34, 66, 90];
const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// First-visit intro: floodlights switch on one by one, then a light sweep draws the logo in (skippable, ≤1.2s).
export const FloodlightIntro = () => {
  const [show, setShow] = useState(() => FIRST_VISIT && !prefersReduced());

  useEffect(() => {
    try {
      window.sessionStorage.setItem("mv_intro", "1");
    } catch {
      /* storage unavailable: intro shows once per page load */
    }
    if (!show) return undefined;
    const timer = setTimeout(() => setShow(false), 1150);
    const onKey = (e) => e.key === "Escape" && setShow(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div data-testid="intro-loader" className="fixed inset-0 z-[80] overflow-hidden bg-ink-950" exit={{ opacity: 0, transition: { duration: 0.3 } }} onClick={() => setShow(false)}>
          {BEAMS.map((x, i) => (
            <motion.div
              key={x}
              aria-hidden="true"
              className="absolute -top-10 h-[130%] w-[30vw] origin-top bg-[radial-gradient(ellipse_at_top,rgba(130,165,255,0.42),rgba(47,107,255,0.08)_45%,transparent_72%)]"
              style={{ left: `${x - 15}%`, rotate: (50 - x) / 3.5 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0.45, 1] }}
              transition={{ duration: 0.34, delay: 0.06 + i * 0.12, times: [0, 0.35, 0.6, 1] }}
            />
          ))}
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative overflow-hidden px-3" onClick={(e) => e.stopPropagation()}>
              <Logo height="h-16" testId="intro-logo-link" onNavigate={() => setShow(false)} />
              <motion.div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[calc(100%+2rem)] bg-ink-950" initial={{ x: "0%" }} animate={{ x: "105%" }} transition={{ duration: 0.55, delay: 0.42, ease: [0.65, 0, 0.35, 1] }}>
                <span className="absolute inset-y-0 left-0 w-8 -translate-x-full bg-gradient-to-r from-transparent to-[rgba(130,165,255,0.9)]" />
              </motion.div>
            </div>
          </div>
          <button type="button" onClick={() => setShow(false)} data-testid="intro-skip-btn" className="absolute bottom-8 right-6 min-h-[44px] px-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300 hover:text-white">
            Skip intro
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
