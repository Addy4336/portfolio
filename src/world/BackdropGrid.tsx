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
      <path d={d} stroke="#EDEAE2" strokeOpacity={0.12} strokeWidth={1} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
