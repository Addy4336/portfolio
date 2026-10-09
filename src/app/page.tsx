import Link from "next/link";
import { site } from "@content/site";
import { Nav } from "@/components/Nav";
import { getProjects } from "@/lib/projects";
import { statusLabel, type Project } from "@/lib/project-schema";
import { About, type Readout } from "@/sections/About";
import { Hero } from "@/sections/Hero";
import { Pipeline } from "@/sections/Pipeline";

/** HQ readouts for the About section, derived from the project files. */
function readoutsFor(projects: Project[]): Readout[] {
  const titles = (status: Project["status"]) =>
    projects.filter((p) => p.status === status).map((p) => p.title).join(", ");
  const rows: Readout[] = [
    { label: "Focus", value: site.focus.join(" · ") },
    { label: "Live", value: titles("live") },
    { label: "Building", value: titles("building") },
    { label: "Next", value: titles("research") },
  ];
  return rows.filter((r) => r.value);
}

export default function Home() {
  const projects = getProjects();
  return (
    <>
      <Nav />
      <main>
        <Hero projects={projects} />
        <About story={site.story} readouts={readoutsFor(projects)} />
        <Pipeline stages={site.pipeline} toolbox={site.toolbox} />

        {/* Placeholder sections: built out in sections 4–6. */}

        <section id="work" className="px-4 py-32 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-2xl">Work</h2>
            <ul className="mt-6 max-w-3xl divide-y divide-line border-y border-line">
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link href={`/work/${p.slug}/`} className="flex items-baseline justify-between gap-4 py-4">
                    <span className="font-display">{p.title}</span>
                    <span className="font-mono text-xs text-paper-dim">{statusLabel[p.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
