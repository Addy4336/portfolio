"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  VideoTexture,
} from "three";
import { chirp } from "@/lib/ambience";
import { pointerState } from "@/lib/pointer-state";
import {
  PROMPTS,
  phaseSeconds,
  speechSeconds,
  STUDIO_ASK_EVENT,
  studio,
  type StudioPhase,
} from "@/lib/studio-state";
import { palette } from "../palette";
import { Character } from "./Character";
import { blockCentre } from "./layout";
import { Sign } from "./Sign";

/** The recording is cropped to the app window: 1904 × 880. */
const SCREEN_ASPECT = 1904 / 880;

/** Sections whose camera shot frames the Studio (home page and its case study). */
const STUDIO_SECTIONS = '[data-cam="district-studio"],[data-cam="work-studio"]';

/** Where Alex stands in the Studio's own frame (local −z faces out of the city). */
export const ALEX_LOCAL: [number, number, number] = [0.42, 0.5, -0.8];

/** A point in the Studio's frame, in world coordinates (the district is turned to face its camera). */
export function studioToWorld(local: Vector3 | [number, number, number]): Vector3 {
  const [sx, sz] = blockCentre("studio");
  const v = Array.isArray(local) ? new Vector3(...local) : local.clone();
  v.applyAxisAngle(new Vector3(0, 1, 0), Math.atan2(-sx, -sz));
  return v.add(new Vector3(sx, 0, sz));
}

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

const WALL_W = 750;
const WALL_H = 310;

/** The studio's back wall: warm light on acoustic panels, with a lime strip along the top. */
function useWallMaterial() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = WALL_W;
    canvas.height = WALL_H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1c130d";
    ctx.fillRect(0, 0, WALL_W, WALL_H);
    const glow = ctx.createRadialGradient(WALL_W / 2, WALL_H * 0.55, 20, WALL_W / 2, WALL_H * 0.55, WALL_W * 0.62);
    glow.addColorStop(0, "rgba(255, 196, 112, 0.95)");
    glow.addColorStop(0.55, "rgba(190, 120, 58, 0.55)");
    glow.addColorStop(1, "rgba(60, 36, 20, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WALL_W, WALL_H);
    // acoustic panels
    const cols = 6;
    const rows = 2;
    const pw = (WALL_W - 40) / cols;
    const ph = (WALL_H - 56) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 20 + c * pw + 6;
        const y = 36 + r * ph + 6;
        ctx.fillStyle = "rgba(24, 12, 6, 0.42)";
        ctx.beginPath();
        ctx.roundRect(x, y, pw - 12, ph - 12, 10);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 214, 150, 0.16)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.fillStyle = palette.signal;
    ctx.fillRect(0, 0, WALL_W, 10);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return new MeshBasicMaterial({ map: texture, toneMapped: false });
  }, []);
}

const METER_BARS = 9;

/**
 * The interview set behind the studio window: Alex (the InterviewIQ
 * interviewer, as the glowing orb from the app) facing Adi on a stool, a
 * level meter that follows whoever is talking, and the script that drives
 * it all. Click Alex for another question; the script, the bubble and the
 * meter all read the shared `studio` state.
 */
export function StudioSet() {
  const wall = useWallMaterial();
  const mats = useMemo(
    () => ({
      frame: new MeshLambertMaterial({ color: "#10131f" }),
      floor: new MeshLambertMaterial({ color: "#1a2034" }),
      stool: new MeshLambertMaterial({ color: "#2b3350" }),
      orb: new MeshLambertMaterial({ color: "#6f5ff0", emissive: new Color("#3a2ba8") }),
      face: new MeshBasicMaterial({ color: "#140f33" }),
      ring: new MeshBasicMaterial({
        color: palette.signal,
        toneMapped: false,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      meter: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    }),
    [],
  );

  const alex = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const mouth = useRef<Mesh>(null);
  const rings = useRef<Group>(null);
  const meter = useRef<InstancedMesh>(null);
  const motion = useRef({ yaw: 0, nextBlink: 2, blink: 0, ask: false });
  const dummy = useMemo(() => new Object3D(), []);
  const limeC = useMemo(() => new Color(palette.signal), []);
  const violetC = useMemo(() => new Color(palette.violet), []);
  const tmpC = useMemo(() => new Color(), []);

  useLayoutEffect(() => {
    // bars start flat; colour is set each frame
    const m = meter.current;
    if (!m) return;
    for (let i = 0; i < METER_BARS; i++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.set(1, 0.001, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, limeC);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [dummy, limeC]);

  useEffect(() => {
    const onAsk = () => {
      motion.current.ask = true;
    };
    window.addEventListener(STUDIO_ASK_EVENT, onAsk);
    return () => window.removeEventListener(STUDIO_ASK_EVENT, onAsk);
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const m = motion.current;

    // ── the script ────────────────────────────────────────────────────────
    if (studio.phaseStart < 0) {
      studio.phaseStart = t;
      studio.version++;
    }
    if (m.ask) {
      m.ask = false;
      studio.index = (studio.index + 1) % PROMPTS.length;
      studio.phase = "question";
      studio.phaseStart = t;
      studio.version++;
      chirp();
    }
    const prompt = PROMPTS[studio.index];
    if (t - studio.phaseStart > phaseSeconds(studio.phase, prompt)) {
      const next: Record<StudioPhase, StudioPhase> = {
        question: "answer",
        answer: "followup",
        followup: "answer2",
        answer2: "question",
      };
      studio.phase = next[studio.phase];
      if (studio.phase === "question") studio.index = (studio.index + 1) % PROMPTS.length;
      studio.phaseStart = t;
      studio.version++;
    }
    const inPhase = t - studio.phaseStart;
    const line = studio.phase === "question" ? prompt.question : studio.phase === "followup" ? prompt.followUp : "";
    const talking = line !== "" && inPhase < speechSeconds(line);
    const typingNow = studio.phase === "answer" || studio.phase === "answer2";
    const k = 1 - Math.exp(-delta * 14);
    const voice = talking ? 0.5 + 0.5 * Math.abs(Math.sin(t * 13.7) * Math.cos(t * 4.3)) : 0;
    studio.speaking += (voice - studio.speaking) * k;
    studio.typing += ((typingNow ? 0.5 + 0.5 * Math.abs(Math.sin(t * 9.1)) : 0) - studio.typing) * k;

    // ── Alex ──────────────────────────────────────────────────────────────
    const a = alex.current;
    if (a) {
      // looks at the cursor, or at the candidate while they answer
      const listening = typingNow ? 1 : 0;
      const yawGoal = (1 - listening) * pointerState.x * 0.5 + listening * 0.65;
      m.yaw += (yawGoal - m.yaw) * (1 - Math.exp(-delta * 5));
      a.rotation.y = m.yaw;
      a.rotation.x = (1 - listening) * pointerState.y * 0.12;
      a.position.y = ALEX_LOCAL[1] + Math.sin(t * 1.8) * 0.012 + studio.speaking * 0.012;
      a.scale.setScalar(1 + studio.speaking * 0.05);
    }
    if (t > m.nextBlink) {
      m.blink = t;
      m.nextBlink = t + 2.2 + Math.random() * 3;
    }
    if (eyes.current) eyes.current.scale.y = t - m.blink < 0.12 ? 0.12 : 1;
    if (mouth.current) {
      // a small smile at rest; opens and closes with the voice
      mouth.current.scale.set(0.045 - studio.speaking * 0.016, 0.01 + studio.speaking * 0.04, 0.014);
    }
    if (rings.current) {
      rings.current.children.forEach((r, i) => {
        const phase = (t * (0.6 + studio.speaking) + i / 2) % 1;
        r.scale.setScalar(0.8 + phase * 0.9);
        (r as Mesh).visible = studio.speaking > 0.05;
      });
      mats.ring.opacity = studio.speaking * 0.55;
    }

    // ── the level meter ───────────────────────────────────────────────────
    const bars = meter.current;
    if (bars) {
      for (let i = 0; i < METER_BARS; i++) {
        const centre = 1 - Math.abs(i - (METER_BARS - 1) / 2) / ((METER_BARS - 1) / 2);
        const wobble = 0.5 + 0.5 * Math.sin(t * (7 + i * 1.7) + i);
        const level = Math.max(studio.speaking, studio.typing * 0.6);
        const h = 0.008 + level * (0.025 + centre * 0.05) * (0.45 + 0.55 * wobble);
        dummy.position.set((i - (METER_BARS - 1) / 2) * 0.036, 0, 0);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        bars.setMatrixAt(i, dummy.matrix);
        // lime while Alex speaks, violet while the candidate types
        tmpC.copy(limeC).lerp(violetC, studio.typing > studio.speaking ? 1 : 0);
        bars.setColorAt(i, tmpC);
      }
      bars.instanceMatrix.needsUpdate = true;
      if (bars.instanceColor) bars.instanceColor.needsUpdate = true;
    }
  });

  const [ax, ay, az] = ALEX_LOCAL;
  return (
    <group>
      {/* the room: warm back wall on the facade, a frame around it, and a floor that steps out */}
      <mesh position={[0, 0.55, -0.662]} rotation-y={Math.PI} material={wall}>
        <planeGeometry args={[1.5, 0.62]} />
      </mesh>
      <mesh position={[0, 0.885, -0.7]} material={mats.frame}>
        <boxGeometry args={[1.58, 0.05, 0.1]} />
      </mesh>
      {[-0.77, 0.77].map((x) => (
        <mesh key={x} position={[x, 0.55, -0.7]} material={mats.frame}>
          <boxGeometry args={[0.04, 0.68, 0.1]} />
        </mesh>
      ))}
      <mesh position={[0, 0.222, -0.82]} material={mats.floor}>
        <boxGeometry args={[1.5, 0.04, 0.34]} />
      </mesh>

      {/* Alex on a little plinth */}
      <mesh position={[ax, 0.3, az]} material={mats.stool}>
        <cylinderGeometry args={[0.07, 0.085, 0.07, 16]} />
      </mesh>
      <group ref={alex} position={[ax, ay, az]} userData={{ dynamic: true }}>
        <mesh material={mats.orb}>
          <sphereGeometry args={[0.125, 28, 20]} />
        </mesh>
        <group ref={eyes} position={[0, 0.03, -0.112]}>
          {[-0.048, 0.048].map((x) => (
            <mesh key={x} position-x={x} material={mats.face}>
              <capsuleGeometry args={[0.017, 0.042, 2, 8]} />
            </mesh>
          ))}
        </group>
        <mesh ref={mouth} position={[0, -0.045, -0.112]} material={mats.face}>
          <sphereGeometry args={[1, 12, 8]} />
        </mesh>
        <group ref={rings} rotation-x={Math.PI / 2}>
          {[0, 1].map((i) => (
            <mesh key={i} material={mats.ring} visible={false}>
              <torusGeometry args={[0.2, 0.004, 6, 40]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Adi, the candidate, on a stool, turned a little towards Alex */}
      <mesh position={[-0.42, 0.285, az]} material={mats.stool}>
        <cylinderGeometry args={[0.06, 0.05, 0.085, 14]} />
      </mesh>
      <group position={[-0.42, 0.242, az]} scale={0.94}>
        <Character position={[0, 0.0, 0]} facing={Math.PI - 0.55} sitting interactive={false} />
      </group>

      {/* level meter along the front edge of the floor */}
      <instancedMesh
        ref={meter}
        args={[undefined, undefined, METER_BARS]}
        position={[0, 0.24, -0.99]}
        material={mats.meter}
        userData={{ dynamic: true }}
        frustumCulled={false}
      >
        <boxGeometry args={[0.024, 1, 0.02]} />
      </instancedMesh>
    </group>
  );
}

const BUBBLE_W = 512;
const BUBBLE_H = 300;

/**
 * A speech bubble beside the Studio showing what the interview is saying
 * right now: Alex's question or follow-up, or the candidate typing.
 */
export function StudioBubble({ position, width = 1.25 }: { position: [number, number, number]; width?: number }) {
  const mesh = useRef<Mesh>(null);
  const seen = useRef({ version: -1, dots: -2 });

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
    () => (dots: number) => {
      const ctx = (texture.image as HTMLCanvasElement).getContext("2d")!;
      const p = PROMPTS[studio.index];
      const alexSpeaks = studio.phase === "question" || studio.phase === "followup";
      const text = studio.phase === "question" ? p.question : studio.phase === "followup" ? p.followUp : "";
      ctx.clearRect(0, 0, BUBBLE_W, BUBBLE_H);
      const top = 6;
      const bodyH = BUBBLE_H - 44;
      ctx.fillStyle = "rgba(7, 8, 12, 0.93)";
      ctx.strokeStyle = alexSpeaks ? palette.signal : palette.violet;
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
      ctx.fillStyle = alexSpeaks ? palette.signal : "#a99bff";
      ctx.font = '500 25px "Geist Mono", ui-monospace, monospace';
      const label = alexSpeaks ? `ALEX · ${studio.phase === "followup" ? "FOLLOW-UP" : p.topic.toUpperCase()}` : "ADI · ANSWERING";
      ctx.fillText(label, 34, top + 36);
      ctx.fillStyle = palette.paper;
      if (alexSpeaks) {
        let size = 33;
        let rows: string[] = [];
        // shrink the type until the line fits in five rows
        for (; size >= 24; size -= 3) {
          ctx.font = `500 ${size}px Geist, system-ui, sans-serif`;
          rows = [];
          let row = "";
          for (const w of text.split(" ")) {
            const next = row ? `${row} ${w}` : w;
            if (ctx.measureText(next).width > BUBBLE_W - 76 && row) {
              rows.push(row);
              row = w;
            } else row = next;
          }
          rows.push(row);
          if (rows.length <= 5) break;
        }
        rows.slice(0, 5).forEach((r, i) => ctx.fillText(r, 34, top + 82 + i * (size + 7)));
      } else {
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = i <= dots ? 1 : 0.28;
          ctx.beginPath();
          ctx.arc(48 + i * 40, top + 120, 11, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // the affordance
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = palette.paper;
      ctx.font = '500 21px "Geist Mono", ui-monospace, monospace';
      ctx.textAlign = "right";
      ctx.fillText("CLICK ALEX FOR ANOTHER", BUBBLE_W - 30, BUBBLE_H - 6 - 28 + 4);
      ctx.textAlign = "start";
      ctx.globalAlpha = 1;
      texture.needsUpdate = true;
    },
    [texture],
  );

  const world = useMemo(() => new Vector3(), []);
  useFrame(({ clock, camera }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const typing = studio.phase === "answer" || studio.phase === "answer2";
    const dots = typing ? Math.floor((t - studio.phaseStart) * 3) % 4 : -1;
    const s = seen.current;
    if (studio.version !== s.version || dots !== s.dots) {
      s.version = studio.version;
      s.dots = dots;
      draw(dots);
    }
    // billboard around the vertical axis, with a gentle float
    m.getWorldPosition(world);
    m.lookAt(camera.position.x, world.y, camera.position.z);
    m.position.y = position[1] + Math.sin(t * 1.4) * 0.015;
  });

  useEffect(() => {
    // redraw once the web fonts are in
    const redraw = () => {
      seen.current.version = -1;
    };
    Promise.all([document.fonts.load("500 33px Geist"), document.fonts.load('500 25px "Geist Mono"')])
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
    <group position={position} rotation-y={Math.PI}>
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
