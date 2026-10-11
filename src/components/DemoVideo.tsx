"use client";

import { useEffect, useRef } from "react";

type Props = { src: string; poster: string; caption?: string; aspect?: string };

/**
 * A recorded demo: plays (muted, looping) while it is on screen and pauses
 * when it is not, never autoplays for people who prefer reduced motion, and
 * keeps normal controls so it can be paused or scrubbed.
 */
export function DemoVideo({ src, poster, caption, aspect = "1904 / 880" }: Props) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure className="my-8">
      <video
        ref={video}
        className="w-full rounded-2xl border border-line bg-void"
        style={{ aspectRatio: aspect }}
        poster={poster}
        muted
        loop
        playsInline
        controls
        preload="metadata"
      >
        <source src={src} type="video/mp4" />
      </video>
      {caption && <figcaption className="mt-3 text-sm leading-relaxed text-paper-dim">{caption}</figcaption>}
    </figure>
  );
}
