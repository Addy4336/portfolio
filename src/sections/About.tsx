"use client";

import { useEffect, useRef } from "react";
import { LiveTranscript } from "@/components/LiveTranscript";
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

  // Wave hello each time the section comes into view.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) window.dispatchEvent(new Event(WAVE_EVENT));
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
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
