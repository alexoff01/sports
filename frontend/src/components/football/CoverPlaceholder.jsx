import { BallIcon, BootIcon, GoalIcon, WhistleIcon } from "@/components/football/motifs";
import { LightBeam } from "@/components/football/Atmosphere";

const ICONS = [BallIcon, BootIcon, GoalIcon, WhistleIcon];

// Designed editorial cover for projects without a usable image: pitch lines, light beam, motif and number.
export const CoverPlaceholder = ({ index = 0 }) => {
  const Icon = ICONS[index % ICONS.length];
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_30%_0%,#16245a,#0a1020_62%)]" data-testid="cover-placeholder">
      <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" fill="none" stroke="rgba(150,180,255,0.2)" strokeWidth="1">
        <rect x="20" y="20" width="360" height="220" />
        <path d="M200 20v220M20 80h50v100H20M380 80h-50v100h50" />
        <circle cx="200" cy="130" r="36" />
      </svg>
      <LightBeam className="-top-1/3 left-[20%]" />
      <Icon className="absolute bottom-6 right-6 h-16 w-24 text-volt-bright/45" />
      <span className="absolute bottom-3 left-5 font-display text-7xl font-extrabold leading-none text-outline">{String(index + 1).padStart(2, "0")}</span>
    </div>
  );
};
