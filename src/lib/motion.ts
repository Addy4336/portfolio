"use client";

import type { gsap as GSAP } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

export type Motion = { gsap: typeof GSAP; ScrollTrigger: typeof ScrollTriggerType };

let pending: Promise<Motion> | null = null;

/**
 * GSAP and ScrollTrigger, loaded on demand so they never block first paint.
 * Every component that animates calls this instead of importing gsap
 * directly; the first call downloads it, later calls share the same promise.
 * Page content must look complete without it.
 */
export function loadMotion(): Promise<Motion> {
  pending ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
    ([{ gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger);
      return { gsap, ScrollTrigger };
    },
  );
  return pending;
}
