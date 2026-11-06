/**
 * The Research Lab's "as of" demo: which date the city is asking about, and
 * therefore which version of a rule is in force. A plain mutable object, read
 * every frame by the timeline, the rule documents and the answer card.
 *
 * The rule is real, from PolicyDrift's benchmark (data/facts.yaml,
 * svanidhi-first-loan): the first loan to a street vendor under PM SVANidhi.
 */
export const RULE = {
  scheme: "PM SVANidhi",
  question: "Maximum first loan to a street vendor?",
  v1: { label: "v1", value: "₹10,000", from: dec(2022, 4, 27), until: "26 Aug 2025" },
  v2: { label: "v2", value: "₹15,000", from: dec(2025, 8, 27) },
};

/** The timeline's ends, as decimal years. */
export const TIMELINE_START = 2022;
export const TIMELINE_END = 2027;

/** Today on the timeline (the demo's "now"). */
export const TODAY = dec(2026, 11, 6);

export const lab = {
  /** The date being asked about, as a decimal year. */
  asOf: dec(2024, 3, 12),
  /** While a visitor's choice holds, the sweep pauses until this clock time. */
  holdUntil: 0,
  /** Where a visitor's click is sending the date. */
  target: null as number | null,
};

/** Fired on window when a visitor asks for the other side of the rule change. */
export const LAB_ASOF_EVENT = "lab:asof";

/** Which version of the rule is in force on `asOf`. */
export function versionOn(asOf: number): "v1" | "v2" {
  return asOf >= RULE.v2.from ? "v2" : "v1";
}

/** A calendar date as a decimal year (good enough for a timeline). */
export function dec(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return year + (Date.UTC(year, month - 1, day) - start) / (end - start);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A decimal year as "12 Mar 2024". */
export function formatDate(asOf: number): string {
  const year = Math.floor(asOf);
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  // round to the nearest day so floating point never lands a millisecond early
  const d = new Date(Math.round((start + (asOf - year) * (end - start)) / 86_400_000) * 86_400_000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
