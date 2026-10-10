/**
 * The little label that follows the cursor over a building in the 3D city.
 * CityPicker (inside the canvas) fills it in and moves it directly, so
 * hovering never causes a React render. Decorative: keyboard and screen
 * reader users have the nav and the page's own links.
 */
export function CityHover() {
  return (
    <div
      id="city-hover"
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-50 max-w-52 rounded-xl border border-signal/40 bg-void/90 px-3 py-2 opacity-0 shadow-[0_0_24px_-6px_rgba(200,245,58,0.5)] transition-opacity duration-150"
    >
      <span data-t className="block font-display text-sm font-semibold text-paper" />
      <span data-h className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-signal" />
    </div>
  );
}
