import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Lost agent" };

/** 404: the city stays in the background (hero shot); a lost agent asks for directions. */
export default function NotFound() {
  return (
    <main className="hero-vignette relative flex min-h-svh items-center px-4 sm:px-8" data-cam="hero">
      <div className="mx-auto w-full max-w-7xl">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">Error 404 · lost agent</p>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight sm:text-7xl">
            This street isn&apos;t on the map.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-paper-dim">
            One of the agents took a wrong turn. The page you&apos;re after has moved, or it was never
            built.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-signal px-5 py-3 font-medium text-void transition-transform hover:-translate-y-0.5"
          >
            <ArrowLeft size={16} aria-hidden /> Back to the city
          </Link>
        </div>
      </div>
    </main>
  );
}
