import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, CodeXml, Globe } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoVideo } from "@/components/DemoVideo";
import { assignDistricts, DISTRICT_NAMES } from "@/lib/districts";
import { getProject, getProjects } from "@/lib/projects";
import { statusLabel } from "@/lib/project-schema";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  return project ? { title: project.title, description: `${project.tagline}. ${project.summary}` } : {};
}

/**
 * A case study. The 3D city stays mounted behind it: the camera settles on
 * this project's district (data-cam="work-<district>"), so arriving from
 * the Work section is one continuous move.
 */
export default async function WorkPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const { default: Body } = await import(`@content/projects/${slug}.mdx`);

  const all = getProjects();
  const district = assignDistricts(all).find((c) => c.slug === slug)!.district;
  const next = all[(all.findIndex((p) => p.slug === slug) + 1) % all.length];

  const facts: [string, string][] = [
    ["Status", statusLabel[project.status]],
    ["Year", String(project.year)],
    ["Role", project.role],
    ["District", DISTRICT_NAMES[district]],
  ];

  return (
    <main className="work-page">
      <section
        data-cam={`work-${district}`}
        className="relative flex min-h-[88svh] flex-col justify-end px-4 pb-12 pt-28 sm:px-8"
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-2xl">
            <Link
              href={`/#district-${district}`}
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-signal hover:underline"
            >
              <ArrowLeft size={14} aria-hidden /> Back to the city
            </Link>
            <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight sm:text-7xl">{project.title}</h1>
            <p className="mt-4 max-w-xl text-xl leading-snug text-paper sm:text-2xl">{project.tagline}</p>
            <dl className="mt-8 grid max-w-xl grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-5 text-sm">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper-dim">{label}</dt>
                  <dd className="mt-0.5 text-paper">{value}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-5 flex max-w-xl flex-wrap gap-1.5" aria-label="Stack">
              {project.stack.map((s) => (
                <li key={s} className="rounded-full border border-line bg-void/70 px-2.5 py-0.5 font-mono text-[11px] text-paper-dim">
                  {s}
                </li>
              ))}
            </ul>
            {(project.links.live || project.links.github || project.links.demo) && (
              <div className="mt-6 flex flex-wrap gap-2">
                {project.links.live && (
                  <a href={project.links.live} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-signal px-4 py-2 text-sm font-medium text-void">
                    <Globe size={15} aria-hidden /> Try it live
                  </a>
                )}
                {project.links.demo && (
                  <a href={project.links.demo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-paper/40">
                    Watch the demo
                  </a>
                )}
                {project.links.github && (
                  <a href={project.links.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-paper/40">
                    <CodeXml size={15} aria-hidden /> Read the code
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="relative px-4 pb-24 sm:px-8">
        <article className="prose-city mx-auto max-w-3xl rounded-3xl border border-line bg-void/92 px-5 py-10 sm:px-12 sm:py-14">
          <p className="text-lg leading-relaxed text-paper">{project.summary}</p>
          {project.video && <DemoVideo src={project.video.src} poster={project.video.poster} caption={project.video.caption} />}
          <Body />
        </article>

        {next.slug !== slug && (
          <Link
            href={`/work/${next.slug}/`}
            className="group mx-auto mt-6 flex max-w-3xl items-center justify-between gap-4 rounded-3xl border border-line bg-void/85 px-5 py-6 transition-colors hover:border-signal/60 sm:px-12"
          >
            <span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper-dim">Next district</span>
              <span className="mt-1 block font-display text-2xl">{next.title}</span>
              <span className="mt-1 block text-sm text-paper-dim">{next.tagline}</span>
            </span>
            <ArrowRight size={22} aria-hidden className="shrink-0 text-signal transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </main>
  );
}
