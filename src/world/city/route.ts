/**
 * The four pipeline stations and the route the example request takes
 * between them along the inner ring road (streets at ±2 around HQ).
 *
 *   leg 0  listen  arrives from outside the city at the Ear (north)
 *   leg 1  think   Ear → Brain (east)
 *   leg 2  act     Brain → Hands (south) → back to Brain: the agent loop
 *   leg 3  speak   Brain → Voice (west), which sends the answer out as rings
 */
export type StationId = "ear" | "brain" | "hands" | "voice";

export const STATIONS: Record<StationId, [number, number]> = {
  ear: [0, -4],
  brain: [4, 0],
  hands: [0, 4],
  voice: [-4, 0],
};

/** Which station each leg is heading to (the one that lights up). */
export const LEG_STATION: StationId[] = ["ear", "brain", "hands", "voice"];

type P = [number, number];
const LEGS: P[][] = [
  [[0, -7.6], [0, -4]],
  [[0, -4], [0, -2], [2, -2], [2, 0], [4, 0]],
  [[4, 0], [2, 0], [2, 2], [0, 2], [0, 4], [0, 2], [2, 2], [2, 0], [4, 0]],
  [[4, 0], [2, 0], [2, -2], [-2, -2], [-2, 0], [-4, 0]],
];

const lengths = LEGS.map((leg) => {
  const seg = leg.slice(1).map((p, i) => Math.hypot(p[0] - leg[i][0], p[1] - leg[i][1]));
  return { seg, total: seg.reduce((a, b) => a + b, 0) };
});

/** Point along leg `leg` at fraction `t` (0…1) of its length. */
export function pointOnLeg(leg: number, t: number, out: P = [0, 0]): P {
  const path = LEGS[leg];
  const { seg, total } = lengths[leg];
  let d = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const f = seg[i] === 0 ? 0 : Math.min(1, d / seg[i]);
      out[0] = path[i][0] + (path[i + 1][0] - path[i][0]) * f;
      out[1] = path[i][1] + (path[i + 1][1] - path[i][1]) * f;
      return out;
    }
    d -= seg[i];
  }
  return out;
}

/**
 * Converts overall progress (0…4) into a position: each leg spends its first
 * 70% travelling and the rest dwelling at the station ("processing").
 */
export function packetAt(progress: number, out: P = [0, 0]) {
  const p = Math.min(3.9999, Math.max(0, progress));
  const leg = Math.floor(p);
  const local = p - leg;
  pointOnLeg(leg, Math.min(1, local / 0.7), out);
  return { leg, dwelling: local > 0.7 };
}
