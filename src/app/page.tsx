import { site } from "@content/site";
import { Nav } from "@/components/Nav";
import { assignDistricts } from "@/lib/districts";
import { getProjects } from "@/lib/projects";
import type { Project } from "@/lib/project-schema";
import { Work } from "@/sections/Work";
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
        <Work projects={projects} city={assignDistricts(projects)} />
        {/* Off the clock + Contact land in section 6. */}
        <div className="h-[40svh]" />
      </main>
    </>
  );
}
