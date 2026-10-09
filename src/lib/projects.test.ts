import { describe, expect, it } from "vitest";
import { getProjects, parseProject } from "./projects";

const valid = `---
title: Demo
tagline: A demo project
summary: Short summary.
status: live
progress: 1
category: side
year: 2026
role: Solo
stack: [TypeScript]
---

Body text.
`;

describe("parseProject", () => {
  it("parses valid frontmatter and fills defaults", () => {
    const project = parseProject("demo", valid);
    expect(project).toMatchObject({
      slug: "demo",
      title: "Demo",
      district: "auto",
      order: 100,
      links: {},
    });
  });

  it("handles Windows line endings", () => {
    expect(parseProject("demo", valid.replace(/\n/g, "\r\n")).title).toBe("Demo");
  });

  it("names the file and field when frontmatter is invalid", () => {
    const bad = valid.replace("progress: 1", "progress: 2");
    expect(() => parseProject("demo", bad)).toThrow(/demo\.mdx[\s\S]*progress/);
  });

  it("rejects a file without frontmatter", () => {
    expect(() => parseProject("demo", "# Just a heading")).toThrow(/missing the ---/);
  });

  it("rejects slugs that would make bad URLs", () => {
    expect(() => parseProject("My Project", valid)).toThrow(/lowercase/);
  });
});

describe("content/projects", () => {
  it("every project file is valid and slugs are unique", () => {
    const projects = getProjects();
    expect(projects.length).toBeGreaterThan(0);
    expect(new Set(projects.map((p) => p.slug)).size).toBe(projects.length);
  });

  it("is sorted by order", () => {
    const orders = getProjects().map((p) => p.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});
