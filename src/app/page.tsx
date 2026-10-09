import { site } from "@content/site";
import { assignDistricts } from "@/lib/districts";
import { getProjects } from "@/lib/projects";
import type { Project } from "@/lib/project-schema";
import { Contact } from "@/sections/Contact";
import { OffClock } from "@/sections/OffClock";
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
    <main>
      <Hero projects={projects} />
      <About story={site.story} readouts={readoutsFor(projects)} />
      <Pipeline stages={site.pipeline} toolbox={site.toolbox} />
      <Work projects={projects} city={assignDistricts(projects)} />
      <OffClock items={site.offClock} />
      <Contact
        name={site.name}
        availability={site.availability}
        email={site.email}
        resume={site.resume}
        links={site.links}
      />
    </main>
  );
}
