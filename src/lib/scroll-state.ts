/**
 * Shared, mutable scroll state. The 3D scene reads it every frame inside
 * useFrame, so it is a plain object rather than React state: updating it must
 * never trigger a re-render.
 */
export const scrollState = {
  /** 0 at the top of the page, 1 at the bottom. */
  progress: 0,
  /** Lenis velocity, in px per frame. */
  velocity: 0,
};
