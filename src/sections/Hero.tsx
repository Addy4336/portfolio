import { ArrowDown, ArrowUpRight } from "lucide-react";
import { site } from "@content/site";
import { CityStatus } from "@/components/CityStatus";
import type { Project } from "@/lib/project-schema";

export function Hero({ projects }: { projects: Project[] }) {
  const districts = projects.filter((p) => p.category === "flagship").length;
  const live = projects.filter((p) => p.status === "live").length;

  return (
    <section
      data-cam="hero"
      aria-labelledby="hero-title"
      className="hero-vignette relative flex min-h-svh flex-col justify-end px-4 pb-10 pt-28 sm:px-8 md:justify-center md:pb-16"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="max-w-2xl">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.18em] text-signal">
            {site.role} · {site.focus.join(" + ")}
          </p>
          <h1
            id="hero-title"
            className="font-display text-[clamp(4rem,16vw,11rem)] font-semibold leading-[0.85] tracking-[-0.04em]"
          >
            {site.name}
            <span className="text-signal">.</span>
          </h1>
          <p className="mt-5 max-w-xl text-xl leading-snug text-paper sm:mt-6 sm:text-3xl">{site.headline}</p>
          <p className="mt-4 hidden max-w-md text-base leading-relaxed text-paper-dim sm:block">
            {site.intro}
          </p>
          <div className="mt-7 flex gap-2 sm:mt-8 sm:gap-3">
            <a
              href="#about"
              className="group inline-flex items-center gap-2 rounded-full bg-signal px-4 py-2.5 font-medium text-void transition-transform hover:-translate-y-0.5 sm:px-5 sm:py-3"
            >
              Explore the city
              <ArrowDown size={16} aria-hidden className="transition-transform group-hover:translate-y-0.5" />
            </a>
            <a
              href="#work"
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-void/60 px-4 py-2.5 font-medium text-paper transition-colors hover:border-paper/40 sm:px-5 sm:py-3"
            >
              See the work
              <ArrowUpRight size={16} aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
          <div className="mt-8 max-w-md sm:mt-10">
            <CityStatus districts={districts} live={live} availability={site.availability} />
          </div>
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim md:flex">
        <span className="scroll-cue" aria-hidden />
        scroll to fly in
      </p>
    </section>
  );
}
