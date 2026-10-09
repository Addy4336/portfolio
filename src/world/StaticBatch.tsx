"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import {
  BufferGeometry,
  Group,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { boot } from "./boot";

const KEEP = new Set(["position", "normal", "uv"]);

/** Materials that look identical get merged together, even if they're separate instances. */
function signature(m: Material): string | null {
  // Skip transparent materials (draw order matters) and custom-shader ones.
  if (m.transparent || Object.prototype.hasOwnProperty.call(m, "onBeforeCompile")) return null;
  if (m instanceof MeshLambertMaterial || m instanceof MeshBasicMaterial) {
    if (m.map) return null;
    return `${m.type}|${m.color.getHexString()}|${m.side}|${m.toneMapped}|${
      m instanceof MeshLambertMaterial ? m.emissive.getHexString() : ""
    }`;
  }
  return null;
}

function batch(root: Group) {
  root.updateWorldMatrix(true, true);
  const toLocal = new Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { material: Material; geometries: BufferGeometry[]; meshes: Mesh[] }>();

  const visit = (o: Object3D) => {
    if (o.userData.dynamic || !o.visible) return;
    const mesh = o as Mesh;
    if (mesh.isMesh && !(mesh as { isInstancedMesh?: boolean }).isInstancedMesh && !Array.isArray(mesh.material)) {
      const key = signature(mesh.material as Material);
      if (key && mesh.geometry.index) {
        const g = mesh.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(toLocal, mesh.matrixWorld));
        for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name);
        if (KEEP.size === Object.keys(g.attributes).length) {
          const bucket = buckets.get(key) ?? { material: mesh.material as Material, geometries: [], meshes: [] };
          bucket.geometries.push(g);
          bucket.meshes.push(mesh);
          buckets.set(key, bucket);
        }
      }
    }
    o.children.forEach(visit);
  };
  root.children.forEach(visit);

  for (const { material, geometries, meshes } of buckets.values()) {
    if (meshes.length < 2) continue;
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!merged) continue;
    const combined = new Mesh(merged, material);
    combined.name = "";
    root.add(combined);
    meshes.forEach((m) => (m.visible = false));
  }
}

/**
 * Static batching: once the boot sequence has finished (so every transform
 * is final), merges all opaque, non-animated meshes inside into one mesh per
 * material. Anything that moves after boot must carry `userData.dynamic`.
 * Turns dozens of small props into a handful of draw calls.
 */
export function StaticBatch({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  const done = useRef(false);
  useFrame(() => {
    if (done.current || boot.value < 1 || !ref.current) return;
    done.current = true;
    batch(ref.current);
  });
  return <group ref={ref}>{children}</group>;
}
