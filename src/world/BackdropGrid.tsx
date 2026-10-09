/**
 * The static backdrop's perspective floor grid, as inline SVG lines.
 * Inline SVG (not a CSS background image) so it is never picked as the
 * page's Largest Contentful Paint and never needs a network request, and
 * pre-flattened lines (not a CSS 3D transform + mask) so it paints instantly.
 */
const W = 1600;
const H = 600;
const VANISH_X = W / 2;
const VANISH_Y = -900;

function gridPath() {
  const parts: string[] = [];
  const t = H / (H - VANISH_Y);
  for (let x = -2400; x <= W + 2400; x += 120) {
    parts.push(`M${x} ${H}L${(x + (VANISH_X - x) * t).toFixed(1)} 0`);
  }
  for (let k = 0; k < 18; k++) {
    parts.push(`M0 ${(H / (1 + k * 0.28)).toFixed(1)}H${W}`);
  }
  return parts.join("");
}

const d = gridPath();

export function BackdropGrid() {
  return (
    <svg
      className="stage-grid"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Fades the lines in from the horizon and out at the bottom edge. */}
        <linearGradient id="stage-grid-fade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
          <stop offset="0" stopColor="#EDEAE2" stopOpacity="0" />
          <stop offset="0.35" stopColor="#EDEAE2" stopOpacity="0.13" />
          <stop offset="0.6" stopColor="#EDEAE2" stopOpacity="0.1" />
          <stop offset="1" stopColor="#EDEAE2" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d} stroke="url(#stage-grid-fade)" strokeWidth={1} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
