"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { InstancedMesh, Mesh, Object3D, SphereGeometry } from "three";
import { pipelineState } from "@/lib/pipeline-state";
import { palette } from "../palette";
import { packetAt, STATIONS, LEG_STATION } from "./route";

const TRAIL = 16;

/**
 * The example request: a lime orb with a fading trail that rides the transit
 * loop. On the road it hovers just above the street; while a station is
 * "processing" it rises and circles the station.
 */
export function Packet() {
  const orb = useRef<Mesh>(null);
  const trail = useRef<InstancedMesh>(null);
  const history = useMemo(() => Array.from({ length: TRAIL }, () => [0, -10, 0]), []);
  const dummy = useMemo(() => new Object3D(), []);
  const geometry = useMemo(() => new SphereGeometry(1, 12, 8), []);
  const tmp = useMemo<[number, number]>(() => [0, 0], []);
  const lift = useRef(0);
  const spin = useRef(0);

  useFrame(({ clock }, delta) => {
    const presence = pipelineState.presence;
    const { leg, dwelling } = packetAt(pipelineState.progress, tmp);
    let [x, z] = tmp;
    const k = 1 - Math.exp(-delta * 6);
    lift.current += ((dwelling ? 1 : 0) - lift.current) * k;
    spin.current += delta * 3;
    // While dwelling, orbit the station's core.
    if (lift.current > 0.01) {
      const [sx, sz] = STATIONS[LEG_STATION[leg]];
      const r = 0.42 * lift.current;
      x = sx + (x - sx) * (1 - lift.current) + Math.cos(spin.current) * r;
      z = sz + (z - sz) * (1 - lift.current) + Math.sin(spin.current) * r;
    }
    const y = 0.32 + lift.current * 0.85 + Math.sin(clock.elapsedTime * 5) * 0.02;

    if (orb.current) {
      orb.current.position.set(x, y, z);
      orb.current.scale.setScalar(0.14 * presence);
    }
    // Trail: shift history, newest first.
    const last = history.pop()!;
    last[0] = x;
    last[1] = y;
    last[2] = z;
    history.unshift(last);
    const t = trail.current;
    if (!t) return;
    for (let i = 0; i < TRAIL; i++) {
      const [hx, hy, hz] = history[i];
      dummy.position.set(hx, hy, hz);
      dummy.scale.setScalar(0.11 * (1 - i / TRAIL) * presence);
      dummy.updateMatrix();
      t.setMatrixAt(i, dummy.matrix);
    }
    t.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh ref={orb} geometry={geometry}>
        <meshBasicMaterial color={palette.signal} toneMapped={false} />
      </mesh>
      <instancedMesh ref={trail} args={[geometry, undefined, TRAIL]} frustumCulled={false}>
        <meshBasicMaterial color={palette.signal} toneMapped={false} transparent opacity={0.45} />
      </instancedMesh>
    </group>
  );
}
