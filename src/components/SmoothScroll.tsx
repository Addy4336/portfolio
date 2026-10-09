"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import { loadMotion } from "@/lib/motion";
import { scrollState } from "@/lib/scroll-state";

let lenis: Lenis | null = null;

/** Scrolls to an element or y offset, smoothly when Lenis is running. */
export function scrollToTarget(target: string | number | HTMLElement) {
  if (lenis) {
    lenis.scrollTo(target);
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target });
    return;
  }
  const el = typeof target === "string" ? document.querySelector(target) : target;
  el?.scrollIntoView();
}

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger and the 3D
 * scene read the same scroll position on the same frame. Both libraries load
 * after first paint; until then, and for people who prefer reduced motion,
 * the page scrolls natively.
 */
export function SmoothScroll() {
  useEffect(() => {
    const updateFromNative = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollState.progress = max > 0 ? window.scrollY / max : 0;
    };
    window.addEventListener("scroll", updateFromNative, { passive: true });
    updateFromNative();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => window.removeEventListener("scroll", updateFromNative);
    }

    let cancelled = false;
    let cleanup = () => {};

    Promise.all([loadMotion(), import("lenis")]).then(
      ([{ gsap, ScrollTrigger }, { default: LenisCtor }]) => {
        if (cancelled) return;
        window.removeEventListener("scroll", updateFromNative);
        const instance = new LenisCtor({ autoRaf: false, anchors: true, lerp: 0.1 });
        lenis = instance;
        const off = instance.on("scroll", (l) => {
          scrollState.progress = l.progress;
          scrollState.velocity = l.velocity;
          ScrollTrigger.update();
        });
        const tick = (time: number) => instance.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        cleanup = () => {
          off();
          gsap.ticker.remove(tick);
          instance.destroy();
          lenis = null;
        };
      },
    );

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", updateFromNative);
      cleanup();
    };
  }, []);

  return null;
}
