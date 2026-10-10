"use client";

/**
 * Cursor position in normalised viewport coordinates (−1…1), shared by the
 * camera rig, the character and the city's hover picking. The canvas sits
 * behind the page with pointer-events disabled, so R3F's own pointer never
 * updates; one window listener feeds everything instead.
 *
 * `overCity` is true only while the cursor is over empty page (not text, a
 * panel, a link or a button), i.e. where a click would land on the city.
 */
export const pointerState = { x: 0, y: 0, active: false, overCity: false, fine: false };

const UI_SELECTOR = "a,button,input,textarea,select,summary,article,nav,p,h1,h2,h3,h4,li,dl,figure,pre,[data-ui]";

/** Whether an event target is bare page background, with the city behind it. */
export function isCityTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !target.closest(UI_SELECTOR);
}

let listening = false;

export function listenToPointer() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      pointerState.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerState.y = (e.clientY / window.innerHeight) * 2 - 1;
      pointerState.active = true;
      pointerState.fine = e.pointerType === "mouse";
      pointerState.overCity = isCityTarget(e.target);
    },
    { passive: true },
  );
  // The page moves under a still cursor when you scroll, so what it was over
  // is stale until the next move.
  window.addEventListener("scroll", () => (pointerState.overCity = false), { passive: true });
  document.documentElement.addEventListener("pointerleave", () => (pointerState.overCity = false));
}
