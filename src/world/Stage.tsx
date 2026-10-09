"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { detectTier, type TierResult } from "@/lib/tier";
import { BackdropGrid } from "./BackdropGrid";
import { CITY_STANDBY_EVENT, CITY_TIER_EVENT, type CityTierDetail } from "./boot";

// The whole 3D stack (three, R3F, drei, postprocessing) lives behind this one
// import, so it is never part of the first page load. Both the early prefetch
// and the lazy component go through it, so the bundler emits a single chunk.
const loadScene = () => import("./Scene");
const Scene = lazy(loadScene);

function onIdle(cb: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(cb, { timeout: 1500 });
  } else {
    setTimeout(cb, 200);
  }
}

/**
 * Runs `cb` once the page has loaded, has actually painted, and the main
 * thread is idle. Waiting for the first paint matters: on a fast connection
 * the page can hydrate before anything is on screen, and creating a WebGL
 * context that early holds up the first frame.
 */
function afterFirstPaint(cb: () => void) {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    onIdle(cb);
  };
  const waitForPaint = () => {
    if (performance.getEntriesByName("first-contentful-paint").length) return go();
    try {
      const observer = new PerformanceObserver((list) => {
        if (list.getEntriesByName("first-contentful-paint").length) {
          observer.disconnect();
          go();
        }
      });
      observer.observe({ type: "paint", buffered: true });
    } catch {
      go();
    }
    // Background tabs may never paint; don't wait forever.
    setTimeout(go, 3000);
  };
  if (document.readyState === "complete") waitForPaint();
  else window.addEventListener("load", waitForPaint, { once: true });
}

/**
 * Fixed, full-screen layer behind the page. The CSS backdrop shows instantly
 * (and is all tier-0 visitors get); the WebGL city fades in over it once the
 * page has painted and the device can handle it (on touch devices, after the
 * first interaction).
 */
export function Stage() {
  const [tier, setTier] = useState<TierResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      // Start downloading the 3D chunk while the GPU check runs, unless this
      // visitor will certainly get the static view.
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const forcedStatic = new URLSearchParams(window.location.search).get("tier") === "0";
      if (!saveData && !reduced && !forcedStatic) void loadScene();

      detectTier().then((result) => {
        if (cancelled) return;
        document.documentElement.dataset.tier = String(result.tier);
        window.dispatchEvent(
          new CustomEvent<CityTierDetail>(CITY_TIER_EVENT, { detail: { tier: result.tier } }),
        );
        setTier(result);
      });
    };

    // Phones and tablets start the city on the visitor's first scroll, touch
    // or key press: the hero reads instantly and the 3D work never competes
    // with the first paint on a slow CPU. Desktops start it right after paint.
    const touchFirst = window.matchMedia("(pointer: coarse)").matches;
    const forced = new URLSearchParams(window.location.search).has("tier");
    const intents = ["touchstart", "pointerdown", "wheel", "scroll", "keydown"] as const;
    const onIntent = () => {
      intents.forEach((type) => window.removeEventListener(type, onIntent));
      window.dispatchEvent(new CustomEvent(CITY_STANDBY_EVENT, { detail: { waking: true } }));
      start();
    };
    afterFirstPaint(() => {
      if (cancelled) return;
      if (!touchFirst || forced) start();
      else {
        intents.forEach((type) => window.addEventListener(type, onIntent, { passive: true }));
        window.dispatchEvent(new Event(CITY_STANDBY_EVENT));
      }
    });
    return () => {
      cancelled = true;
      intents.forEach((type) => window.removeEventListener(type, onIntent));
    };
  }, []);

  return (
    <div aria-hidden="true" className="stage">
      <div className="stage-backdrop">
        <BackdropGrid />
      </div>
      {tier && tier.tier !== 0 && (
        <div className="stage-canvas" data-ready={ready}>
          <Suspense fallback={null}>
            <Scene tier={tier.tier} isMobile={tier.isMobile} onReady={() => setReady(true)} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
