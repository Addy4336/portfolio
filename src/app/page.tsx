import Link from "next/link";
import { Nav } from "@/components/Nav";
import { getProjects } from "@/lib/projects";
import { statusLabel } from "@/lib/project-schema";
import { Hero } from "@/sections/Hero";

export default function Home() {
  const projects = getProjects();
  return (
    <>
      <Nav />
      <main>
        <Hero projects={projects} />

        {/* Placeholder sections: built out in sections 2–6. */}
        <section id="about" data-cam="about" className="min-h-[150svh] px-4 py-32 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-md md:ml-auto">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">HQ · about</p>
              <h2 className="mt-4 font-display text-4xl font-semibold">Inside HQ</h2>
              <p className="mt-4 text-paper-dim">The story section lands here next.</p>
            </div>
          </div>
        </section>

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
