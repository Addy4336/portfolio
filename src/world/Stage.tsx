"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { detectTier, type TierResult } from "@/lib/tier";

// The whole 3D stack (three, R3F, drei, postprocessing) lives behind this
// import, so it is never part of the first page load.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

function whenIdle(cb: () => void) {
  const run = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(cb, { timeout: 1500 });
    } else {
      setTimeout(cb, 200);
    }
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
}

/**
 * Fixed, full-screen layer behind the page. The CSS backdrop shows instantly
 * (and is all tier-0 visitors get); the WebGL city fades in over it once the
 * page is idle and the device can handle it.
 */
export function Stage() {
  const [tier, setTier] = useState<TierResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    whenIdle(() => {
      detectTier().then((result) => {
        if (cancelled) return;
        document.documentElement.dataset.tier = String(result.tier);
        setTier(result);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div aria-hidden="true" className="stage">
      <div className="stage-backdrop" />
      {tier && tier.tier !== 0 && (
        <div className="stage-canvas" data-ready={ready}>
          <Scene tier={tier.tier} isMobile={tier.isMobile} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
