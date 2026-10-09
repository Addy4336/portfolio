/**
 * The city plan, generated deterministically from a seed so it looks the same
 * on every visit and every device.
 *
 * Grid: 13 × 13 cells of 1 unit, centred on the origin (cells −6…6).
 * Streets run along lines −6, −2, 2 and 6 in both directions, leaving a 3 × 3
 * arrangement of 3 × 3-cell blocks. The centre block is the HQ plaza; the
 * corner blocks are project districts; the edge-middle blocks are filler for
 * now and become pipeline stations later.
 */

export const STREETS = [-6, -2, 2, 6] as const;
export const ISLAND_HALF = 7.4;

export type BlockId = "hq" | "studio" | "estate" | "lab" | "workshop" | "north" | "east" | "south" | "west";

/** Block centres in block coordinates (−1, 0, 1) → id. z− is "north" (far from the default camera). */
export const BLOCKS: Record<BlockId, [number, number]> = {
  hq: [0, 0],
  estate: [-1, -1],
  studio: [1, -1],
  workshop: [-1, 1],
  lab: [1, 1],
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};

export type Building = {
  x: number;
  /** Base height, for stacked tiers. Defaults to 0 (street level). */
  y?: number;
  z: number;
  w: number;
  d: number;
  h: number;
  seed: number;
  block: BlockId;
  /** 0–1, how far from the centre: drives the boot-sequence stagger. */
  delay: number;
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function blockCentre(id: BlockId): [number, number] {
  const [bx, bz] = BLOCKS[id];
  return [bx * 4, bz * 4];
}

/** The edge-middle blocks hold the pipeline stations (see route.ts). */
export const STATION_BLOCKS: BlockId[] = ["north", "east", "south", "west"];

/**
 * Generic buildings for every block except the ones listed in `reserved`.
 * Station blocks keep only their four corner cells, leaving a plus-shaped
 * plaza for the station.
 */
export function generateBuildings(reserved: BlockId[] = ["hq"], seed = 7): Building[] {
  const rand = mulberry32(seed);
  const out: Building[] = [];
  const maxDist = Math.hypot(5, 5);
  for (const [id, [bx, bz]] of Object.entries(BLOCKS) as [BlockId, [number, number]][]) {
    if (reserved.includes(id)) continue;
    for (let cx = -1; cx <= 1; cx++) {
      for (let cz = -1; cz <= 1; cz++) {
        const empty = rand() < 0.12; // the odd empty lot keeps it from looking like a grid
        if (empty || (STATION_BLOCKS.includes(id) && (cx === 0 || cz === 0))) continue;
        const x = bx * 4 + cx;
        const z = bz * 4 + cz;
        const dist = Math.hypot(x, z);
        // Taller towards the centre, with a long tail of low buildings.
        const centrality = 1 - dist / maxDist;
        const h = 0.45 + Math.pow(rand(), 1.6) * (0.8 + centrality * 2.4);
        const w = 0.62 + rand() * 0.22;
        const d = 0.62 + rand() * 0.22;
        out.push({ x, z, w, d, h, seed: rand(), block: id, delay: dist / maxDist });
        // Rooftop plant rooms and tanks break up the flat roofs.
        if (rand() < 0.55) {
          const ox = (rand() - 0.5) * w * 0.4;
          const oz = (rand() - 0.5) * d * 0.4;
          out.push({
            x: x + ox,
            y: h,
            z: z + oz,
            w: w * (0.25 + rand() * 0.2),
            d: d * (0.25 + rand() * 0.2),
            h: 0.08 + rand() * 0.16,
            seed: rand(),
            block: id,
            delay: 2, // "rooftop": appears after the building has grown
          });
        }
      }
    }
  }
  return out;
}

/** Street intersections, and which neighbours each one connects to. */
export function streetGraph() {
  const nodes: [number, number][] = [];
  for (const x of STREETS) for (const z of STREETS) nodes.push([x, z]);
  const index = (x: number, z: number) => nodes.findIndex(([nx, nz]) => nx === x && nz === z);
  const edges: number[][] = nodes.map(([x, z]) => {
    const i = STREETS.indexOf(x as (typeof STREETS)[number]);
    const j = STREETS.indexOf(z as (typeof STREETS)[number]);
    const n: number[] = [];
    if (i > 0) n.push(index(STREETS[i - 1], z));
    if (i < STREETS.length - 1) n.push(index(STREETS[i + 1], z));
    if (j > 0) n.push(index(x, STREETS[j - 1]));
    if (j < STREETS.length - 1) n.push(index(x, STREETS[j + 1]));
    return n;
  });
  return { nodes, edges };
}

export { mulberry32 };
