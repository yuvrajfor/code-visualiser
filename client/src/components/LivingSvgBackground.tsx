export function LivingSvgBackground({
  active,
  appearance,
}: {
  active: boolean;
  appearance: "light" | "dark";
}) {
  if (!active) return null;

  return (
    <svg
      aria-hidden="true"
      className="living-svg-background"
      data-appearance={appearance}
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      viewBox="0 0 1440 920"
    >
      <defs>
        <linearGradient id="living-svg-ribbon" x1="0" x2="1" y1="0" y2="1">
          <stop className="living-svg-stop-a" offset="0%" />
          <stop className="living-svg-stop-b" offset="52%" />
          <stop className="living-svg-stop-c" offset="100%" />
        </linearGradient>
        <radialGradient id="living-svg-halo">
          <stop className="living-svg-halo-core" offset="0%" />
          <stop className="living-svg-halo-edge" offset="100%" />
        </radialGradient>
      </defs>

      <rect className="living-svg-base" height="920" width="1440" x="0" y="0" />
      <g className="living-svg-halo">
        <circle cx="260" cy="220" r="230" />
        <circle cx="1190" cy="730" r="320" />
      </g>

      <g className="living-svg-orbit living-svg-orbit-one" transform="translate(720 410)">
        <circle className="living-svg-ring" r="300" />
        <circle className="living-svg-ring living-svg-ring-dashed" r="218" />
        <path className="living-svg-ray" d="M0 -334 L34 -214 L0 -120 L-34 -214 Z" />
        <path className="living-svg-ray" d="M334 0 L214 34 L120 0 L214 -34 Z" />
        <path className="living-svg-ray" d="M0 334 L34 214 L0 120 L-34 214 Z" />
        <path className="living-svg-ray" d="M-334 0 L-214 34 L-120 0 L-214 -34 Z" />
      </g>

      <g className="living-svg-orbit living-svg-orbit-two" transform="translate(720 410)">
        <path className="living-svg-petal" d="M0 -255 C105 -185 116 -64 0 0 C-116 -64 -105 -185 0 -255 Z" />
        <path className="living-svg-petal" d="M255 0 C185 105 64 116 0 0 C64 -116 185 -105 255 0 Z" />
        <path className="living-svg-petal" d="M0 255 C-105 185 -116 64 0 0 C116 64 105 185 0 255 Z" />
        <path className="living-svg-petal" d="M-255 0 C-185 -105 -64 -116 0 0 C-64 116 -185 105 -255 0 Z" />
        <circle className="living-svg-center" r="56" />
      </g>

      <g className="living-svg-ribbons">
        <path d="M-120 165 C270 20 420 310 720 165 S1180 15 1580 190" />
        <path d="M-100 660 C210 485 460 800 735 620 S1200 480 1560 690" />
      </g>
      <g className="living-svg-sparkles">
        <circle cx="196" cy="620" r="10" />
        <circle cx="1190" cy="230" r="14" />
        <circle cx="1304" cy="496" r="8" />
        <circle cx="390" cy="118" r="7" />
      </g>
    </svg>
  );
}
