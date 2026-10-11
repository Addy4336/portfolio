"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  VideoTexture,
} from "three";
import { palette } from "../palette";
import { Sign } from "./Sign";

/** The recording is cropped to the app window: 1904 × 880. */
const SCREEN_ASPECT = 1904 / 880;

/** Sections whose camera shot frames the Studio (home page and its case study). */
const STUDIO_SECTIONS = '[data-cam="district-studio"],[data-cam="work-studio"]';

/**
 * A screen on the Studio's roof that loops a short silent clip of a real
 * interview. The video is only fetched and played while the Studio is near
 * the viewport, and the poster frame shows until it is actually playing, so
 * it costs nothing the rest of the time.
 */
export function StudioScreen({
  screen,
  position,
  width = 1.3,
}: {
  screen: { poster: string; board: string };
  position: [number, number, number];
  width?: number;
}) {
  const height = width / SCREEN_ASPECT;
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
      const el = document.querySelector(STUDIO_SECTIONS);
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
  }, [screen.poster, screen.board, material]);

  return (
    // Faces out of the district (local −z), like the studio window.
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

/** The conversation the bubble plays: real interviewer questions, and the candidate "typing". */
const SCRIPT: { who: "alex" | "you"; text?: string }[] = [
  { who: "alex", text: "Could you introduce yourself, your background and what you've been working on recently?" },
  { who: "you" },
  { who: "alex", text: "Can you tell me a bit more about your recent role and the projects you've been focused on?" },
  { who: "you" },
];
const STEP_SECONDS = [4.6, 2.2, 4.6, 2.2];

const BUBBLE_W = 512;
const BUBBLE_H = 280;

/**
 * A speech bubble beside the Studio that alternates the interviewer's
 * questions (taken from a real session) with the candidate's typing dots.
 */
export function StudioBubble({ position, width = 1.25 }: { position: [number, number, number]; width?: number }) {
  const mesh = useRef<Mesh>(null);
  const state = useRef({ step: -1, dots: -1, t0: 0 });

  const { texture, material } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = BUBBLE_W;
    canvas.height = BUBBLE_H;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    const material = new MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, depthWrite: false });
    return { texture, material };
  }, []);

  const draw = useMemo(
    () => (step: number, dots: number) => {
      const ctx = (texture.image as HTMLCanvasElement).getContext("2d")!;
      const line = SCRIPT[step];
      const alex = line.who === "alex";
      ctx.clearRect(0, 0, BUBBLE_W, BUBBLE_H);
      const top = 6;
      const bodyH = BUBBLE_H - 52;
      ctx.fillStyle = "rgba(7, 8, 12, 0.92)";
      ctx.strokeStyle = alex ? palette.signal : palette.violet;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(6, top, BUBBLE_W - 12, bodyH, 28);
      // the tail points back at the building
      ctx.moveTo(60, top + bodyH);
      ctx.lineTo(34, BUBBLE_H - 6);
      ctx.lineTo(112, top + bodyH);
      ctx.fill();
      ctx.stroke();
      ctx.textBaseline = "middle";
      ctx.fillStyle = alex ? palette.signal : "#a99bff";
      ctx.font = '500 27px "Geist Mono", ui-monospace, monospace';
      ctx.fillText(alex ? "ALEX · INTERVIEWER" : "YOU", 34, top + 40);
      ctx.fillStyle = palette.paper;
      if (alex && line.text) {
        ctx.font = '500 33px Geist, system-ui, sans-serif';
        const words = line.text.split(" ");
        const rows: string[] = [];
        let row = "";
        for (const w of words) {
          const next = row ? `${row} ${w}` : w;
          if (ctx.measureText(next).width > BUBBLE_W - 76 && row) {
            rows.push(row);
            row = w;
          } else row = next;
        }
        rows.push(row);
        rows.slice(0, 4).forEach((r, i) => ctx.fillText(r, 34, top + 88 + i * 40));
      } else {
        // typing dots
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = i <= dots ? 1 : 0.28;
          ctx.beginPath();
          ctx.arc(46 + i * 40, top + 110, 11, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      texture.needsUpdate = true;
    },
    [texture],
  );

  const world = useMemo(() => new Vector3(), []);
  useFrame(({ clock, camera }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const s = state.current;
    if (s.step < 0) s.t0 = t;
    // advance the script
    const total = STEP_SECONDS.reduce((a, b) => a + b, 0);
    let local = (t - s.t0) % total;
    let step = 0;
    while (local >= STEP_SECONDS[step]) {
      local -= STEP_SECONDS[step];
      step++;
    }
    const dots = SCRIPT[step].who === "you" ? Math.floor(local * 3) % 4 : -1;
    if (step !== s.step || dots !== s.dots) {
      s.step = step;
      s.dots = dots;
      draw(step, dots);
    }
    // billboard around the vertical axis, and a gentle float
    m.getWorldPosition(world);
    m.lookAt(camera.position.x, world.y, camera.position.z);
    m.position.y = position[1] + Math.sin(t * 1.4) * 0.015;
  });

  useEffect(() => {
    // redraw once the web fonts are in
    const redraw = () => {
      state.current.step = -1;
    };
    Promise.all([document.fonts.load("500 33px Geist"), document.fonts.load('500 27px "Geist Mono"')])
      .then(redraw)
      .catch(() => {});
    return () => {
      texture.dispose();
      material.dispose();
    };
  }, [texture, material]);

  return (
    <mesh ref={mesh} position={position} material={material} userData={{ dynamic: true }}>
      <planeGeometry args={[width, (width * BUBBLE_H) / BUBBLE_W]} />
    </mesh>
  );
}

/** A little glowing gate on the plaza: "try it live". Clicking it opens the real app (see CityPicker). */
export function StudioPortal({ position }: { position: [number, number, number] }) {
  const glow = useRef<Mesh>(null);
  const group = useRef<Group>(null);
  const lime = useMemo(() => new MeshBasicMaterial({ color: palette.signal, toneMapped: false }), []);
  const veil = useMemo(
    () =>
      new MeshBasicMaterial({
        color: palette.violet,
        transparent: true,
        opacity: 0.4,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    veil.opacity = 0.32 + Math.sin(t * 2.2) * 0.12;
    if (glow.current) glow.current.scale.y = 0.94 + Math.sin(t * 3) * 0.04;
  });
  return (
    <group ref={group} position={position} rotation-y={Math.PI}>
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.26, 0]} material={lime}>
          <boxGeometry args={[0.035, 0.52, 0.035]} />
        </mesh>
      ))}
      <mesh position={[0, 0.53, 0]} material={lime}>
        <boxGeometry args={[0.49, 0.035, 0.035]} />
      </mesh>
      <mesh ref={glow} position={[0, 0.27, 0]} material={veil} userData={{ dynamic: true }}>
        <planeGeometry args={[0.4, 0.5]} />
      </mesh>
      <Sign lines={["try it live"]} width={0.62} position={[0, 0.78, 0]} />
    </group>
  );
}
