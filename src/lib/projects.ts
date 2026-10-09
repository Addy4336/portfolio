import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { extractFrontmatter, projectSchema, type Project } from "./project-schema";

// Server-only: runs at build time to read content/projects/*.mdx.
const PROJECTS_DIR = join(process.cwd(), "content", "projects");
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseProject(slug: string, source: string): Project {
  if (!SLUG.test(slug)) {
    throw new Error(
      `content/projects/${slug}.mdx: file names must be lowercase words joined by dashes`,
    );
  }
  const header = extractFrontmatter(source);
  if (header === null) {
    throw new Error(`content/projects/${slug}.mdx: missing the --- frontmatter header`);
  }
  const result = projectSchema.safeParse(parse(header));
  if (!result.success) {
    throw new Error(
      `content/projects/${slug}.mdx has invalid frontmatter:\n${z.prettifyError(result.error)}`,
    );
  }
  return { ...result.data, slug };
}

let cache: Project[] | null = null;

/** All projects, sorted by `order`, then newest first. */
export function getProjects(): Project[] {
  if (cache) return cache;
  cache = readdirSync(PROJECTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.slice(0, -".mdx".length);
      return parseProject(slug, readFileSync(join(PROJECTS_DIR, file), "utf8"));
    })
    .sort((a, b) => a.order - b.order || b.year - a.year);
  return cache;
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((p) => p.slug === slug);
}
