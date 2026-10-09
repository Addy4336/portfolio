import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  return project ? { title: project.title, description: project.tagline } : {};
}

export default async function WorkPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const { default: Body } = await import(`@content/projects/${slug}.mdx`);

  return (
    <main className="mx-auto max-w-3xl px-4 py-24 sm:px-8">
      <Link href="/" className="font-mono text-sm text-signal">
        ← back to the city
      </Link>
      <p className="mt-10 font-mono text-xs text-paper-dim">
        {statusLabel[project.status]} · {project.year}
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{project.title}</h1>
      <p className="mt-4 text-lg text-paper-dim">{project.tagline}</p>
      <article className="prose-city mt-12">
        <Body />
      </article>
    </main>
  );
}
