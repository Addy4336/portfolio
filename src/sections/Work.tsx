import { ArrowUpRight, CodeXml, Globe } from "lucide-react";
import Link from "next/link";
import { DISTRICT_NAMES, WORKSHOP_PLOTS, type CityProject, type DistrictId } from "@/lib/districts";
import { statusLabel, type Project } from "@/lib/project-schema";

type Props = { projects: Project[]; city: CityProject[] };

// Text sits opposite the district in each camera shot (see cameraKeys.ts).
const TEXT_SIDE: Record<DistrictId, "left" | "right"> = {
  studio: "left",
  estate: "right",
  lab: "left",
  workshop: "right",
};

const DISTRICT_ORDER: DistrictId[] = ["studio", "estate", "lab"];

function StatusChip({ project }: { project: Project }) {
  const tone =
    project.status === "live"
      ? "bg-signal text-void"
      : project.status === "building"
        ? "bg-violet/25 text-paper"
        : "bg-paper/10 text-paper";
  return (
    <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${tone}`}>
      {project.status === "live" && <span aria-hidden>● </span>}
      {statusLabel[project.status]}
    </span>
  );
}

function ProjectPanel({ project, index, district }: { project: Project; index: number; district: DistrictId }) {
  return (
    <article className="rounded-2xl border border-line bg-void/90 p-5 sm:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper-dim">
        District 0{index + 1} · {DISTRICT_NAMES[district]}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusChip project={project} />
        <span className="font-mono text-xs text-paper-dim">{project.year}</span>
      </div>
      <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{project.title}</h3>
      <p className="mt-2 text-lg leading-snug text-paper">{project.tagline}</p>
      <p className="mt-3 hidden leading-relaxed text-paper-dim sm:block">{project.summary}</p>
      <p className="mt-3 text-sm text-paper-dim">
        <span className="text-paper">Role</span> · {project.role}
      </p>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Stack">
        {project.stack.map((s) => (
          <li key={s} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-paper-dim">
            {s}
          </li>
        ))}
      </ul>
      {project.progress < 1 && (
        <div className="mt-5">
          <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-paper-dim">
            <span>Construction</span>
            <span>{Math.round(project.progress * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-paper/10">
            <div className="h-full rounded-full bg-signal" style={{ width: `${Math.max(3, project.progress * 100)}%` }} />
          </div>
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/work/${project.slug}/`}
          className="group inline-flex items-center gap-2 rounded-full bg-signal px-4 py-2 text-sm font-medium text-void transition-transform hover:-translate-y-0.5"
        >
          {project.status === "research" || project.status === "idea" ? "Read the notes" : "Read the case study"}
          <ArrowUpRight size={15} aria-hidden />
        </Link>
        {project.links.live && (
          <a
            href={project.links.live}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-paper/40"
          >
            <Globe size={15} aria-hidden /> Live
          </a>
        )}
        {project.links.github && (
          <a
            href={project.links.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-paper/40"
          >
            <CodeXml size={15} aria-hidden /> Code
          </a>
        )}
      </div>
    </article>
  );
}

function DistrictSection({ id, children }: { id: DistrictId; children: React.ReactNode }) {
  const right = TEXT_SIDE[id] === "right";
  return (
    <section data-cam={`district-${id}`} data-cam-hold="0.7" className="relative min-h-[160svh]">
      <div className="sticky top-0 flex min-h-svh items-end px-4 pb-8 pt-24 sm:px-8 md:items-center md:pb-0">
        <div className="mx-auto w-full max-w-7xl">
          <div className={`md:w-[min(32rem,44vw)] ${right ? "md:ml-auto" : ""}`}>{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Work: one pinned chapter per district, the camera flying to each in turn. */
export function Work({ projects, city }: Props) {
  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  const inDistrict = (d: DistrictId) =>
    city.filter((c) => c.district === d).map((c) => bySlug.get(c.slug)!);
  const flagships = DISTRICT_ORDER.flatMap((d) => inDistrict(d).map((p) => ({ p, d })));
  const side = inDistrict("workshop");
  const free = Math.max(0, WORKSHOP_PLOTS - side.length);

  return (
    <div id="work">
      <div className="px-4 pb-8 pt-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">Districts · work</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Every project gets its own corner of the city.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-paper-dim">
            The city grows with the work: finished projects stand complete, the ones in progress
            are still under scaffolding, and new side projects open a kiosk on Workshop Row.
          </p>
        </div>
      </div>

      {flagships.map(({ p, d }, i) => (
        <DistrictSection key={p.slug} id={d}>
          <ProjectPanel project={p} index={i} district={d} />
        </DistrictSection>
      ))}

      <DistrictSection id="workshop">
        <div className="rounded-2xl border border-line bg-void/90 p-5 sm:p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper-dim">
            District 0{flagships.length + 1} · {DISTRICT_NAMES.workshop}
          </p>
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight">Side projects</h3>
          {side.length ? (
            <ul className="mt-5 space-y-2">
              {side.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/work/${p.slug}/`}
                    className="flex items-baseline justify-between gap-4 rounded-xl border border-line px-4 py-3 hover:border-paper/30"
                  >
                    <span>
                      <span className="font-display">{p.title}</span>
                      <span className="mt-0.5 block text-sm text-paper-dim">{p.tagline}</span>
                    </span>
                    <span className="font-mono text-[11px] uppercase text-paper-dim">{statusLabel[p.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 leading-relaxed text-paper-dim">
              Smaller builds open a kiosk here as they ship. The first ones arrive this month.
            </p>
          )}
          <p className="mt-5 font-mono text-xs text-paper-dim">
            <span className="text-signal">●</span> {free} plot{free === 1 ? "" : "s"} free
          </p>
        </div>
      </DistrictSection>
    </div>
  );
}
