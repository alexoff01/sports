import { motion } from "framer-motion";

export const FilterTabs = ({ options, value, onChange }) => (
  <div role="group" aria-label="Filter projects by category" className="flex flex-wrap gap-2" data-testid="project-filter-tabs">
    {options.map((option) => {
      const active = option === value;
      return (
        <button
          key={option}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(option)}
          data-testid={`filter-tab-${option.toLowerCase().replace(/\s+/g, "-")}`}
          className={`relative min-h-[46px] rounded-sm border px-5 font-display text-base font-bold uppercase tracking-[0.14em] transition-colors duration-300 ${
            active ? "border-volt text-white" : "border-line text-slate-300 hover:border-line-strong hover:text-white"
          }`}
        >
          {active && (
            <motion.span
              layoutId="filter-active"
              className="absolute inset-0 bg-volt"
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              aria-hidden="true"
            />
          )}
          <span className="relative">{option}</span>
        </button>
      );
    })}
  </div>
);
