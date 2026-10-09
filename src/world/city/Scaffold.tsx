"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, InstancedMesh, Object3D } from "three";

type Props = { width: number; depth: number; height: number; position?: [number, number, number] };

const STEP = 0.32;
const BAR = 0.018;

/**
 * A construction scaffold around a footprint: poles along every edge and
 * ledgers at each lift, all one instanced mesh. Used for projects whose
 * `progress` is below 1.
 */
export function Scaffold({ width, depth, height, position = [0, 0, 0] }: Props) {
  const mesh = useRef<InstancedMesh>(null);
  const bars = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number] }[] = [];
    const hw = width / 2;
    const hd = depth / 2;
    const nx = Math.max(1, Math.round(width / STEP));
    const nz = Math.max(1, Math.round(depth / STEP));
    // vertical poles around the perimeter
    for (let i = 0; i <= nx; i++) {
      const x = -hw + (i * width) / nx;
      out.push({ p: [x, height / 2, -hd], s: [BAR, height, BAR] }, { p: [x, height / 2, hd], s: [BAR, height, BAR] });
    }
    for (let j = 1; j < nz; j++) {
      const z = -hd + (j * depth) / nz;
      out.push({ p: [-hw, height / 2, z], s: [BAR, height, BAR] }, { p: [hw, height / 2, z], s: [BAR, height, BAR] });
    }
    // horizontal ledgers at each lift
    for (let y = STEP; y <= height + 0.001; y += STEP) {
      out.push(
        { p: [0, y, -hd], s: [width, BAR, BAR] },
        { p: [0, y, hd], s: [width, BAR, BAR] },
        { p: [-hw, y, 0], s: [BAR, BAR, depth] },
        { p: [hw, y, 0], s: [BAR, BAR, depth] },
      );
    }
    return out;
  }, [width, depth, height]);

  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const d = new Object3D();
    bars.forEach((b, i) => {
      d.position.set(...b.p);
      d.scale.set(...b.s);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [bars]);

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, bars.length]} position={position}>
      <meshLambertMaterial color="#8f97b8" />
    </instancedMesh>
  );
}
