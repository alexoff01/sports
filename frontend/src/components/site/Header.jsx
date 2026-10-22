import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV } from "@/config/site";
import { Logo } from "@/components/site/Logo";
import { CtaLink } from "@/components/site/CtaLink";
import { getLenis } from "@/components/site/SmoothScroll";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const linkClass = ({ isActive }) =>
  `group relative inline-flex min-h-[44px] items-center font-display text-[17px] font-semibold uppercase tracking-[0.14em] transition-colors duration-300 ${
    isActive ? "text-white" : "text-slate-300 hover:text-white"
  }`;

const Underline = ({ isActive }) => (
  <span
    aria-hidden="true"
    className={`absolute bottom-2 left-0 h-[2px] w-full origin-left bg-volt transition-transform duration-500 ease-cine ${
      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
    }`}
  />
);

export const Header = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef(null);
  const { pathname } = useLocation();
  const close = useCallback(() => setOpen(false), []);
  useFocusTrap(panelRef, open, close);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const lenis = getLenis();
    document.body.style.overflow = open ? "hidden" : "";
    if (open) lenis?.stop();
    else lenis?.start();
    return undefined;
  }, [open]);

  return (
    <>
    <header
      data-testid="site-header"
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-500 ${
        scrolled || open ? "border-line bg-ink-950/85 backdrop-blur-xl" : "border-transparent bg-transparent"
      }`}
    >
      <div className="container-x flex h-[76px] items-center justify-between">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={linkClass} data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
              {({ isActive }) => (
                <>
                  {item.label}
                  <Underline isActive={isActive} />
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="hidden lg:block">
          <CtaLink to="/contact" testId="header-lets-talk-btn" className="min-h-[46px] px-5 text-sm">
            Let's Talk
          </CtaLink>
        </div>
        <button
          type="button"
          className="grid h-12 w-12 place-items-center border border-line lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
          data-testid="mobile-menu-toggle"
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>
    </header>
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            data-testid="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 bottom-0 top-[76px] z-[45] flex flex-col justify-between overflow-y-auto bg-ink-950 px-5 pb-10 pt-8 sm:px-8 lg:hidden"
          >
            <nav aria-label="Mobile">
              <ul className="flex flex-col">
                {NAV.map((item, i) => (
                  <motion.li key={item.to} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.06, duration: 0.5 }} className="border-b border-line">
                    <NavLink to={item.to} end={item.to === "/"} data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`} className={({ isActive }) => `flex min-h-[64px] items-center justify-between font-display text-4xl font-extrabold uppercase ${isActive ? "text-volt" : "text-paper"}`}>
                      {item.label}
                      <span className="font-body text-xs tracking-[0.2em] text-slate-400">{String(i + 1).padStart(2, "0")}</span>
                    </NavLink>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <CtaLink to="/contact" testId="mobile-lets-talk-btn" className="mt-10 w-full justify-between">
              Let's Talk
            </CtaLink>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
