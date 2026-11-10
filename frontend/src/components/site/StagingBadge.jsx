import { isPrimaryHost } from "@/lib/seo";

// Discreet label on every non-primary address (staging preview); never rendered on the official domain.
export const StagingBadge = () => {
  if (isPrimaryHost()) return null;
  return (
    <div
      className="pointer-events-none fixed right-3 top-[76px] z-[60] rounded-sm border border-amber-400/40 bg-ink-950/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 backdrop-blur"
      aria-hidden="true"
      data-testid="staging-badge"
    >
      Staging preview
    </div>
  );
};
