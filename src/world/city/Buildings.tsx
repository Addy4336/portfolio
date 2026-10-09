"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
} from "three";
import { boot } from "../boot";
import { palette } from "../palette";
import type { Building } from "./layout";

/**
 * Every generic building in one instanced mesh (one draw call). Windows are
 * not geometry: the fragment shader draws a grid of them on each wall and
 * lights a random subset, and the vertex shader grows each building out of
 * the ground during the boot sequence.
 */
const vertexHead = /* glsl */ `
  #include <common>
  attribute float aSeed;
  attribute float aDelay;
  uniform float uBoot;
  varying vec3 vLocal;
  varying vec3 vScale;
  varying vec3 vObjNormal;
  varying float vSeed;
  varying float vGrow;
`;

const vertexBody = /* glsl */ `
  #include <begin_vertex>
  vLocal = position;
  vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vObjNormal = normal;
  vSeed = aSeed;
  // Buildings grow outwards from the centre and are all up by uBoot = 0.85;
  // rooftop units (aDelay >= 2) pop on afterwards so they never float.
  float g = aDelay >= 2.0
    ? clamp((uBoot - 0.85) / 0.15, 0.0, 1.0)
    : clamp((uBoot - aDelay * 0.45) / 0.4, 0.0, 1.0);
  // ease-out-back: a little overshoot, like the building snapping into place
  float c = 1.70158;
  g = 1.0 + (c + 1.0) * pow(g - 1.0, 3.0) + c * pow(g - 1.0, 2.0);
  transformed.y *= max(g, 0.001);
  vGrow = clamp(g, 0.0, 1.0);
`;

const fragmentHead = /* glsl */ `
  #include <common>
  uniform float uTime;
  uniform vec3 uWarm;
  uniform vec3 uViolet;
  uniform vec3 uSignal;
  uniform float uWindows;
  varying vec3 vLocal;
  varying vec3 vScale;
  varying vec3 vObjNormal;
  varying float vSeed;
  varying float vGrow;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
`;

const colorBody = /* glsl */ `
  #include <color_fragment>
  // Fake ambient occlusion: darker at street level, and a slightly lighter roof.
  float heightWorld = vLocal.y * vScale.y;
  diffuseColor.rgb *= mix(0.45, 1.0, smoothstep(0.0, 0.9, heightWorld));
  if (vObjNormal.y > 0.5) {
    float edge = max(abs(vLocal.x) * vScale.x, abs(vLocal.z) * vScale.z);
    float rim = smoothstep(0.5 * min(vScale.x, vScale.z) - 0.05, 0.5 * min(vScale.x, vScale.z), edge);
    diffuseColor.rgb = mix(diffuseColor.rgb * 1.25, uViolet * 0.55, rim * 0.6);
  }
`;

const emissiveBody = /* glsl */ `
  #include <emissivemap_fragment>
  if (abs(vObjNormal.y) < 0.5) {
    bool sideX = abs(vObjNormal.x) > 0.5;
    float faceU = (sideX ? vLocal.z : vLocal.x) + 0.5;
    float width = sideX ? vScale.z : vScale.x;
    vec2 uv = vec2(faceU * width / 0.2, vLocal.y * vScale.y / 0.24);
    vec2 cell = floor(uv);
    vec2 f = fract(uv);
    float inWindow = step(0.28, f.x) * step(f.x, 0.72) * step(0.32, f.y) * step(f.y, 0.78);
    // No windows on the ground floor or in the strip under the roof.
    float floors = floor(vScale.y / 0.24);
    inWindow *= step(1.0, cell.y) * step(cell.y, floors - 1.0);
    float face = vObjNormal.x * 3.0 + vObjNormal.z * 7.0;
    float h = hash13(vec3(cell, vSeed * 97.0 + face));
    // A few windows switch on and off over time, so the city feels inhabited.
    float slowFlip = hash13(vec3(cell, floor(uTime * 0.12 + vSeed * 40.0)));
    float lit = step(0.58, h) * step(0.08, slowFlip);
    vec3 windowColor = h > 0.975 ? uSignal : (h > 0.9 ? uViolet : uWarm);
    // Each room has its own brightness, and light pools towards the ceiling.
    float brightness = 0.45 + 0.55 * fract(h * 7.31);
    float pool = mix(0.6, 1.0, smoothstep(0.32, 0.78, f.y));
    totalEmissiveRadiance += windowColor * inWindow * lit * brightness * pool * vGrow * uWindows;
  }
`;

export function Buildings({ buildings }: { buildings: Building[] }) {
  const mesh = useRef<InstancedMesh>(null);

  const geometry = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    g.setAttribute(
      "aSeed",
      new InstancedBufferAttribute(new Float32Array(buildings.map((b) => b.seed)), 1),
    );
    g.setAttribute(
      "aDelay",
      new InstancedBufferAttribute(new Float32Array(buildings.map((b) => b.delay)), 1),
    );
    return g;
  }, [buildings]);

  const uniforms = useMemo(
    () => ({
      uBoot: { value: 0 },
      uTime: { value: 0 },
      uWarm: { value: new Color(palette.paper).multiplyScalar(0.85) },
      uViolet: { value: new Color(palette.violet) },
      uSignal: { value: new Color(palette.signal) },
      uWindows: { value: 1 },
    }),
    [],
  );

  const material = useMemo(() => {
    // White base: the per-instance colour set below is the real building tone.
    const m = new MeshLambertMaterial({ color: "#ffffff" });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", vertexHead)
        .replace("#include <begin_vertex>", vertexBody);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", fragmentHead)
        .replace("#include <color_fragment>", colorBody)
        .replace("#include <emissivemap_fragment>", emissiveBody);
    };
    m.customProgramCacheKey = () => "city-buildings";
    return m;
  }, [uniforms]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new Object3D();
    const tint = new Color();
    buildings.forEach((b, i) => {
      dummy.position.set(b.x, b.y ?? 0, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      // Slight per-building variation between the two building tones.
      tint.set(palette.building).lerp(new Color(palette.buildingLight), b.seed * 0.8);
      m.setColorAt(i, tint);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [buildings]);

  useFrame(({ clock }) => {
    uniforms.uBoot.value = boot.value;
    uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, buildings.length]}
      frustumCulled={false}
    />
  );
}
