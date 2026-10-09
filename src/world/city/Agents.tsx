"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CapsuleGeometry, InstancedMesh, Object3D, SphereGeometry } from "three";
import { boot } from "../boot";
import { palette } from "../palette";
import { mulberry32, streetGraph } from "./layout";

const LANE = 0.16; // agents keep to the right-hand side of the street
const BODY_H = 0.2;

type Agent = { from: number; to: number; t: number; speed: number; phase: number; spawn: number };

/**
 * Little agents walking the street graph: at every intersection each one
 * picks a new direction (never straight back). Two instanced meshes, so the
 * cost is two draw calls whatever the count.
 */
export function Agents({ count }: { count: number }) {
  const bodies = useRef<InstancedMesh>(null);
  const lights = useRef<InstancedMesh>(null);
  const graph = useMemo(() => streetGraph(), []);

  const agents = useMemo<Agent[]>(() => {
    const rand = mulberry32(42);
    return Array.from({ length: count }, () => {
      const from = Math.floor(rand() * graph.nodes.length);
      const options = graph.edges[from];
      return {
        from,
        to: options[Math.floor(rand() * options.length)],
        t: rand(),
        speed: 0.45 + rand() * 0.45,
        phase: rand() * Math.PI * 2,
        spawn: rand(),
      };
    });
  }, [count, graph]);

  const geometries = useMemo(() => {
    const body = new CapsuleGeometry(0.055, BODY_H - 0.11, 3, 8);
    body.translate(0, BODY_H / 2, 0);
    const light = new SphereGeometry(0.036, 10, 8);
    return { body, light };
  }, []);

  const dummy = useMemo(() => new Object3D(), []);

  useFrame(({ clock, camera }, delta) => {
    const b = bodies.current;
    const l = lights.current;
    if (!b || !l) return;
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const [ax, az] = graph.nodes[a.from];
      const [bx, bz] = graph.nodes[a.to];
      const len = Math.hypot(bx - ax, bz - az);
      a.t += (a.speed * dt) / len;
      if (a.t >= 1) {
        const options = graph.edges[a.to].filter((n) => n !== a.from);
        a.from = a.to;
        a.to = options[Math.floor(Math.random() * options.length)];
        a.t = 0;
      }
      const [fx, fz] = graph.nodes[a.from];
      const [tx, tz] = graph.nodes[a.to];
      const dx = (tx - fx) / Math.hypot(tx - fx, tz - fz);
      const dz = (tz - fz) / Math.hypot(tx - fx, tz - fz);
      // right-hand lane: perpendicular to the direction of travel
      const x = fx + (tx - fx) * a.t - dz * LANE;
      const z = fz + (tz - fz) * a.t + dx * LANE;
      const bob = Math.abs(Math.sin(t * 9 * a.speed + a.phase)) * 0.025;
      // Spawn in during the boot, and shrink away when very close to the
      // camera (in close-ups a passing agent would otherwise fill the frame).
      const spawn = Math.min(1, Math.max(0, (boot.value - 0.5 - a.spawn * 0.3) / 0.2));
      const near = Math.hypot(x - camera.position.x, bob - camera.position.y, z - camera.position.z);
      const s = spawn * Math.min(1, Math.max(0, (near - 0.9) / 0.9));

      dummy.position.set(x, bob, z);
      dummy.rotation.set(0, Math.atan2(dx, dz), 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);

      dummy.position.y = bob + BODY_H + 0.05;
      dummy.updateMatrix();
      l.setMatrixAt(i, dummy.matrix);
    }
    b.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodies} args={[geometries.body, undefined, count]} frustumCulled={false}>
        <meshLambertMaterial color="#4a5680" />
      </instancedMesh>
      <instancedMesh ref={lights} args={[geometries.light, undefined, count]} frustumCulled={false}>
        <meshBasicMaterial color={palette.signal} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
