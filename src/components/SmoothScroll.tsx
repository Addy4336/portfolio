"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import { scrollState } from "@/lib/scroll-state";

let lenis: Lenis | null = null;

/**
 * Scrolls to an element or y offset, smoothly when Lenis is running.
 * `duration` (seconds) makes a slow, linear glide, e.g. to "play" a section.
 */
export function scrollToTarget(
  target: string | number | HTMLElement,
  options: { duration?: number; linear?: boolean } = {},
) {
  if (lenis) {
    lenis.scrollTo(target, {
      duration: options.duration,
      easing: options.linear ? (t: number) => t : undefined,
      lock: options.duration !== undefined,
    });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: options.duration ? "smooth" : "auto" });
    return;
  }
  const el = typeof target === "string" ? document.querySelector(target) : target;
  el?.scrollIntoView();
}

/**
 * Lenis smooth scrolling, loaded after first paint and running on its own
 * animation loop. Every scroll effect on the site reads the native scroll
 * position, so the page works the same before Lenis arrives and for people
 * who prefer reduced motion (who never get it).
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
    import("lenis").then(({ default: LenisCtor }) => {
      if (cancelled) return;
      window.removeEventListener("scroll", updateFromNative);
      const instance = new LenisCtor({ autoRaf: true, anchors: true, lerp: 0.1 });
      lenis = instance;
      const off = instance.on("scroll", (l) => {
        scrollState.progress = l.progress;
        scrollState.velocity = l.velocity;
      });
      cleanup = () => {
        off();
        instance.destroy();
        lenis = null;
      };
    });

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", updateFromNative);
      cleanup();
    };
  }, []);

  return null;
}
