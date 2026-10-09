"use client";

import { useEffect, useMemo, useRef } from "react";
import { speak } from "@/lib/voice-state";

type Props = {
  paragraphs: readonly string[];
  /** The tall element whose scroll progress drives the transcript. */
  trackRef: React.RefObject<HTMLElement | null>;
};

const INTERIM = 4; // how many of the newest words stay "interim" before settling

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * Renders the story as a live speech-to-text transcript: as the visitor
 * scrolls through `trackRef`, words arrive, the newest few show as grey
 * "interim" results, then settle to white "final" text, with a caret on the
 * latest word. Every word is in the HTML from the start (readable without JS,
 * by screen readers, and with reduced motion); the effect only restyles them.
 */
export function LiveTranscript({ paragraphs, trackRef }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const timer = useRef<HTMLSpanElement>(null);

  const words = useMemo(() => paragraphs.map((p) => p.split(/\s+/)), [paragraphs]);
  const total = words.reduce((n, p) => n + p.length, 0);

  useEffect(() => {
    const el = root.current;
    const track = trackRef.current;
    if (!el || !track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const spans = [...el.querySelectorAll<HTMLSpanElement>("[data-w]")];
    el.dataset.armed = "true";
    let head = 0; // number of words "spoken" so far
    let frame = 0;

    const stateFor = (i: number, h: number) =>
      i >= h ? "" : i === h - 1 ? "c" : i >= h - INTERIM ? "i" : "f";

    const render = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const range = Math.max(1, rect.height - window.innerHeight);
      // Finish the transcript a little before the end of the pinned range.
      const progress = Math.min(1, Math.max(0, -rect.top / range) * 1.2);
      const next = Math.round(progress * spans.length);
      if (next === head) return;
      const from = Math.max(0, Math.min(head, next) - INTERIM - 1);
      const to = Math.min(spans.length, Math.max(head, next) + 1);
      for (let i = from; i < to; i++) {
        const s = stateFor(i, next);
        if (spans[i].dataset.s !== s) spans[i].dataset.s = s;
      }
      if (next > head) speak(Math.min(1, (next - head) * 0.35));
      head = next;
      // On small screens the body is a short caption window: keep the newest
      // word in view, like live captions do.
      const box = body.current;
      if (box && box.scrollHeight > box.clientHeight + 1) {
        const current = spans[Math.max(0, next - 1)];
        // Smooth scrolling means scrollTop lags; use the target to set the fade.
        const target = Math.max(0, current.offsetTop - box.clientHeight * 0.55);
        box.scrollTop = target;
        box.dataset.scrolled = String(target > 0);
      }
      if (timer.current) timer.current.textContent = clock(progress * 48);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      delete el.dataset.armed;
      spans.forEach((s) => delete s.dataset.s);
    };
  }, [trackRef, total]);

  return (
    <div ref={root} className="transcript rounded-2xl border border-line bg-void/90 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-paper-dim">
        <span className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-signal" aria-hidden />
          live transcript
        </span>
        <span aria-hidden>
          adi@hq · <span ref={timer}>00:00</span>
        </span>
      </div>
      <div ref={body} className="transcript-body relative space-y-4 text-[15px] leading-relaxed sm:text-[17px]">
        {words.map((paragraph, p) => (
          <p key={p}>
            {paragraph.map((word, w) => (
              <span key={w}>
                <span data-w="">{word}</span>{" "}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
