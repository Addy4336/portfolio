/**
 * Shared clock for the boot sequence (buildings compiling up from the grid).
 * `value` goes 0 → 1 over BOOT_SECONDS after the first rendered frame and is
 * read by every boot-aware material in useFrame.
 */
export const BOOT_SECONDS = 1.6;

export const boot = {
  startedAt: -1,
  value: 0,
};

/** Fired on window once the first 3D frame has rendered. */
export const CITY_READY_EVENT = "city:ready";
export type CityReadyDetail = { agents: number };

/** Fired on window when the city is waiting for a first touch/scroll (touch devices). */
export const CITY_STANDBY_EVENT = "city:standby";

/** Fired on window once the device tier is known (0 means no 3D will load). */
export const CITY_TIER_EVENT = "city:tier";
export type CityTierDetail = { tier: number };
