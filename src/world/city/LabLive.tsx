"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { chirp } from "@/lib/ambience";
import type { CityProject } from "@/lib/districts";
import {
  formatDate,
  lab,
  LAB_ASOF_EVENT,
  RULE,
  TIMELINE_END,
  TIMELINE_START,
  TODAY,
  versionOn,
} from "@/lib/lab-state";
import { palette } from "../palette";
import { LivePortal } from "./LivePortal";
import { Scaffold } from "./Scaffold";
import { Sign } from "./Sign";

/** Materials shared with the other districts (so static batching can merge them). */
type SharedMats = { slab: MeshLambertMaterial; body: MeshLambertMaterial; dark: MeshLambertMaterial; lime: MeshBasicMaterial };

// Positions in the Lab's own frame (local −z faces out of the city; +x shows on screen left).
/** The timeline board: centre, width and height, tilted up towards the camera. */
const RAIL: [number, number, number] = [0, 0.2, -0.95];
const RAIL_W = 2.3;
const RAIL_H = 0.44;
const RAIL_TILT = 1.05;

/** Where the city's picker looks for the timeline, the answer card and the portal. */
export const LAB_RAIL_LOCAL = RAIL;
export function labCardLocal(portrait: boolean): [number, number, number] {
  return portrait ? [-0.3, 2.02, -0.1] : [-1.05, 1.32, -0.55];
}
export function labPortalLocal(portrait: boolean): [number, number, number] {
  return [portrait ? 1.05 : -1.05, 0.04, -0.45];
}

/** The real "now", so the sweep ends today. */
const SWEEP_FROM = 2023.1;
const SWEEP_TO = TODAY;
const SWEEP_SECONDS = 14;

/** Canvas x (0…1 across the board) for a decimal year. */
const toU = (year: number) => 0.06 + ((year - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 0.88;

function useCanvas(w: number, h: number) {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, texture, ctx: canvas.getContext("2d")! };
  }, [w, h]);
}

const DOC_W = 512;
const DOC_H = 330;

/** One version of the rule, as a lit document standing on the archive. */
function drawDoc(ctx: CanvasRenderingContext2D, version: "v1" | "v2", active: boolean) {
  const v = RULE[version];
  const lime = version === "v2";
  ctx.clearRect(0, 0, DOC_W, DOC_H);
  ctx.fillStyle = active ? "rgba(237, 234, 226, 0.97)" : "rgba(150, 152, 170, 0.9)";
  ctx.beginPath();
  ctx.roundRect(6, 6, DOC_W - 12, DOC_H - 12, 22);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = active ? (lime ? palette.signal : palette.violet) : "rgba(60, 64, 90, 0.9)";
  ctx.stroke();
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1a1d2b";
  ctx.font = '600 26px "Geist Mono", ui-monospace, monospace';
  ctx.fillText(`${RULE.scheme.toUpperCase()} · ${v.label.toUpperCase()}`, 34, 48);
  ctx.font = "500 24px Geist, system-ui, sans-serif";
  ctx.fillStyle = "#3b3f55";
  ctx.fillText("First loan to a street vendor", 34, 96);
  ctx.fillStyle = "#11131c";
  ctx.font = "700 64px Unbounded, system-ui, sans-serif";
  ctx.fillText(v.value, 34, 160);
  ctx.font = "500 24px Geist, system-ui, sans-serif";
  ctx.fillStyle = "#3b3f55";
  ctx.fillText(version === "v1" ? `27 Apr 2022 – ${RULE.v1.until}` : "From 27 Aug 2025, no end date", 34, 222);
  // the stamp
  const stamp = version === "v1" ? "SUPERSEDED" : "IN FORCE";
  ctx.font = '700 26px "Geist Mono", ui-monospace, monospace';
  const sw = ctx.measureText(stamp).width + 40;
  ctx.beginPath();
  ctx.roundRect(34, 252, sw, 48, 24);
  ctx.fillStyle = version === "v1" ? "rgba(122, 92, 255, 0.18)" : "rgba(200, 245, 58, 0.9)";
  ctx.fill();
  ctx.fillStyle = version === "v1" ? "#4a3aa8" : "#0b0e10";
  ctx.fillText(stamp, 54, 277);
}

const RAIL_PX_W = 1024;
const RAIL_PX_H = 196;

/** The timeline: years, the two version spans and the day the rule changed. */
function drawRail(ctx: CanvasRenderingContext2D) {
  const W = RAIL_PX_W;
  const H = RAIL_PX_H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(7, 8, 12, 0.9)";
  ctx.beginPath();
  ctx.roundRect(4, 4, W - 8, H - 8, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(237, 234, 226, 0.25)";
  ctx.lineWidth = 3;
  ctx.stroke();
  const y = 92;
  const x1 = toU(RULE.v1.from) * W;
  const x2 = toU(RULE.v2.from) * W;
  const x3 = toU(TODAY) * W;
  // version spans
  ctx.fillStyle = palette.violet;
  ctx.fillRect(x1, y - 12, x2 - x1 - 3, 24);
  ctx.fillStyle = palette.signal;
  ctx.fillRect(x2 + 3, y - 12, x3 - x2 - 3, 24);
  ctx.textBaseline = "middle";
  ctx.font = '600 22px "Geist Mono", ui-monospace, monospace';
  ctx.fillStyle = "#c8bcff";
  ctx.fillText(`v1 · ${RULE.v1.value}`, x1 + 6, y - 34);
  ctx.fillStyle = palette.signal;
  ctx.fillText(`v2 · ${RULE.v2.value}`, x2 + 10, y - 34);
  // the change
  ctx.fillStyle = palette.paper;
  ctx.fillRect(x2 - 2, y - 30, 4, 60);
  ctx.font = '500 18px "Geist Mono", ui-monospace, monospace';
  ctx.fillText("RULE CHANGED 27 AUG 2025", x2 - 128, y + 46);
  // years
  ctx.fillStyle = "rgba(237, 234, 226, 0.55)";
  ctx.font = '500 20px "Geist Mono", ui-monospace, monospace';
  for (let yr = TIMELINE_START; yr <= TIMELINE_END; yr++) {
    const x = toU(yr) * W;
    ctx.fillRect(x - 1, y + 16, 2, 10);
    if (Math.abs(x - x2) > 70) ctx.fillText(String(yr), x - 26, y + 78);
  }
  ctx.font = '600 20px "Geist Mono", ui-monospace, monospace';
  ctx.fillStyle = palette.paper;
  ctx.fillText("CLICK TO ASK AS OF ANOTHER DATE", 30, 30);
}

const CARD_W = 512;
const CARD_H = 340;

/** The answer for the chosen date, like PolicyDrift's own answer panel. */
function drawCard(ctx: CanvasRenderingContext2D, asOf: number) {
  const version = versionOn(asOf);
  const v = RULE[version];
  const changed = version === "v2";
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = "rgba(7, 8, 12, 0.94)";
  ctx.strokeStyle = changed ? palette.signal : palette.violet;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(4, 4, CARD_W - 8, CARD_H - 8, 26);
  ctx.fill();
  ctx.stroke();
  ctx.textBaseline = "middle";
  ctx.fillStyle = changed ? palette.signal : "#c8bcff";
  ctx.font = '600 23px "Geist Mono", ui-monospace, monospace';
  ctx.fillText(`AS OF ${formatDate(asOf).toUpperCase()}`, 30, 40);
  ctx.fillStyle = "rgba(237, 234, 226, 0.75)";
  ctx.font = "500 24px Geist, system-ui, sans-serif";
  ctx.fillText(RULE.question, 30, 84);
  ctx.fillStyle = palette.paper;
  ctx.font = "700 60px Unbounded, system-ui, sans-serif";
  ctx.fillText(v.value, 30, 146);
  ctx.font = '600 21px "Geist Mono", ui-monospace, monospace';
  ctx.fillStyle = changed ? palette.signal : "#c8bcff";
  ctx.fillText(`${RULE.scheme.toUpperCase()} ${v.label.toUpperCase()} · IN FORCE THEN`, 30, 200);
  ctx.fillStyle = "rgba(237, 234, 226, 0.8)";
  ctx.font = "500 22px Geist, system-ui, sans-serif";
  ctx.fillText("✓ Figure found in a cited official source", 30, 244);
  if (changed) {
    ctx.fillStyle = "#ffd08a";
    ctx.fillText("⟳ Rule changed: v1 kept for reference", 30, 284);
  } else {
    ctx.fillStyle = "rgba(237, 234, 226, 0.55)";
    ctx.fillText("A later version exists after 26 Aug 2025", 30, 284);
  }
}

const TAGS = [
  { text: "EN", font: "600 40px Geist, system-ui, sans-serif" },
  { text: "हिंदी", font: '600 40px "Nirmala UI", "Noto Sans Devanagari", "Mangal", system-ui, sans-serif' },
  { text: "ગુજરાતી", font: '600 40px "Nirmala UI", "Noto Sans Gujarati", "Shruti", system-ui, sans-serif' },
];

function LanguageTag({ text, font }: { text: string; font: string }) {
  const { texture, ctx } = useCanvas(256, 96);
  const material = useMemo(
    () => new MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, depthWrite: false }),
    [texture],
  );
  useEffect(() => {
    const draw = () => {
      ctx.clearRect(0, 0, 256, 96);
      ctx.fillStyle = "rgba(7, 8, 12, 0.9)";
      ctx.strokeStyle = palette.signal;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(4, 4, 248, 88, 44);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.paper;
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 128, 52);
      texture.needsUpdate = true;
    };
    draw();
    document.fonts.ready.then(draw).catch(() => {});
    return () => {
      texture.dispose();
      material.dispose();
    };
  }, [ctx, texture, material, text, font]);
  return (
    <mesh material={material}>
      <planeGeometry args={[0.36, 0.135]} />
    </mesh>
  );
}

/**
 * PolicyDrift: a rule archive holding two real versions of one rule, a
 * timeline with an "as of" date sweeping across it, and an answer card that
 * uses whichever version was in force on that date. Click the timeline or
 * the card to ask about the other side of the change. Questions in English,
 * Hindi and Gujarati orbit the archive, and a corner is still under
 * scaffolding: the pre-registered test results are being produced.
 */
export function LabLive({ project, shared }: { project: CityProject; shared: SharedMats }) {
  const portrait = useThree((t) => t.size.width / t.size.height < 0.9);
  const mats = useMemo(
    () => ({
      deck: new MeshLambertMaterial({ color: "#2b3352" }),
      beam: new MeshBasicMaterial({
        color: palette.signal,
        transparent: true,
        opacity: 0.35,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      status: new MeshBasicMaterial({ color: "#ffb347", toneMapped: false }),
    }),
    [],
  );

  const v1 = useCanvas(DOC_W, DOC_H);
  const v2 = useCanvas(DOC_W, DOC_H);
  const rail = useCanvas(RAIL_PX_W, RAIL_PX_H);
  const card = useCanvas(CARD_W, CARD_H);
  const docMats = useMemo(
    () => ({
      v1: new MeshBasicMaterial({ map: v1.texture, transparent: true, toneMapped: false }),
      v2: new MeshBasicMaterial({ map: v2.texture, transparent: true, toneMapped: false }),
      rail: new MeshBasicMaterial({ map: rail.texture, transparent: true, toneMapped: false, depthWrite: false }),
      card: new MeshBasicMaterial({ map: card.texture, transparent: true, toneMapped: false, depthWrite: false }),
    }),
    [v1.texture, v2.texture, rail.texture, card.texture],
  );

  const doc1 = useRef<Group>(null);
  const doc2 = useRef<Group>(null);
  const knob = useRef<Group>(null);
  const cardMesh = useRef<Mesh>(null);
  const tags = useRef<Group>(null);
  const status = useRef<Mesh>(null);
  const seen = useRef({ version: "", day: "", fonts: 0 });
  const world = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const onAsk = () => {
      // jump to the other side of the change and hold there for a while
      lab.target = versionOn(lab.asOf) === "v1" ? TODAY : 2024.2;
      chirp();
    };
    window.addEventListener(LAB_ASOF_EVENT, onAsk);
    const redraw = () => {
      seen.current.version = "";
      seen.current.day = "";
      drawRail(rail.ctx);
      rail.texture.needsUpdate = true;
    };
    redraw();
    document.fonts.ready.then(redraw).catch(() => {});
    return () => {
      window.removeEventListener(LAB_ASOF_EVENT, onAsk);
      for (const c of [v1, v2, rail, card]) c.texture.dispose();
      Object.values(docMats).forEach((m) => m.dispose());
    };
  }, [v1, v2, rail, card, docMats]);

  useFrame(({ clock, camera }, delta) => {
    const t = clock.elapsedTime;
    // the date: a visitor's choice glides there and holds; otherwise a slow sweep
    if (lab.target !== null) {
      lab.asOf += (lab.target - lab.asOf) * (1 - Math.exp(-delta * 3.5));
      if (Math.abs(lab.target - lab.asOf) < 0.002) {
        lab.asOf = lab.target;
        lab.target = null;
        lab.holdUntil = t + 6;
      }
    } else if (t > lab.holdUntil) {
      const phase = ((t - lab.holdUntil) % SWEEP_SECONDS) / SWEEP_SECONDS;
      // there and back, easing at each end
      const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      const eased = tri * tri * (3 - 2 * tri);
      const goal = SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * eased;
      lab.asOf += (goal - lab.asOf) * (1 - Math.exp(-delta * 2));
    }

    const version = versionOn(lab.asOf);
    const s = seen.current;
    if (version !== s.version) {
      s.version = version;
      drawDoc(v1.ctx, "v1", version === "v1");
      drawDoc(v2.ctx, "v2", version === "v2");
      v1.texture.needsUpdate = true;
      v2.texture.needsUpdate = true;
    }
    const day = formatDate(lab.asOf);
    if (day !== s.day) {
      s.day = day;
      drawCard(card.ctx, lab.asOf);
      card.texture.needsUpdate = true;
    }

    // the version in force rises and leans forward; the other settles back
    const k = 1 - Math.exp(-delta * 6);
    for (const [ref, v] of [
      [doc1, "v1"],
      [doc2, "v2"],
    ] as const) {
      const g = ref.current;
      if (!g) continue;
      const on = version === v ? 1 : 0;
      g.position.y += ((v === "v1" ? 0.98 : 0.8) + on * 0.1 - g.position.y) * k;
      g.scale.setScalar(g.scale.x + ((0.9 + on * 0.12) - g.scale.x) * k);
    }

    // the date marker rides the timeline
    if (knob.current) knob.current.position.x = (0.5 - toU(lab.asOf)) * RAIL_W;

    // the card faces the camera and floats
    const c = cardMesh.current;
    if (c) {
      c.getWorldPosition(world);
      c.lookAt(camera.position.x, world.y, camera.position.z);
      c.position.y = labCardLocal(portrait)[1] + Math.sin(t * 1.3) * 0.015;
    }

    // questions in three languages orbit the archive
    const g = tags.current;
    if (g) {
      g.children.forEach((tag, i) => {
        const a = t * 0.35 + (i / g.children.length) * Math.PI * 2;
        tag.position.set(Math.cos(a) * 0.95, 1.6 + Math.sin(t * 1.1 + i) * 0.04, 0.45 + Math.sin(a) * 0.55);
        tag.getWorldPosition(world);
        tag.lookAt(camera.position.x, world.y, camera.position.z);
      });
    }

    // the test run's status light blinks
    if (status.current) status.current.visible = Math.sin(t * 4) > -0.2;
  });

  const cardPos = labCardLocal(portrait);
  return (
    <group>
      <mesh position-y={0.02} material={shared.slab}>
        <boxGeometry args={[2.9, 0.04, 2.9]} />
      </mesh>

      {/* the archive: a long low building with a deck for the rule documents */}
      <mesh position={[0, 0.25, 0.45]} material={shared.body}>
        <boxGeometry args={[1.6, 0.42, 0.95]} />
      </mesh>
      <mesh position={[0, 0.475, 0.45]} material={mats.deck}>
        <boxGeometry args={[1.7, 0.03, 1.05]} />
      </mesh>
      {/* a lit slot along the front, like a reading room */}
      <mesh position={[0, 0.27, -0.031]} rotation-y={Math.PI} material={shared.lime}>
        <planeGeometry args={[1.3, 0.035]} />
      </mesh>

      {/* the two versions of the rule, v1 behind and higher, v2 in front */}
      <group ref={doc1} position={[0.12, 0.98, 0.72]} rotation-x={0.12} userData={{ dynamic: true }}>
        <mesh rotation-y={Math.PI} material={docMats.v1}>
          <planeGeometry args={[0.95, (0.95 * DOC_H) / DOC_W]} />
        </mesh>
      </group>
      <group ref={doc2} position={[-0.12, 0.8, 0.36]} rotation-x={0.12} userData={{ dynamic: true }}>
        <mesh rotation-y={Math.PI} material={docMats.v2}>
          <planeGeometry args={[0.95, (0.95 * DOC_H) / DOC_W]} />
        </mesh>
      </group>

      {/* the timeline, tilted up towards the camera, with the "as of" marker */}
      <group position={RAIL} rotation-x={RAIL_TILT}>
        <mesh rotation-y={Math.PI} material={docMats.rail}>
          <planeGeometry args={[RAIL_W, RAIL_H]} />
        </mesh>
        <group ref={knob} position={[0, (0.5 - 92 / RAIL_PX_H) * RAIL_H, -0.02]} userData={{ dynamic: true }}>
          <mesh material={shared.lime}>
            <sphereGeometry args={[0.04, 14, 10]} />
          </mesh>
          <mesh position-z={-0.16} rotation-x={Math.PI / 2} material={mats.beam}>
            <cylinderGeometry args={[0.012, 0.012, 0.32, 8, 1, true]} />
          </mesh>
        </group>
      </group>

      <mesh ref={cardMesh} position={cardPos} material={docMats.card} userData={{ dynamic: true }}>
        <planeGeometry args={[portrait ? 0.85 : 0.95, ((portrait ? 0.85 : 0.95) * CARD_H) / CARD_W]} />
      </mesh>

      <group ref={tags} userData={{ dynamic: true }}>
        {TAGS.map((tag) => (
          <group key={tag.text}>
            <LanguageTag text={tag.text} font={tag.font} />
          </group>
        ))}
      </group>

      {/* still being built: the confirmatory test run */}
      <Scaffold width={0.45} depth={0.45} height={0.75} position={[0.66, 0.49, 0.72]} />
      <mesh ref={status} position={[0.66, 1.28, 0.72]} material={mats.status} userData={{ dynamic: true }}>
        <sphereGeometry args={[0.035, 10, 8]} />
      </mesh>
      <Sign lines={["Test split", "Running"]} width={0.62} position={[0.66, 0.66, 0.06]} />

      {project.live && <LivePortal position={labPortalLocal(portrait)} />}

      <Sign
        lines={[`Research Lab · ${Math.round(project.progress * 100)}% built`, project.title]}
        position={[0, 2.45, 0.3]}
        accent={project.accent}
      />
    </group>
  );
}
