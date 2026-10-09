"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
} from "three";
import { pipelineState } from "@/lib/pipeline-state";
import { boot } from "../boot";
import { StaticBatch } from "../StaticBatch";
import { palette } from "../palette";
import { LEG_STATION, packetAt, STATIONS, type StationId } from "./route";

/** 0…1 per station: how "lit" it is. Shared so each station can read its own. */
const activation: Record<StationId, number> = { ear: 0, brain: 0, hands: 0, voice: 0 };
const dwelling = { value: false };

function useStationMaterials() {
  return useMemo(
    () => ({
      body: new MeshLambertMaterial({ color: palette.buildingLight }),
      dark: new MeshLambertMaterial({ color: "#171c2b" }),
      pale: new MeshLambertMaterial({ color: "#b9bfd8", side: DoubleSide }),
      lime: new MeshBasicMaterial({ color: palette.signal, toneMapped: false }),
      violet: new MeshBasicMaterial({ color: palette.violet, toneMapped: false }),
    }),
    [],
  );
}

type Mats = ReturnType<typeof useStationMaterials>;

/** Ground ring + light beam shared by every station; brightness follows activation. */
function StationBase({ id }: { id: StationId }) {
  const ring = useRef<Mesh>(null);
  const beam = useRef<Mesh>(null);
  const mats = useMemo(
    () => ({
      ring: new MeshBasicMaterial({ color: palette.signal, toneMapped: false, transparent: true }),
      beam: new MeshBasicMaterial({
        color: palette.signal,
        toneMapped: false,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    }),
    [],
  );
  useFrame(({ clock }) => {
    const a = activation[id];
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 6);
    mats.ring.opacity = 0.18 + a * (0.55 + (dwelling.value ? pulse * 0.3 : 0));
    mats.beam.opacity = a * 0.22;
    if (ring.current) ring.current.scale.setScalar(1 + a * 0.08);
    if (beam.current) beam.current.visible = a > 0.01;
  });
  return (
    <group>
      <mesh position-y={0.02}>
        <boxGeometry args={[2.7, 0.04, 2.7]} />
        <meshLambertMaterial color="#121726" />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.045} material={mats.ring}>
        <ringGeometry args={[0.92, 0.97, 64]} />
      </mesh>
      <mesh ref={beam} position-y={2.2} material={mats.beam}>
        <cylinderGeometry args={[0.05, 0.05, 4.4, 8, 1, true]} />
      </mesh>
    </group>
  );
}

/** Listen: a dish antenna turned to the world outside the city. */
function Ear({ mats }: { mats: Mats }) {
  const horn = useRef<Mesh>(null);
  useFrame(() => {
    if (horn.current) horn.current.scale.setScalar(0.6 + activation.ear * 0.9);
  });
  return (
    <group>
      <mesh position-y={0.24} material={mats.body}>
        <boxGeometry args={[0.8, 0.44, 0.8]} />
      </mesh>
      <mesh position-y={0.72} material={mats.dark}>
        <cylinderGeometry args={[0.045, 0.06, 0.6, 8]} />
      </mesh>
      {/* the dish faces away from HQ (local −z) and up */}
      <group position-y={1.02} rotation-x={-0.9}>
        {/* a spherical cap flipped into a bowl, its lowest point at the mount */}
        <mesh position-y={0.42} rotation-x={Math.PI} material={mats.pale}>
          <sphereGeometry args={[0.46, 28, 10, 0, Math.PI * 2, 0, Math.PI * 0.3]} />
        </mesh>
        <mesh position-y={0.12} material={mats.dark}>
          <cylinderGeometry args={[0.012, 0.012, 0.24, 6]} />
        </mesh>
        <mesh ref={horn} position-y={0.24} material={mats.lime} userData={{ dynamic: true }}>
          <sphereGeometry args={[0.045, 12, 8]} />
        </mesh>
      </group>
    </group>
  );
}

/** Think: a violet core inside two orbiting rings. */
function Brain({ mats }: { mats: Mats }) {
  const rings = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const coreMat = useMemo(() => new MeshBasicMaterial({ color: palette.violet, toneMapped: false }), []);
  const dim = useMemo(() => new Color(palette.violet).multiplyScalar(0.45), []);
  const bright = useMemo(() => new Color(palette.violet).multiplyScalar(1.7), []);
  useFrame((_, delta) => {
    const a = activation.brain;
    if (rings.current) {
      rings.current.rotation.y += delta * (0.4 + a * 3);
      rings.current.children[1].rotation.z += delta * (0.6 + a * 4);
    }
    coreMat.color.copy(dim).lerp(bright, a);
    if (core.current) core.current.scale.setScalar(1 + a * 0.12 * (dwelling.value ? 1.4 : 1));
  });
  return (
    <group>
      <mesh position-y={0.18} material={mats.body}>
        <cylinderGeometry args={[0.55, 0.62, 0.36, 24]} />
      </mesh>
      <mesh position-y={0.62} material={mats.dark}>
        <cylinderGeometry args={[0.07, 0.1, 0.55, 10]} />
      </mesh>
      <mesh ref={core} position-y={1.12} material={coreMat} userData={{ dynamic: true }}>
        <sphereGeometry args={[0.26, 24, 16]} />
      </mesh>
      <group ref={rings} position-y={1.12} userData={{ dynamic: true }}>
        <mesh rotation-x={Math.PI / 2.4} material={mats.lime}>
          <torusGeometry args={[0.44, 0.012, 8, 64]} />
        </mesh>
        <mesh rotation-x={-Math.PI / 3} material={mats.violet}>
          <torusGeometry args={[0.54, 0.01, 8, 64]} />
        </mesh>
      </group>
    </group>
  );
}

/** Act: a depot with a crane that swings when a tool call runs. */
function Hands({ mats }: { mats: Mats }) {
  const arm = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (arm.current) {
      const a = activation.hands;
      arm.current.rotation.y = 0.4 + Math.sin(clock.elapsedTime * 2.2) * 0.9 * a;
    }
  });
  const crates: [number, number, number][] = [
    [0.45, 0.09, 0.62],
    [0.66, 0.09, 0.62],
    [0.55, 0.27, 0.62],
    [-0.62, 0.09, 0.6],
  ];
  return (
    <group>
      <mesh position-y={0.28} material={mats.body}>
        <boxGeometry args={[1.3, 0.56, 0.8]} />
      </mesh>
      <mesh position={[0, 0.57, 0]} material={mats.lime}>
        <boxGeometry args={[1.32, 0.025, 0.06]} />
      </mesh>
      {crates.map((p, i) => (
        <mesh key={i} position={p} material={i === 2 ? mats.lime : mats.dark}>
          <boxGeometry args={[0.18, 0.18, 0.18]} />
        </mesh>
      ))}
      {/* crane: mast + swinging arm with a hook */}
      <mesh position={[-0.55, 0.85, -0.25]} material={mats.dark}>
        <boxGeometry args={[0.07, 1.7, 0.07]} />
      </mesh>
      <group ref={arm} position={[-0.55, 1.68, -0.25]} userData={{ dynamic: true }}>
        <mesh position-x={0.42} material={mats.pale}>
          <boxGeometry args={[0.95, 0.05, 0.05]} />
        </mesh>
        <mesh position={[0.82, -0.25, 0]} material={mats.dark}>
          <cylinderGeometry args={[0.006, 0.006, 0.5, 4]} />
        </mesh>
        <mesh position={[0.82, -0.52, 0]} material={mats.lime}>
          <boxGeometry args={[0.08, 0.06, 0.08]} />
        </mesh>
      </group>
    </group>
  );
}

/** Speak: a speaker tower sending rings out of the city. */
function Voice({ mats }: { mats: Mats }) {
  const rings = useRef<Group>(null);
  const ringMats = useMemo(
    () =>
      [0, 1, 2].map(
        () =>
          new MeshBasicMaterial({
            color: palette.signal,
            toneMapped: false,
            transparent: true,
            depthWrite: false,
          }),
      ),
    [],
  );
  useFrame(({ clock }) => {
    const a = activation.voice;
    const group = rings.current;
    if (!group) return;
    group.children.forEach((child, i) => {
      const phase = (clock.elapsedTime * 0.9 + i / 3) % 1;
      child.position.z = -0.3 - phase * 1.6;
      child.scale.setScalar(0.4 + phase * 1.6);
      ringMats[i].opacity = a * (1 - phase) * 0.9;
    });
  });
  return (
    <group>
      <mesh position-y={0.78} material={mats.body}>
        <boxGeometry args={[0.62, 1.56, 0.5]} />
      </mesh>
      {/* speaker cones on the outward face (local −z) */}
      {[0.4, 0.8, 1.2].map((y) => (
        <group key={y} position={[0, y, -0.26]} rotation-x={Math.PI / 2}>
          <mesh material={mats.dark}>
            <cylinderGeometry args={[0.14, 0.14, 0.03, 20]} />
          </mesh>
          <mesh position-y={-0.016} rotation-x={Math.PI / 2} material={mats.lime}>
            <torusGeometry args={[0.13, 0.008, 6, 28]} />
          </mesh>
        </group>
      ))}
      <group ref={rings} position-y={0.8} userData={{ dynamic: true }}>
        {ringMats.map((m, i) => (
          <mesh key={i} material={m}>
            <torusGeometry args={[0.34, 0.012, 6, 40]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const STATION_PARTS = { ear: Ear, brain: Brain, hands: Hands, voice: Voice };

/** The four pipeline stations on the edge-middle blocks, each facing HQ. */
export function Stations() {
  const mats = useStationMaterials();
  const root = useRef<Group>(null);
  const tmp = useMemo<[number, number]>(() => [0, 0], []);

  useFrame((_, delta) => {
    const { leg, dwelling: d } = packetAt(pipelineState.progress, tmp);
    dwelling.value = d;
    const k = 1 - Math.exp(-delta * 5);
    for (const id of Object.keys(activation) as StationId[]) {
      // Brain stays lit through the act leg too: it's waiting on the tool.
      const lit = LEG_STATION[leg] === id || (leg === 2 && id === "brain");
      const target = lit ? pipelineState.presence * (id === "brain" && leg === 2 ? 0.5 : 1) : 0;
      activation[id] += (target - activation[id]) * k;
    }
    if (root.current) root.current.scale.y = Math.max(0.001, Math.min(1, (boot.value - 0.3) / 0.5));
  });

  return (
    <group ref={root}>
      <StaticBatch>
        {(Object.keys(STATIONS) as StationId[]).map((id) => {
          const [x, z] = STATIONS[id];
          const Part = STATION_PARTS[id];
          return (
            <group key={id} position={[x, 0, z]} rotation-y={Math.atan2(-x, -z)}>
              <StationBase id={id} />
              <Part mats={mats} />
            </group>
          );
        })}
      </StaticBatch>
    </group>
  );
}
