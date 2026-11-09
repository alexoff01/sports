export const BTN =
  "inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-sm border border-volt bg-volt px-6 font-display text-base font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-volt-bright disabled:cursor-not-allowed disabled:opacity-60";
export const BTN_GHOST =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm border border-line px-4 text-sm font-semibold transition-colors hover:border-volt disabled:opacity-50";
export const LABEL = "mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-300";
export const CARD = "border border-line bg-ink-900 p-6 sm:p-8";

export const formatBytes = (n) => {
  if (!n && n !== 0) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
