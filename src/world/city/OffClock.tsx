"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group, MeshBasicMaterial, MeshLambertMaterial } from "three";
import { boot } from "../boot";
import { palette } from "../palette";
import { Character } from "./Character";
import { useUnderglowMaterial } from "./Ground";
import { ISLAND_HALF } from "./layout";
import { Sign } from "./Sign";

/** The little "off the clock" island, floating west of the city. */
export const OFFCLOCK_CENTRE: [number, number, number] = [-11, 0.35, -3];
const HALF_W = 1.7;
const HALF_D = 1.5;

type Item = { title: string; note: string };

/**
 * Life outside work as a small park island next to the city, joined by a
 * lime footbridge: a tree with fairy lights, a lamp, and Adi on a bench with
 * the headphones on. Each "off the clock" item gets a lit sign.
 */
export function OffClock({ items }: { items: readonly Item[] }) {
  const root = useRef<Group>(null);
  const fairy = useRef<Group>(null);
  const mats = useMemo(
    () => ({
      slab: new MeshLambertMaterial({ color: "#0a0d16" }),
      lawn: new MeshLambertMaterial({ color: "#0f2a24" }),
      trunk: new MeshLambertMaterial({ color: "#3a2e44" }),
      leaves: new MeshLambertMaterial({ color: "#1c4d42" }),
      wood: new MeshLambertMaterial({ color: "#4a3f5c" }),
      metal: new MeshLambertMaterial({ color: "#2b3247" }),
      warm: new MeshBasicMaterial({ color: "#f0d9a0", toneMapped: false }),
      lime: new MeshBasicMaterial({ color: palette.signal, toneMapped: false }),
      violet: new MeshBasicMaterial({ color: palette.violet, toneMapped: false }),
    }),
    [],
  );
  const underglow = useUnderglowMaterial();

  const lights = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return [Math.cos(a) * 0.36, 0.62 + Math.sin(i * 1.7) * 0.12, Math.sin(a) * 0.36] as [number, number, number];
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (root.current) root.current.scale.setScalar(Math.max(0.001, Math.min(1, (boot.value - 0.6) / 0.4)));
    fairy.current?.children.forEach((l, i) => {
      l.visible = Math.sin(clock.elapsedTime * 2 + i * 2.3) > -0.3;
    });
  });

  const [cx, cy, cz] = OFFCLOCK_CENTRE;
  // Footbridge from the main island's west edge to this island's east edge.
  const bridgeFrom = -ISLAND_HALF;
  const bridgeTo = cx + HALF_W;
  const bridgeLen = bridgeFrom - bridgeTo;
  // Kept clear of the tree (back left) and the bench (centre).
  const signSpots: [number, number, number][] = [
    [-0.9, 1.75, -1.0],
    [1.05, 1.35, -1.0],
    [-1.25, 0.95, 0.95],
    [1.25, 0.95, 0.95],
  ];

  return (
    <group>
      <mesh
        position={[(bridgeFrom + bridgeTo) / 2, cy / 2, cz]}
        rotation-z={Math.atan2(cy, bridgeLen)}
        material={mats.lime}
      >
        <boxGeometry args={[Math.hypot(bridgeLen, cy), 0.02, 0.06]} />
      </mesh>
      <group ref={root} position={OFFCLOCK_CENTRE}>
        <mesh position-y={-0.25} material={mats.slab}>
          <boxGeometry args={[HALF_W * 2, 0.5, HALF_D * 2]} />
        </mesh>
        <mesh position-y={0.005} material={mats.lawn}>
          <boxGeometry args={[HALF_W * 2 - 0.08, 0.02, HALF_D * 2 - 0.08]} />
        </mesh>
        {/* violet rim, so it reads as a different place from the lime city */}
        {[
          [0, HALF_D, HALF_W * 2, 0.03],
          [0, -HALF_D, HALF_W * 2, 0.03],
          [HALF_W, 0, 0.03, HALF_D * 2],
          [-HALF_W, 0, 0.03, HALF_D * 2],
        ].map(([x, z, w, d], i) => (
          <mesh key={i} position={[x, 0.012, z]} material={mats.violet}>
            <boxGeometry args={[w, 0.024, d]} />
          </mesh>
        ))}
        <mesh rotation-x={-Math.PI / 2} position-y={-1.4} material={underglow}>
          <planeGeometry args={[7, 7]} />
        </mesh>

        {/* tree with fairy lights */}
        <group position={[-0.55, 0, -0.35]}>
          <mesh position-y={0.28} material={mats.trunk}>
            <cylinderGeometry args={[0.04, 0.06, 0.56, 8]} />
          </mesh>
          <mesh position-y={0.78} material={mats.leaves}>
            <sphereGeometry args={[0.36, 16, 12]} />
          </mesh>
          <mesh position={[0.18, 1.05, 0.05]} material={mats.leaves}>
            <sphereGeometry args={[0.24, 14, 10]} />
          </mesh>
          <group ref={fairy}>
            {lights.map((p, i) => (
              <mesh key={i} position={p} material={i % 3 ? mats.warm : mats.lime}>
                <sphereGeometry args={[0.02, 6, 4]} />
              </mesh>
            ))}
          </group>
        </group>

        {/* lamp post */}
        <group position={[0.85, 0, -0.25]}>
          <mesh position-y={0.42} material={mats.metal}>
            <cylinderGeometry args={[0.015, 0.02, 0.84, 6]} />
          </mesh>
          <mesh position-y={0.87} material={mats.warm}>
            <sphereGeometry args={[0.05, 10, 8]} />
          </mesh>
        </group>

        {/* bench, with Adi off duty */}
        <group position={[0.15, 0, 0.2]}>
          <mesh position-y={0.2} material={mats.wood}>
            <boxGeometry args={[0.72, 0.035, 0.22]} />
          </mesh>
          <mesh position={[0, 0.34, -0.1]} rotation-x={-0.15} material={mats.wood}>
            <boxGeometry args={[0.72, 0.18, 0.03]} />
          </mesh>
          {[-0.32, 0.32].map((x) => (
            <mesh key={x} position={[x, 0.1, 0]} material={mats.metal}>
              <boxGeometry args={[0.03, 0.2, 0.2]} />
            </mesh>
          ))}
          <Character position={[0.12, 0.09, 0.02]} facing={0} sitting interactive={false} />
        </group>

        {items.slice(0, signSpots.length).map((item, i) => (
          <Sign key={item.title} lines={["off the clock", item.title]} width={1.0} position={signSpots[i]} accent={palette.violet} />
        ))}
      </group>
    </group>
  );
}
