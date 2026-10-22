import { Link } from "react-router-dom";

export const LogoMark = ({ className = "h-8 w-8" }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
    <rect x="1" y="1" width="30" height="30" rx="2" fill="#05070D" stroke="#2F6BFF" strokeWidth="2" />
    <path d="M8 23V9.5l8 8 8-8V23" fill="none" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="square" />
    <circle cx="16" cy="24.5" r="2.2" fill="#2F6BFF" />
  </svg>
);

export const Logo = ({ onClick }) => (
  <Link
    to="/"
    onClick={onClick}
    data-testid="header-logo-link"
    aria-label="Alex Cearnau, Mativo Hub — home"
    className="group inline-flex min-h-[44px] items-center gap-3"
  >
    <LogoMark className="h-9 w-9 transition-transform duration-500 ease-cine group-hover:rotate-[-8deg]" />
    <span className="flex flex-col leading-none">
      <span className="font-display text-xl font-extrabold uppercase tracking-[0.08em]">Mativo</span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Alex Cearnau</span>
    </span>
  </Link>
);
