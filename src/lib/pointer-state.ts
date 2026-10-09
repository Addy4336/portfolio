"use client";

/**
 * Cursor position in normalised viewport coordinates (−1…1), shared by the
 * camera rig and the character. The canvas sits behind the page with
 * pointer-events disabled, so R3F's own pointer never updates; one window
 * listener feeds everything instead.
 */
export const pointerState = { x: 0, y: 0, active: false };

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
    },
    { passive: true },
  );
}
