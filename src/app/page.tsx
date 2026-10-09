import Link from "next/link";
import { getProjects } from "@/lib/projects";
import { statusLabel } from "@/lib/project-schema";

// Setup-step shell: proves fonts, tokens, content loading, smooth scroll and
// the 3D stage. Section 1 replaces it with the real hero.
export default function Home() {
  const projects = getProjects();
  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-8">
      <section className="flex min-h-svh flex-col justify-center gap-6">
        <p className="font-mono text-sm text-signal">setup · agent city</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-7xl">Adi</h1>
        <p className="max-w-xl text-lg text-paper-dim">
          AI engineer building agents that listen, think and act.
        </p>
      </section>
      <section className="min-h-svh py-24">
        <h2 className="font-display text-2xl">Projects</h2>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {projects.map((p) => (
            <li key={p.slug}>
              <Link href={`/work/${p.slug}/`} className="flex items-baseline justify-between gap-4 py-4">
                <span className="font-display">{p.title}</span>
                <span className="font-mono text-xs text-paper-dim">{statusLabel[p.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
