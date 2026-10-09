import type { MetadataRoute } from "next";
import { site } from "@content/site";
import { getProjects } from "@/lib/projects";

export const dynamic = "force-static";

/** Home plus every case study. Empty until `site.url` is set (URLs must be absolute). */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!site.url) return [];
  const base = site.url.replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    ...getProjects().map((p) => ({
      url: `${base}/work/${p.slug}/`,
      changeFrequency: "monthly" as const,
      priority: p.category === "flagship" ? 0.8 : 0.6,
    })),
  ];
}
