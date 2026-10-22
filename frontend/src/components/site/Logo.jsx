import { Link, useLocation } from "react-router-dom";
import { getLenis } from "@/components/site/SmoothScroll";

export const Logo = ({ onNavigate, height = "h-10", testId = "header-logo-link" }) => {
  const { pathname } = useLocation();

  const onClick = (e) => {
    onNavigate?.();
    if (pathname !== "/") return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Wait one tick so a closing mobile menu can release the scroll lock first.
    setTimeout(() => {
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(0, { immediate: reduce, force: true });
      else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    }, 60);
  };

  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="Alex Cearnau – Home"
      data-testid={testId}
      className="inline-flex min-h-[44px] shrink-0 items-center rounded-sm transition-opacity duration-300 hover:opacity-90 focus-visible:opacity-90"
    >
      <img
        src="/brand/logo-80.png"
        srcSet="/brand/logo-40.png 1x, /brand/logo-80.png 2x, /brand/logo-120.png 3x"
        width={60}
        height={40}
        alt="Alex Cearnau logo"
        className={`${height} w-auto`}
      />
    </Link>
  );
};
