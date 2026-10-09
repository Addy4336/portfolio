"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, SphereGeometry } from "three";
import { FLARE_EVENT } from "@/lib/signal";
import { palette } from "../palette";
import { HQ_TOP } from "./HQ";

const SPARKS = 28;
const RISE = 0.9; // seconds climbing
const LIFE = 2.6; // seconds in total

/**
 * Contact's signal flare: a lime light climbs from the HQ beacon, then bursts
 * into a ring and a shower of sparks over the city.
 */
export function Flare() {
  const head = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const sparks = useRef<InstancedMesh>(null);
  const group = useRef<Group>(null);
  const started = useRef(-1);
  const dummy = useMemo(() => new Object3D(), []);
  const geometry = useMemo(() => new SphereGeometry(1, 10, 8), []);
  const ringMat = useMemo(
    () => new MeshBasicMaterial({ color: palette.signal, toneMapped: false, transparent: true, depthWrite: false }),
    [],
  );
  const sparkMat = useMemo(
    () => new MeshBasicMaterial({ color: palette.signal, toneMapped: false, transparent: true, depthWrite: false }),
    [],
  );
  const dirs = useMemo(
    () =>
      Array.from({ length: SPARKS }, (_, i) => {
        // deterministic pseudo-random per spark (no Math.random during render)
        const r = (n: number) => {
          const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
          return x - Math.floor(x);
        };
        const a = (i / SPARKS) * Math.PI * 2;
        return [Math.cos(a), 0.3 + r(1) * 0.7, Math.sin(a), 0.7 + r(2) * 0.6];
      }),
    [],
  );

  useEffect(() => {
    const go = () => (started.current = performance.now() / 1000);
    window.addEventListener(FLARE_EVENT, go);
    return () => window.removeEventListener(FLARE_EVENT, go);
  }, []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = started.current < 0 ? -1 : performance.now() / 1000 - started.current;
    g.visible = t >= 0 && t < LIFE;
    if (!g.visible) return;
    const base = HQ_TOP + 0.9;
    const peak = base + 4.2;
    const rise = Math.min(1, t / RISE);
    const y = base + (peak - base) * (1 - Math.pow(1 - rise, 3));
    if (head.current) {
      head.current.position.set(0, y, 0);
      head.current.scale.setScalar(t < RISE ? 0.12 : 0.0001);
    }
    const burst = Math.max(0, (t - RISE) / (LIFE - RISE));
    if (ring.current) {
      ring.current.position.y = peak;
      ring.current.scale.setScalar(0.001 + burst * 4.5);
      ringMat.opacity = t < RISE ? 0 : (1 - burst) * 0.9;
    }
    const s = sparks.current;
    if (s) {
      sparkMat.opacity = t < RISE ? 0 : 1 - burst;
      for (let i = 0; i < SPARKS; i++) {
        const [dx, dy, dz, speed] = dirs[i];
        const d = burst * 3.2 * speed;
        dummy.position.set(dx * d, peak + dy * d - burst * burst * 2.5, dz * d);
        dummy.scale.setScalar(0.05 * (1 - burst * 0.7));
        dummy.updateMatrix();
        s.setMatrixAt(i, dummy.matrix);
      }
      s.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={head} geometry={geometry}>
        <meshBasicMaterial color={palette.signal} toneMapped={false} />
      </mesh>
      <mesh ref={ring} rotation-x={Math.PI / 2} material={ringMat}>
        <torusGeometry args={[1, 0.02, 8, 64]} />
      </mesh>
      <instancedMesh ref={sparks} args={[geometry, sparkMat, SPARKS]} frustumCulled={false} />
    </group>
  );
}
