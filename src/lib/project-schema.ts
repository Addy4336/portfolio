import { z } from "zod";

/**
 * The frontmatter every file in content/projects/*.mdx must have.
 * Adding a project = adding one file that satisfies this schema.
 */
export const projectSchema = z.object({
  title: z.string().min(1),
  /** One line, shown on the building's sign and in cards. */
  tagline: z.string().min(1),
  /** Two or three sentences, shown in the district panel on the home page. */
  summary: z.string().min(1),
  status: z.enum(["live", "building", "research", "idea"]),
  /** 0 to 1. Drives how "under construction" the project's building looks. */
  progress: z.number().min(0).max(1),
  /** Flagship projects get their own district; side projects get a kiosk. */
  category: z.enum(["flagship", "side"]),
  /** Which building archetype to use. `auto` picks one from the category. */
  district: z.enum(["studio", "estate", "lab", "workshop", "auto"]).default("auto"),
  year: z.number().int().min(2000).max(2100),
  role: z.string().min(1),
  stack: z.array(z.string().min(1)).min(1),
  links: z
    .object({
      live: z.url().optional(),
      github: z.url().optional(),
      demo: z.url().optional(),
    })
    .default({}),
  /**
   * A demo recording. `src` is the full clip embedded on the case-study page,
   * `poster` its still frame (also used where video can't play). `board` is an
   * optional shorter, smaller silent loop for the screen on the project's
   * building in the 3D city. All paths are under /public.
   */
  video: z
    .object({
      src: z.string().startsWith("/"),
      poster: z.string().startsWith("/"),
      board: z.string().startsWith("/").optional(),
      caption: z.string().optional(),
    })
    .optional(),
  /** Path under /public, e.g. /projects/interviewiq/cover.webp */
  cover: z.string().startsWith("/").optional(),
  /** Optional per-project colour for its sign and highlights. */
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "accent must be a hex colour like #C8F53A")
    .optional(),
  /** Lower comes first. */
  order: z.number().int().default(100),
});

export type ProjectMeta = z.infer<typeof projectSchema>;
export type Project = ProjectMeta & { slug: string };

export const statusLabel: Record<ProjectMeta["status"], string> = {
  live: "Live",
  building: "In progress",
  research: "Research",
  idea: "Coming soon",
};

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Returns the raw YAML header of an MDX source, or null if it has none. */
export function extractFrontmatter(source: string): string | null {
  const match = FRONTMATTER.exec(source);
  return match ? match[1] : null;
}
