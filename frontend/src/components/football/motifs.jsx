const Svg = ({ children, viewBox = "0 0 64 64", className = "", strokeWidth = 1.25 }) => (
  <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
    {children}
  </svg>
);

// Classic panelled football in line-art.
export const BallIcon = (p) => (
  <Svg {...p}>
    <circle cx="32" cy="32" r="28" />
    <path d="M32 20l9 6.5-3.4 10.6H26.4L23 26.5z" />
    <path d="M32 20V5M41 26.5l13.5-4.6M37.6 37.1l8.6 11.8M26.4 37.1l-8.6 11.8M23 26.5L9.5 21.9" />
  </Svg>
);

// Football boot in side view with studs.
export const BootIcon = (p) => (
  <Svg viewBox="0 0 96 48" {...p}>
    <path d="M6 32c0-8 4-22 10-24l14 2c2 6 6 9 14 10l30 4c8 1 14 5 14 10v4H8c-1.5 0-2-1-2-6z" />
    <path d="M8 38h82M18 38v5M34 38v5M52 38v5M70 38v5M84 38v5M30 11l-4 10M37 13l-3 9M44 15l-2 8" />
  </Svg>
);

// Goal frame with net mesh.
export const GoalIcon = (p) => (
  <Svg viewBox="0 0 96 48" {...p}>
    <path d="M6 46V6h84v40M6 6l10 8h64l10-8M16 14v32M80 14v32" />
    <path d="M28 14v32M40 14v32M52 14v32M64 14v32M16 24h64M16 35h64" opacity=".55" />
  </Svg>
);

// Corner flag with corner arc.
export const CornerFlagIcon = (p) => (
  <Svg {...p}>
    <path d="M20 58V6M20 6l26 8-26 8M8 58a12 12 0 0 1 12-12" />
  </Svg>
);

// Referee whistle.
export const WhistleIcon = (p) => (
  <Svg {...p}>
    <path d="M10 32a14 14 0 1 0 28 0v-8h18v8H38" />
    <circle cx="24" cy="32" r="4" />
    <path d="M44 24v-6M14 19l-4-6" />
  </Svg>
);

// Stadium floodlight tower.
export const FloodlightIcon = (p) => (
  <Svg {...p}>
    <rect x="16" y="6" width="32" height="16" rx="1" />
    <path d="M24 6v16M32 6v16M40 6v16M28 22l-6 36M36 22l6 36M24 40h16M20 58h24" />
  </Svg>
);

// Goalkeeper glove.
export const GloveIcon = (p) => (
  <Svg {...p}>
    <path d="M20 58V36l-7-11a3 3 0 0 1 5-3l5 6V12a3 3 0 0 1 6 0v14V8a3 3 0 0 1 6 0v18V11a3 3 0 0 1 6 0v17-11a3 3 0 0 1 6 0v23c0 9-4 18-11 18z" />
    <path d="M20 50h22" />
  </Svg>
);

// Captain's armband with stripes.
export const ArmbandIcon = (p) => (
  <Svg viewBox="0 0 64 40" {...p}>
    <rect x="4" y="8" width="56" height="24" rx="3" />
    <path d="M4 16h56M4 24h56" opacity=".55" />
  </Svg>
);
