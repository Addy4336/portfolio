"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import { boot } from "../boot";
import { palette } from "../palette";
import type { Building } from "./layout";

/** HQ tiers: base height, size. They join the instanced skyline so they get windows for free. */
const TIERS: [number, number, number][] = [
  // [baseY, width, height]
  [0.3, 1.35, 1.7],
  [2.0, 1.0, 1.5],
  [3.5, 0.68, 1.1],
];
export const HQ_TOP = 4.6;

export const hqBuildings: Building[] = TIERS.map(([y, w, h], i) => ({
  x: 0,
  y,
  z: 0,
  w,
  d: w,
  h,
  seed: 0.31 + i * 0.17,
  block: "hq",
  delay: 0,
}));

/** Everything about the HQ that isn't a plain box: plaza, light bands, antenna and the lime beacon. */
export function HQ() {
  const beacon = useRef<Group>(null);
  const tip = useRef<Mesh>(null);
  const root = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const grow = Math.min(1, boot.value * 1.6);
    if (root.current) root.current.scale.y = Math.max(0.001, grow);
    if (beacon.current) {
      beacon.current.rotation.y = t * 0.6;
      beacon.current.position.y = HQ_TOP + 0.55 + Math.sin(t * 1.4) * 0.05;
    }
    if (tip.current) {
      const pulse = 0.75 + Math.sin(t * 2.2) * 0.25;
      tip.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* plaza and podium */}
      <mesh position-y={0.03}>
        <boxGeometry args={[2.9, 0.06, 2.9]} />
        <meshLambertMaterial color="#141a2a" />
      </mesh>
      <mesh position-y={0.18}>
        <boxGeometry args={[1.9, 0.3, 1.9]} />
        <meshLambertMaterial color={palette.buildingLight} />
      </mesh>
      <group ref={root}>
        {/* violet light bands at the top of each tier */}
        {TIERS.map(([y, w, h]) => (
          <mesh key={y} position-y={y + h - 0.03}>
            <boxGeometry args={[w + 0.04, 0.05, w + 0.04]} />
            <meshBasicMaterial color={palette.violet} toneMapped={false} />
          </mesh>
        ))}
        {/* lime corner strips on the middle tier */}
        {[
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ].map(([sx, sz]) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.51, 2.75, sz * 0.51]}>
            <boxGeometry args={[0.025, 1.3, 0.025]} />
            <meshBasicMaterial color={palette.signal} toneMapped={false} />
          </mesh>
        ))}
        {/* antenna */}
        <mesh position-y={HQ_TOP + 0.45}>
          <cylinderGeometry args={[0.02, 0.035, 0.9, 6]} />
          <meshLambertMaterial color={palette.buildingLight} />
        </mesh>
      </group>
      {/* beacon: a slowly turning ring around a pulsing light */}
      <group ref={beacon}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.3, 0.018, 8, 48]} />
          <meshBasicMaterial color={palette.signal} toneMapped={false} />
        </mesh>
        <mesh ref={tip} position-y={0.38}>
          <sphereGeometry args={[0.055, 16, 12]} />
          <meshBasicMaterial color={palette.signal} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
