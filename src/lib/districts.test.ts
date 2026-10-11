import { describe, expect, it } from "vitest";
import { assignDistricts } from "./districts";
import type { Project } from "./project-schema";

const base: Omit<Project, "slug" | "category" | "district" | "order"> = {
  title: "T",
  tagline: "t",
  summary: "s",
  status: "live",
  progress: 1,
  year: 2026,
  role: "r",
  stack: ["x"],
  links: {},
};
const p = (slug: string, category: Project["category"], district: Project["district"], order: number): Project => ({
  ...base,
  slug,
  category,
  district,
  order,
});

describe("assignDistricts", () => {
  it("honours explicit districts and fills auto ones with what's free", () => {
    const out = assignDistricts([
      p("a", "flagship", "auto", 1),
      p("b", "flagship", "studio", 2),
      p("c", "flagship", "auto", 3),
    ]);
    expect(out.map((c) => [c.slug, c.district])).toEqual([
      ["a", "estate"],
      ["b", "studio"],
      ["c", "lab"],
    ]);
  });

  it("sends side projects and overflow flagships to the workshop", () => {
    const out = assignDistricts([
      p("a", "flagship", "studio", 1),
      p("b", "flagship", "studio", 2),
      p("c", "flagship", "auto", 3),
      p("d", "flagship", "auto", 4),
      p("e", "side", "auto", 5),
    ]);
    expect(Object.fromEntries(out.map((c) => [c.slug, c.district]))).toEqual({
      a: "studio",
      b: "estate",
      c: "lab",
      d: "workshop",
      e: "workshop",
    });
  });

  it("only exposes serialisable city fields", () => {
    const [c] = assignDistricts([p("a", "side", "auto", 1)]);
    expect(Object.keys(c).sort()).toEqual(
      ["accent", "category", "district", "live", "progress", "screen", "slug", "status", "tagline", "title"].sort(),
    );
  });

  it("hands a project's live link and video screen to the city", () => {
    const withMedia: Project = {
      ...p("iq", "flagship", "studio", 1),
      links: { live: "https://example.com/" },
      video: { src: "/v.mp4", poster: "/p.jpg", board: "/b.mp4" },
    };
    const [c] = assignDistricts([withMedia]);
    expect(c.live).toBe("https://example.com/");
    expect(c.screen).toEqual({ poster: "/p.jpg", board: "/b.mp4" });
    // a clip without a board loop gets no screen
    const [d] = assignDistricts([{ ...withMedia, video: { src: "/v.mp4", poster: "/p.jpg" } }]);
    expect(d.screen).toBeUndefined();
  });
});
