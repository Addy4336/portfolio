"use client";

import { useEffect, useRef } from "react";
import { LiveTranscript } from "@/components/LiveTranscript";
import { adiState } from "@/lib/adi-state";
import { WAVE_EVENT } from "@/lib/voice-state";

export type Readout = { label: string; value: string };

type Props = { story: readonly string[]; readouts: Readout[] };

/**
 * About: the camera settles on Adi at the HQ plaza while the story "speaks"
 * itself as a live transcript. The section is a tall scroll track; the panel
 * stays pinned (CSS sticky) while the transcript plays.
 */
export function About({ story, readouts }: Props) {
  const track = useRef<HTMLElement>(null);

  // Tell Adi when he's in shot. He waves once the camera has settled (see Character).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        adiState.aboutVisible = entry.isIntersecting;
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      adiState.aboutVisible = false;
    };
  }, []);

  return (
    <section
      ref={track}
      id="about"
      data-cam="about"
      data-cam-hold="0.82"
      aria-labelledby="about-title"
      className="relative min-h-[240svh]"
    >
      <div className="sticky top-0 flex min-h-svh items-end px-4 pb-8 pt-24 sm:px-8 md:items-center md:pb-0">
        <div className="mx-auto w-full max-w-7xl">
          <div className="md:ml-auto md:w-[min(34rem,46vw)]">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(WAVE_EVENT))}
              className="sr-only focus:not-sr-only focus:mb-3 focus:rounded-full focus:bg-signal focus:px-4 focus:py-2 focus:text-sm focus:text-void"
            >
              Wave at Adi
            </button>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">HQ · about</p>
            <h2 id="about-title" className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Hello from HQ.
            </h2>
            <div className="mt-5">
              <LiveTranscript paragraphs={story} trackRef={track} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
              {readouts.map((r) => (
                <div key={r.label} className="rounded-xl border border-line bg-void/85 px-3 py-2 sm:px-4 sm:py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-dim sm:text-[11px]">
                    {r.label}
                  </dt>
                  <dd className="mt-0.5 text-[13px] text-paper sm:mt-1 sm:text-sm">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
