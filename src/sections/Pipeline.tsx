"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { scrollToTarget } from "@/components/SmoothScroll";
import { PIPELINE_STAGES, pipelineState } from "@/lib/pipeline-state";

export type Stage = {
  id: string;
  station: string;
  title: string;
  body: string;
  stack: readonly string[];
  log: string;
};

type Props = { stages: readonly Stage[]; toolbox: readonly string[] };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
// Scroll fraction of the pinned range → trip progress (0…4).
const toProgress = (s: number) => clamp(s * 4.3 - 0.15, 0, PIPELINE_STAGES);
const fromProgress = (p: number) => (p + 0.15) / 4.3;

/**
 * "How I build": one example request rides the city's transit loop through
 * the four stations as you scroll. The stepper and the request log follow
 * the same progress the 3D packet reads.
 */
export function Pipeline({ stages, toolbox }: Props) {
  const track = useRef<HTMLElement>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const range = Math.max(1, rect.height - window.innerHeight);
      const s = -rect.top / range;
      pipelineState.progress = toProgress(s);
      pipelineState.presence = clamp(Math.min((s + 0.1) / 0.1, (1.12 - s) / 0.1));
      const next = s < -0.02 ? -1 : Math.min(PIPELINE_STAGES - 1, Math.floor(pipelineState.progress));
      setActive((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      pipelineState.presence = 0;
    };
  }, []);

  /** Scroll to the point in the pinned range where stage `i` begins (or to the end). */
  const offsetFor = (fraction: number) => {
    const el = track.current!;
    const top = el.getBoundingClientRect().top + window.scrollY;
    return top + (el.offsetHeight - window.innerHeight) * clamp(fraction);
  };
  const goTo = (i: number) => scrollToTarget(offsetFor(fromProgress(i + 0.02)));
  const play = () => {
    const start = offsetFor(0);
    if (window.scrollY < start - 4 || active >= PIPELINE_STAGES - 1) {
      // Jump to the start of the trip first, then ride it.
      window.scrollTo({ top: start });
    }
    requestAnimationFrame(() => scrollToTarget(offsetFor(1), { duration: 9, linear: true }));
  };

  const current = stages[Math.max(0, active)];

  return (
    <>
      <section
        ref={track}
        id="pipeline"
        data-cam="pipeline"
        data-cam-hold="0.85"
        aria-labelledby="pipeline-title"
        className="relative min-h-[330svh]"
      >
        <div className="sticky top-0 flex min-h-svh items-end px-4 pb-8 pt-24 sm:px-8 md:items-center md:pb-0">
          <div className="mx-auto w-full max-w-7xl">
            <div className="md:w-[min(31rem,44vw)]">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">Transit · how I build</p>
              <h2 id="pipeline-title" className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Every request takes the same trip.
              </h2>
              <p className="mt-4 hidden max-w-md leading-relaxed text-paper-dim md:block">
                A voice agent is a relay: audio comes in, gets understood, gets thought about,
                sometimes does something in the world, and goes back out as speech. Scroll to
                ride one request around the city.
              </p>

              {/* Desktop: the full stepper. */}
              <ol className="mt-6 hidden space-y-2 md:block">
                {stages.map((stage, i) => {
                  const on = i === active;
                  return (
                    <li key={stage.id}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-current={on ? "step" : undefined}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                          on ? "border-signal/60 bg-void/90" : "border-line bg-void/70 hover:border-paper/25"
                        }`}
                      >
                        <span className="flex items-baseline justify-between gap-4">
                          <span className={`font-display text-base ${on ? "text-paper" : "text-paper-dim"}`}>
                            <span className="mr-3 font-mono text-xs text-signal">0{i + 1}</span>
                            {stage.title}
                          </span>
                          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper-dim">
                            {stage.station}
                          </span>
                        </span>
                        {on && (
                          <span className="mt-2 block text-sm leading-relaxed text-paper-dim">{stage.body}</span>
                        )}
                        {on && <StackChips stack={stage.stack} />}
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Phones: a compact progress bar and the active stage only. */}
              <div className="mt-5 md:hidden">
                <div className="grid grid-cols-4 gap-1.5" aria-hidden>
                  {stages.map((stage, i) => (
                    <div key={stage.id}>
                      <div className={`h-1 rounded-full ${i <= active ? "bg-signal" : "bg-paper/15"}`} />
                      <p className={`mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] ${i === active ? "text-paper" : "text-paper-dim"}`}>
                        {stage.title}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-line bg-void/90 px-4 py-3">
                  <p className="font-display text-base">
                    <span className="mr-2 font-mono text-xs text-signal">0{Math.max(0, active) + 1}</span>
                    {current.title} <span className="font-mono text-[11px] text-paper-dim">· {current.station}</span>
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-paper-dim">{current.body}</p>
                  <StackChips stack={current.stack} />
                </div>
              </div>

              <RequestLog stages={stages} active={active} />

              <button
                type="button"
                onClick={play}
                className="group mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-void/70 px-4 py-2 text-sm text-paper transition-colors hover:border-signal hover:text-signal"
              >
                <Play size={14} aria-hidden className="fill-current" />
                Play the trip
              </button>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Toolbox" className="relative px-4 pb-24 pt-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-paper-dim">Also in the toolbox</p>
          <ul className="mt-3 flex max-w-3xl flex-wrap gap-2">
            {toolbox.map((tool) => (
              <li key={tool} className="rounded-full border border-line bg-void/70 px-3 py-1 text-sm text-paper-dim">
                {tool}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function StackChips({ stack }: { stack: readonly string[] }) {
  return (
    <span className="mt-3 flex flex-wrap gap-1.5">
      {stack.map((s) => (
        <span key={s} className="rounded-full bg-signal/10 px-2.5 py-0.5 font-mono text-[11px] text-signal">
          {s}
        </span>
      ))}
    </span>
  );
}

/** The example request's log: one line per stage, revealed as the trip progresses. */
function RequestLog({ stages, active }: { stages: readonly Stage[]; active: number }) {
  return (
    <div className="mt-4 rounded-xl border border-line bg-void/90 px-4 py-3 font-mono text-[11px] leading-relaxed sm:text-xs">
      <p className="mb-1.5 uppercase tracking-[0.14em] text-paper-dim">example request</p>
      <ol aria-label="Example request log">
        {stages.map((stage, i) => (
          <li
            key={stage.id}
            className={`truncate transition-opacity duration-300 ${
              i < active ? "text-paper-dim" : i === active ? "text-paper" : "opacity-0"
            } ${i === active ? "" : "max-md:hidden"}`}
          >
            <span className="text-signal">›</span> {stage.log}
          </li>
        ))}
      </ol>
    </div>
  );
}
