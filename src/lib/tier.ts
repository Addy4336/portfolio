"use client";

/**
 * Device tiers decide how much of the 3D city a visitor gets.
 *   0  no WebGL at all: static backdrop (no WebGL, reduced motion, save-data, very weak GPU)
 *   1  light city: phones and integrated GPUs
 *   2  full city
 *   3  full city plus extras (higher DPR, contact shadows)
 * `?tier=N` in the URL forces a tier, for testing.
 */
export type Tier = 0 | 1 | 2 | 3;

export type TierResult = { tier: Tier; isMobile: boolean; reason: string };

export type Quality = {
  dpr: [number, number];
  agents: number;
  bloom: boolean;
  antialias: boolean;
  shadows: boolean;
};

export const QUALITY: Record<Exclude<Tier, 0>, Quality> = {
  1: { dpr: [1, 1], agents: 24, bloom: false, antialias: false, shadows: false },
  2: { dpr: [1, 1.5], agents: 60, bloom: true, antialias: false, shadows: false },
  3: { dpr: [1, 2], agents: 120, bloom: true, antialias: true, shadows: true },
};

function clampTier(n: number): Tier {
  return Math.max(0, Math.min(3, Math.round(n))) as Tier;
}

function hasWebGL2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export async function detectTier(): Promise<TierResult> {
  const forced = new URLSearchParams(window.location.search).get("tier");
  const isMobile = window.matchMedia("(pointer: coarse)").matches;
  if (forced !== null && /^[0-3]$/.test(forced)) {
    return { tier: clampTier(Number(forced)), isMobile, reason: "forced by ?tier" };
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { tier: 0, isMobile, reason: "prefers-reduced-motion" };
  }
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection;
  if (connection?.saveData) return { tier: 0, isMobile, reason: "save-data" };
  if (!hasWebGL2()) return { tier: 0, isMobile, reason: "no WebGL2" };

  let gpuTier = 2;
  let gpuMobile = isMobile;
  try {
    const { getGPUTier } = await import("@pmndrs/detect-gpu");
    const gpu = await getGPUTier({ benchmarksURL: "/benchmarks" });
    gpuTier = gpu.tier;
    gpuMobile = gpu.isMobile ?? isMobile;
  } catch {
    // Benchmarks unavailable: fall through with a cautious default.
  }

  let tier = clampTier(gpuTier);
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (gpuMobile || (memory !== undefined && memory <= 4) || cores <= 4) {
    tier = Math.min(tier, 1) as Tier;
  }
  return { tier, isMobile: gpuMobile, reason: `gpu tier ${gpuTier}` };
}
