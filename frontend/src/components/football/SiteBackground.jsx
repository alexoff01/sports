import { useLocation } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Picture } from "@/components/site/Picture";

const LEVELS = { "/": 0.28, "/projects": 0.48, "/about": 0.48, "/contact": 0.48 };

// Fixed site-wide stadium backdrop with a route-based readability overlay (public pages only).
export const SiteBackground = () => {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const deepen = useTransform(scrollY, [0, 900], [0, 0.34]);
  const scale = useTransform(scrollY, [0, 4000], [1, reduce ? 1 : 1.03]);
  const level = LEVELS[pathname] ?? 0.6;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950" data-testid="site-background" style={{ "--bg-overlay": level }}>
      <motion.div style={{ scale }} className="absolute inset-0 [transform:translateZ(0)] max-md:!transform-none">
        <Picture src="/images/hero-stadium-lg.webp" priority alt="" className="h-full w-full object-cover object-[62%_center] md:object-center" />
      </motion.div>
      <motion.div className="absolute inset-0 bg-ink-950" initial={false} animate={{ opacity: level }} transition={{ duration: reduce ? 0 : 0.4 }} />
      <motion.div style={{ opacity: deepen }} className="absolute inset-0 bg-ink-950" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/30 via-transparent to-ink-950/60" />
    </div>
  );
};
