import type { Project } from "./project-schema";

/** The four corner blocks that hold projects. */
export type DistrictId = "studio" | "estate" | "lab" | "workshop";

export const DISTRICT_NAMES: Record<DistrictId, string> = {
  studio: "Interview Studio",
  estate: "Estate Quarter",
  lab: "Research Lab",
  workshop: "Workshop Row",
};

/** What the 3D city needs to know about a project (serialisable, no MDX). */
export type CityProject = Pick<
  Project,
  "slug" | "title" | "tagline" | "status" | "progress" | "category" | "accent"
> & {
  district: DistrictId;
  /** Where the building's "try it" portal leads, if the project is live. */
  live?: string;
  /** Poster and silent loop for the building's video screen. */
  screen?: { poster: string; board: string };
};

const FLAGSHIP_DISTRICTS: DistrictId[] = ["studio", "estate", "lab"];

/** Plots available on Workshop Row (its 3 × 3 cells). */
export const WORKSHOP_PLOTS = 9;

/**
 * Puts every project in a district. Flagship projects keep the district they
 * ask for when it's free; `auto` (or a taken district) gets the next free
 * flagship district; anything left over, and every side project, goes to a
 * kiosk on Workshop Row, in `order`.
 */
export function assignDistricts(projects: Project[]): CityProject[] {
  const taken = new Set<DistrictId>();
  const out: CityProject[] = [];
  const toCity = (p: Project, district: DistrictId): CityProject => ({
    slug: p.slug,
    title: p.title,
    tagline: p.tagline,
    status: p.status,
    progress: p.progress,
    category: p.category,
    accent: p.accent,
    district,
    live: p.links.live,
    screen: p.video?.board ? { poster: p.video.poster, board: p.video.board } : undefined,
  });

  const flagship = projects.filter((p) => p.category === "flagship");
  // Explicit requests first, so an `auto` project never steals a named district.
  for (const p of flagship) {
    const wanted = p.district;
    if (wanted !== "auto" && wanted !== "workshop" && !taken.has(wanted)) {
      taken.add(wanted);
      out.push(toCity(p, wanted));
    }
  }
  for (const p of flagship) {
    if (out.some((c) => c.slug === p.slug)) continue;
    const free = FLAGSHIP_DISTRICTS.find((d) => !taken.has(d));
    if (free) {
      taken.add(free);
      out.push(toCity(p, free));
    } else {
      out.push(toCity(p, "workshop"));
    }
  }
  for (const p of projects.filter((p) => p.category === "side")) out.push(toCity(p, "workshop"));

  // Keep the original project order.
  const order = new Map(projects.map((p, i) => [p.slug, i]));
  return out.sort((a, b) => order.get(a.slug)! - order.get(b.slug)!);
}
