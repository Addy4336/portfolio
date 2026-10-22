"use client";

import { useEffect, useMemo } from "react";
import { MeshBasicMaterial, SRGBColorSpace, TextureLoader, VideoTexture } from "three";
import { palette } from "../palette";

/**
 * A screen in a district that loops a short silent clip of a project. The video is only fetched and played while its district is near
 * the viewport, and the poster frame shows until it is actually playing, so
 * it costs nothing the rest of the time.
 */
export function VideoScreen({
  screen,
  position,
  width = 1.3,
  aspect,
  sections,
}: {
  screen: { poster: string; board: string };
  position: [number, number, number];
  width?: number;
  /** width ÷ height of the clip */
  aspect: number;
  /** Selector for the page sections whose camera shot frames this screen. */
  sections: string;
}) {
  const height = width / aspect;
  const material = useMemo(() => new MeshBasicMaterial({ color: "#000000", toneMapped: false }), []);
  const rim = useMemo(() => new MeshBasicMaterial({ color: palette.signal, toneMapped: false }), []);
  const body = useMemo(() => new MeshBasicMaterial({ color: "#10131f" }), []);

  useEffect(() => {
    const poster = new TextureLoader().load(screen.poster, (t) => {
      t.colorSpace = SRGBColorSpace;
      // don't replace a video frame that has already started
      if (!material.map) {
        material.map = t;
        material.color.set("#ffffff");
        material.needsUpdate = true;
      }
    });

    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.crossOrigin = "anonymous";
    video.src = screen.board;
    const texture = new VideoTexture(video);
    texture.colorSpace = SRGBColorSpace;
    const onPlaying = () => {
      material.map = texture;
      material.color.set("#ffffff");
      material.needsUpdate = true;
    };
    video.addEventListener("playing", onPlaying);

    const check = () => {
      const el = document.querySelector(sections);
      let near = false;
      if (el) {
        const r = el.getBoundingClientRect();
        near = r.bottom > -window.innerHeight * 0.5 && r.top < window.innerHeight * 1.5;
      }
      if (near && !document.hidden) {
        if (video.paused) {
          video.preload = "auto";
          void video.play().catch(() => {});
        }
      } else if (!video.paused) {
        video.pause();
      }
    };
    check();
    const timer = window.setInterval(check, 600);

    return () => {
      window.clearInterval(timer);
      video.removeEventListener("playing", onPlaying);
      video.pause();
      video.removeAttribute("src");
      video.load();
      texture.dispose();
      poster.dispose();
    };
  }, [screen.poster, screen.board, sections, material]);

  return (
    // Faces out of the district (local −z), towards its camera.
    <group position={position} rotation-y={Math.PI} userData={{ dynamic: true }}>
      <mesh position-z={-0.012} material={rim}>
        <boxGeometry args={[width + 0.08, height + 0.08, 0.02]} />
      </mesh>
      <mesh position-z={0.01} material={material}>
        <planeGeometry args={[width, height]} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, -height / 2 - 0.09, -0.012]} material={body}>
          <boxGeometry args={[0.04, 0.18, 0.04]} />
        </mesh>
      ))}
    </group>
  );
}
