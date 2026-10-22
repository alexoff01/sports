import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const VARIANTS = {
  primary: { base: "border-volt bg-volt text-white", sweep: "bg-paper", hoverText: "group-hover:text-ink-950" },
  ghost: { base: "border-line-strong bg-transparent text-paper", sweep: "bg-volt", hoverText: "group-hover:text-white" },
};

export const CtaLink = ({ to, children, variant = "primary", testId, className = "", icon = true, ...rest }) => {
  const v = VARIANTS[variant];
  return (
    <Link
      to={to}
      data-testid={testId}
      className={`group relative inline-flex min-h-[52px] items-center gap-3 overflow-hidden rounded-sm border px-7 font-display text-base font-bold uppercase tracking-[0.14em] ${v.base} ${className}`}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 -translate-x-[101%] transition-transform duration-500 ease-cine group-hover:translate-x-0 group-focus-visible:translate-x-0 ${v.sweep}`}
      />
      <span className={`relative transition-colors duration-300 ${v.hoverText}`}>{children}</span>
      {icon && (
        <ArrowUpRight
          aria-hidden="true"
          className={`relative h-5 w-5 transition-[transform,color] duration-500 ease-cine group-hover:rotate-45 ${v.hoverText}`}
        />
      )}
    </Link>
  );
};
