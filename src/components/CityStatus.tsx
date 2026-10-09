"use client";

import { useEffect, useState } from "react";
import {
  BOOT_SECONDS,
  CITY_READY_EVENT,
  CITY_TIER_EVENT,
  type CityReadyDetail,
  type CityTierDetail,
} from "@/world/boot";

type Props = { districts: number; live: number; availability: string };

const pad = (n: number) => String(n).padStart(3, "0");

/**
 * The hero's HUD. Counts agents up while the city boots, so the number and
 * the 3D boot sequence finish together.
 */
export function CityStatus({ districts, live, availability }: Props) {
  const [agents, setAgents] = useState<string>("connecting…");

  useEffect(() => {
    let raf = 0;
    const onTier = (e: Event) => {
      if ((e as CustomEvent<CityTierDetail>).detail.tier === 0) setAgents("static view");
    };
    const onReady = (e: Event) => {
      const total = (e as CustomEvent<CityReadyDetail>).detail.agents;
      const start = performance.now() + 250;
      const step = (now: number) => {
        const p = Math.min(1, Math.max(0, (now - start) / (BOOT_SECONDS * 1000)));
        setAgents(p < 1 ? `booting ${pad(Math.round(p * total))}` : `${pad(total)} online`);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    window.addEventListener(CITY_TIER_EVENT, onTier);
    window.addEventListener(CITY_READY_EVENT, onReady);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(CITY_TIER_EVENT, onTier);
      window.removeEventListener(CITY_READY_EVENT, onReady);
    };
  }, []);

  const rows: [string, string][] = [
    ["agents", agents],
    ["districts", pad(districts)],
    ["live", pad(live)],
  ];

  return (
    <div className="font-mono text-xs">
      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt className="text-paper-dim">{label}</dt>
            <dd className="tabular-nums text-paper">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 flex items-center gap-2 text-paper-dim">
        <span className="size-1.5 rounded-full bg-signal" aria-hidden />
        {availability}
      </p>
    </div>
  );
}
