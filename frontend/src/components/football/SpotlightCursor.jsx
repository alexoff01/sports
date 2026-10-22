import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

// Soft stadium-spotlight glow that follows a fine pointer (desktop only, off for reduced motion).
export const SpotlightCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const x = useMotionValue(-600);
  const y = useMotionValue(-600);
  const sx = useSpring(x, { stiffness: 110, damping: 24 });
  const sy = useSpring(y, { stiffness: 110, damping: 24 });

  useEffect(() => {
    const ok = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!ok) return undefined;
    setEnabled(true);
    const move = (e) => {
      x.set(e.clientX - 280);
      y.set(e.clientY - 280);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  if (!enabled) return null;
  return (
    <motion.div
      aria-hidden="true"
      data-testid="spotlight-cursor"
      style={{ x: sx, y: sy }}
      className="pointer-events-none fixed left-0 top-0 z-[5] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(130,165,255,0.09),transparent_62%)]"
    />
  );
};
