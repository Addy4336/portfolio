"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { chirp } from "@/lib/ambience";
import type { CityProject } from "@/lib/districts";
import { booking, BOOKING_EVENT, pressBooking, tickBooking, villa, VILLA_TOGGLE_EVENT } from "@/lib/estate-state";
import { palette } from "../palette";
import { LivePortal } from "./LivePortal";
import { Sign } from "./Sign";
import { VideoScreen } from "./VideoScreen";

/** Materials shared with the other districts (so static batching can merge them). */
type SharedMats = { slab: MeshLambertMaterial; warm: MeshBasicMaterial; dark: MeshLambertMaterial };

// Positions in the Estate's own frame (local −z faces out of the city; +x shows on screen left).
const CX = -0.1;
const CZ = 0.05;
/** Ground floor: base height, height, width, depth. */
const Y0 = 0.1;
const H1 = 0.36;
const W1 = 1.3;
const D1 = 0.9;
/** Upper floor, cantilevered towards screen left. */
const UX = CX + 0.18;
const UZ = CZ - 0.05;
const Y1 = 0.51;
const H2 = 0.32;
const W2 = 1.05;
const D2 = 0.84;

/** Where the city's picker looks for the villa, the booking card and the portal. */
export const VILLA_LOCAL: [number, number, number] = [CX + 0.05, 0.5, CZ];
/** The booking card floats beside the villa; a portrait phone pulls it in so it stays on screen. */
export function bookingLocal(portrait: boolean): [number, number, number] {
  return portrait ? [-0.55, 1.12, -1.0] : [-1.0, 1.02, -0.95];
}
export const ESTATE_PORTAL_LOCAL: [number, number, number] = [1.05, 0.04, -1.15];

/** The billboard loop is cropped to the tour's 3D view: 560 × 418. */
const BOARD_ASPECT = 560 / 418;
const ESTATE_SECTIONS = '[data-cam="district-estate"],[data-cam="work-estate"]';

const box = (w: number, h: number, d: number, x: number, y: number, z: number) =>
  new BoxGeometry(w, h, d).translate(x, y, z);

function merge(parts: BufferGeometry[]) {
  const g = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return g;
}

function Palm({ position, lean = 0.12, mats }: { position: [number, number, number]; lean?: number; mats: { trunk: MeshLambertMaterial; leaf: MeshLambertMaterial } }) {
  const fronds = [0, 1, 2, 3, 4, 5];
  return (
    <group position={position} rotation-z={lean}>
      <mesh position-y={0.32} material={mats.trunk}>
        <cylinderGeometry args={[0.018, 0.03, 0.64, 6]} />
      </mesh>
      {fronds.map((i) => (
        <mesh
          key={i}
          position={[Math.cos((i / fronds.length) * Math.PI * 2) * 0.12, 0.64, Math.sin((i / fronds.length) * Math.PI * 2) * 0.12]}
          rotation={[0, -(i / fronds.length) * Math.PI * 2, -0.45]}
          scale={[0.17, 0.016, 0.05]}
          material={mats.leaf}
        >
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * NexState: a modern two-storey villa, built in code like the one in its own
 * 3D tour, with a pool and palms. Click it and the roof lifts away to show the
 * furnished rooms (NexState's cutaway, in miniature); until someone does, it
 * opens and closes by itself while the district is on screen. Next to it, a
 * screen loops the real tour, a demo booking card books once and refuses
 * the same dates twice, and a portal opens the live site.
 */
export function EstateLive({ project, shared }: { project: CityProject; shared: SharedMats }) {
  const mats = useMemo(
    () => ({
      render: new MeshLambertMaterial({ color: "#efe6d2", emissive: "#3b3020" }),
      glow: new MeshBasicMaterial({ color: "#f4b25e", toneMapped: false }),
      wood: new MeshLambertMaterial({ color: "#8a5a34" }),
      sofa: new MeshLambertMaterial({ color: "#3a4363" }),
      sheet: new MeshLambertMaterial({ color: "#d9d6cf" }),
      lawn: new MeshLambertMaterial({ color: "#1b3626" }),
      sand: new MeshLambertMaterial({ color: "#a8977a" }),
      trunk: new MeshLambertMaterial({ color: "#6b4a2e" }),
      leaf: new MeshLambertMaterial({ color: "#2f7048" }),
      water: new MeshBasicMaterial({ color: "#22c4bd", toneMapped: false }),
      glass: new MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        side: DoubleSide,
      }),
    }),
    [],
  );

  // The part that lifts off: roof slab, lattice screen and upper glass, merged
  // into as few meshes as possible since it can't be statically batched.
  // The roof is a lid hinged at its back edge; the front screen is a blind
  // that folds down into the floor. Each is one or two merged meshes.
  const lift = useMemo(() => {
    const depth = D2 + 0.18;
    const hinge: [number, number, number] = [UX, Y1 + H2, UZ + depth / 2];
    const roof = merge([box(W2 + 0.22, 0.05, depth, 0, 0.025, -depth / 2)]);
    const front = UZ - D2 / 2 + 0.012;
    const slats: BufferGeometry[] = [];
    const left = UX + 0.03;
    const right = UX + W2 / 2 - 0.04;
    for (let i = 0; i < 9; i++) slats.push(box(0.022, H2 - 0.03, 0.022, left + ((right - left) * i) / 8, H2 / 2, front));
    slats.push(box(right - left + 0.03, 0.018, 0.026, (left + right) / 2, 0.02, front));
    slats.push(box(right - left + 0.03, 0.018, 0.026, (left + right) / 2, H2 - 0.02, front));
    return { hinge, roof, slats: merge(slats), glassX: UX - W2 / 4, front };
  }, []);

  const portrait = useThree((t) => t.size.width / t.size.height < 0.9);
  const lidRef = useRef<Group>(null);
  const blindRef = useRef<Group>(null);
  const auto = useRef({ touched: false, nextFlip: 2.5 });

  useEffect(() => {
    const onToggle = () => {
      auto.current.touched = true;
      villa.open = !villa.open;
      chirp();
    };
    const onBook = () => {
      pressBooking();
      chirp();
    };
    window.addEventListener(VILLA_TOGGLE_EVENT, onToggle);
    window.addEventListener(BOOKING_EVENT, onBook);
    return () => {
      window.removeEventListener(VILLA_TOGGLE_EVENT, onToggle);
      window.removeEventListener(BOOKING_EVENT, onBook);
      villa.open = false;
      villa.amount = 0;
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const a = auto.current;
    // Until a visitor takes over, the roof opens and closes by itself while
    // the Estate is on screen, so the trick is never missed.
    if (!a.touched && t > a.nextFlip) {
      const el = document.querySelector(ESTATE_SECTIONS);
      const r = el?.getBoundingClientRect();
      const near = !!r && r.bottom > 0 && r.top < window.innerHeight;
      villa.open = near ? !villa.open : false;
      a.nextFlip = t + (villa.open ? 4.5 : 3.5);
    }
    villa.amount += ((villa.open ? 1 : 0) - villa.amount) * (1 - Math.exp(-delta * 4));
    const e = villa.amount;
    if (lidRef.current) {
      lidRef.current.rotation.x = e * 0.85;
      lidRef.current.position.y = lift.hinge[1] + e * 0.05;
    }
    if (blindRef.current) blindRef.current.scale.y = Math.max(0.04, 1 - e * 0.96);
    tickBooking();
  });

  return (
    <group>
      {/* lawn, plinth and the pool deck */}
      <mesh position={[0, 0.05, 0]} material={mats.lawn}>
        <boxGeometry args={[2.7, 0.02, 2.7]} />
      </mesh>
      <mesh position={[CX, 0.08, CZ]} material={mats.sand}>
        <boxGeometry args={[1.45, 0.04, 1.05]} />
      </mesh>
      <mesh position={[CX - 0.05, 0.08, CZ - 0.8]} material={mats.sand}>
        <boxGeometry args={[1.08, 0.04, 0.44]} />
      </mesh>
      <mesh position={[CX - 0.05, 0.102, CZ - 0.8]} rotation-x={-Math.PI / 2} material={mats.water}>
        <planeGeometry args={[0.96, 0.32]} />
      </mesh>

      {/* ground floor: an open-fronted room, lit from inside */}
      <mesh position={[CX, Y0 + H1 / 2, CZ + D1 / 2 - 0.02]} material={mats.render}>
        <boxGeometry args={[W1, H1, 0.04]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[CX + s * (W1 / 2 - 0.02), Y0 + H1 / 2, CZ]} material={mats.render}>
          <boxGeometry args={[0.04, H1, D1]} />
        </mesh>
      ))}
      <mesh position={[CX, Y0 + 0.2, CZ + D1 / 2 - 0.045]} rotation-y={Math.PI} material={mats.glow}>
        <planeGeometry args={[W1 - 0.24, 0.22]} />
      </mesh>
      <mesh position={[CX, Y0 + 0.011, CZ]} material={mats.wood}>
        <boxGeometry args={[W1 - 0.06, 0.02, D1 - 0.06]} />
      </mesh>
      <mesh position={[CX + 0.3, Y0 + 0.07, CZ + 0.24]} material={mats.sofa}>
        <boxGeometry args={[0.42, 0.1, 0.15]} />
      </mesh>
      <mesh position={[CX + 0.3, Y0 + 0.14, CZ + 0.31]} material={mats.sofa}>
        <boxGeometry args={[0.42, 0.12, 0.04]} />
      </mesh>
      <mesh position={[CX + 0.3, Y0 + 0.05, CZ + 0.01]} material={mats.wood}>
        <boxGeometry args={[0.2, 0.035, 0.12]} />
      </mesh>
      <mesh position={[CX - 0.32, Y0 + 0.13, CZ + 0.06]} material={mats.wood}>
        <boxGeometry args={[0.3, 0.025, 0.18]} />
      </mesh>
      <mesh position={[CX - 0.32, Y0 + 0.065, CZ + 0.06]} material={shared.dark}>
        <boxGeometry args={[0.035, 0.11, 0.035]} />
      </mesh>
      <mesh position={[CX - 0.05, Y0 + 0.3, CZ + 0.3]} material={mats.glow}>
        <sphereGeometry args={[0.035, 10, 8]} />
      </mesh>
      <mesh position={[CX, Y0 + H1 / 2, CZ - D1 / 2 + 0.01]} material={mats.glass}>
        <planeGeometry args={[W1 - 0.04, H1 - 0.02]} />
      </mesh>

      {/* the slab between floors, overhanging both */}
      <mesh position={[CX + 0.05, Y1 - 0.025, CZ - 0.03]} material={mats.render}>
        <boxGeometry args={[1.5, 0.05, 1.08]} />
      </mesh>

      {/* upper floor: the bedroom */}
      <mesh position={[UX, Y1 + H2 / 2, UZ + D2 / 2 - 0.02]} material={mats.render}>
        <boxGeometry args={[W2, H2, 0.04]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[UX + s * (W2 / 2 - 0.02), Y1 + H2 / 2, UZ]} material={mats.render}>
          <boxGeometry args={[0.04, H2, D2]} />
        </mesh>
      ))}
      <mesh position={[UX, Y1 + 0.17, UZ + D2 / 2 - 0.045]} rotation-y={Math.PI} material={mats.glow}>
        <planeGeometry args={[W2 - 0.24, 0.18]} />
      </mesh>
      <mesh position={[UX, Y1 + 0.011, UZ]} material={mats.wood}>
        <boxGeometry args={[W2 - 0.06, 0.02, D2 - 0.06]} />
      </mesh>
      <mesh position={[UX + 0.14, Y1 + 0.055, UZ + 0.1]} material={mats.sheet}>
        <boxGeometry args={[0.34, 0.07, 0.44]} />
      </mesh>
      <mesh position={[UX + 0.14, Y1 + 0.11, UZ + 0.33]} material={mats.wood}>
        <boxGeometry args={[0.36, 0.14, 0.03]} />
      </mesh>
      <mesh position={[UX - 0.12, Y1 + 0.09, UZ + 0.3]} material={mats.glow}>
        <sphereGeometry args={[0.028, 10, 8]} />
      </mesh>

      {/* the roof lifts open on its back edge; the upper front folds away */}
      <group ref={lidRef} position={lift.hinge} userData={{ dynamic: true }}>
        <mesh geometry={lift.roof} material={mats.render} />
      </group>
      <group ref={blindRef} position-y={Y1} userData={{ dynamic: true }}>
        <mesh geometry={lift.slats} material={mats.wood} />
        <mesh position={[lift.glassX, H2 / 2, lift.front]} material={mats.glass}>
          <planeGeometry args={[W2 / 2 - 0.05, H2 - 0.03]} />
        </mesh>
      </group>

      <Palm position={[0.95, 0.06, -0.4]} lean={-0.14} mats={mats} />
      <Palm position={[-1.02, 0.06, 0.62]} lean={0.1} mats={mats} />
      <Palm position={[-0.5, 0.06, 1.05]} lean={-0.06} mats={mats} />

      {/* the real tour, on a mast behind the villa */}
      {project.screen && (
        <>
          <mesh position={[1.0, 0.62, 0.86]} material={shared.dark}>
            <boxGeometry args={[0.05, 1.2, 0.05]} />
          </mesh>
          <VideoScreen
            screen={project.screen}
            position={[1.0, 1.5, 0.82]}
            width={0.95}
            aspect={BOARD_ASPECT}
            sections={ESTATE_SECTIONS}
          />
        </>
      )}

      <BookingCard position={bookingLocal(portrait)} width={portrait ? 0.85 : 0.95} />
      {project.live && <LivePortal position={ESTATE_PORTAL_LOCAL} />}

      <Sign lines={["Estate Quarter", project.title]} position={[-0.1, 2.25, 0.2]} accent={project.accent} />
      <mesh position-y={0.02} material={shared.slab}>
        <boxGeometry args={[2.9, 0.04, 2.9]} />
      </mesh>
    </group>
  );
}

const CARD_W = 512;
const CARD_H = 320;

/**
 * A floating listing card with a Reserve button. The first press books the
 * dates; a second press for the same dates is refused, the way NexState's
 * booking function rejects overlapping dates. Then the demo resets.
 */
function BookingCard({ position, width = 0.95 }: { position: [number, number, number]; width?: number }) {
  const mesh = useRef<Mesh>(null);
  const seen = useRef(-1);

  const { texture, material } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, depthWrite: false });
    return { texture, material };
  }, []);

  const draw = useMemo(
    () => () => {
      const ctx = (texture.image as HTMLCanvasElement).getContext("2d")!;
      const s = booking.state;
      const accent = s === "booked" ? palette.signal : s === "conflict" ? "#ff8a7a" : palette.paper;
      ctx.clearRect(0, 0, CARD_W, CARD_H);
      ctx.fillStyle = "rgba(7, 8, 12, 0.93)";
      ctx.strokeStyle = s === "available" ? "rgba(237, 234, 226, 0.55)" : accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(4, 4, CARD_W - 8, CARD_H - 8, 26);
      ctx.fill();
      ctx.stroke();
      ctx.textBaseline = "middle";

      const label = s === "available" ? "DEMO LISTING · NEXSTATE" : s === "booked" ? "BOOKED ✓" : "REFUSED";
      ctx.fillStyle = s === "available" ? "rgba(237, 234, 226, 0.7)" : accent;
      ctx.font = '500 24px "Geist Mono", ui-monospace, monospace';
      ctx.fillText(label, 32, 42);

      const title = s === "available" ? "Courtyard Villa" : s === "booked" ? "Dates locked" : "Already booked";
      ctx.fillStyle = palette.paper;
      ctx.font = "600 40px Unbounded, system-ui, sans-serif";
      ctx.fillText(title, 32, 94);

      const lines =
        s === "available"
          ? ["₹1.6L a month · 21–24 Oct", "Quote priced on the server"]
          : s === "booked"
            ? ["21–24 Oct is yours.", "Paid via Razorpay (test mode)"]
            : ["Those dates were just taken.", "No double-booking, ever."];
      ctx.fillStyle = "rgba(237, 234, 226, 0.78)";
      ctx.font = "500 26px Geist, system-ui, sans-serif";
      lines.forEach((l, i) => ctx.fillText(l, 32, 146 + i * 36));

      // the button
      const button = s === "available" ? "RESERVE" : s === "booked" ? "BOOK THE SAME DATES" : "RELEASING THE DEMO…";
      ctx.font = '600 24px "Geist Mono", ui-monospace, monospace';
      const bw = ctx.measureText(button).width + 52;
      ctx.beginPath();
      ctx.roundRect(32, 228, bw, 56, 28);
      if (s === "available") {
        ctx.fillStyle = palette.signal;
        ctx.fill();
        ctx.fillStyle = palette.void;
      } else {
        ctx.strokeStyle = s === "booked" ? palette.signal : "rgba(237, 234, 226, 0.4)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = s === "booked" ? palette.signal : "rgba(237, 234, 226, 0.6)";
      }
      ctx.fillText(button, 58, 257);
      texture.needsUpdate = true;
    },
    [texture],
  );

  const world = useMemo(() => new Vector3(), []);
  useFrame(({ clock, camera }) => {
    const m = mesh.current;
    if (!m) return;
    if (booking.version !== seen.current) {
      seen.current = booking.version;
      draw();
    }
    m.getWorldPosition(world);
    m.lookAt(camera.position.x, world.y, camera.position.z);
    m.position.y = position[1] + Math.sin(clock.elapsedTime * 1.3) * 0.015;
    // a little nudge when the booking is refused
    const since = performance.now() / 1000 - booking.since;
    m.position.x = position[0] + (booking.state === "conflict" && since < 0.5 ? Math.sin(since * 60) * 0.012 : 0);
  });

  useEffect(() => {
    Promise.all([document.fonts.load("600 40px Unbounded"), document.fonts.load("500 26px Geist")])
      .then(() => (seen.current = -1))
      .catch(() => {});
    return () => {
      texture.dispose();
      material.dispose();
    };
  }, [texture, material]);

  return (
    <mesh ref={mesh} position={position} material={material} userData={{ dynamic: true }}>
      <planeGeometry args={[width, (width * CARD_H) / CARD_W]} />
    </mesh>
  );
}
