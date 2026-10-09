"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { AdditiveBlending, Color, MeshBasicMaterial, ShaderMaterial } from "three";
import { boot } from "../boot";
import { palette } from "../palette";
import { ISLAND_HALF, STREETS } from "./layout";

const streetList = STREETS.map((s) => s.toFixed(1)).join(", ");

/** Streets, a faint cell grid, lime lane markings and the boot pulse, all in one shader. */
function useGroundMaterial() {
  const uniforms = useMemo(
    () => ({
      uBoot: { value: 0 },
      uTime: { value: 0 },
      uBlock: { value: new Color("#0d111c") },
      uStreet: { value: new Color("#161b2b") },
      uSignal: { value: new Color(palette.signal) },
      uViolet: { value: new Color(palette.violet) },
    }),
    [],
  );

  const material = useMemo(() => {
    const m = new MeshBasicMaterial({ color: "#ffffff" });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vWorldXZ;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvWorldXZ = (modelMatrix * vec4(transformed, 1.0)).xz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          /* glsl */ `#include <common>
          uniform float uBoot;
          uniform float uTime;
          uniform vec3 uBlock;
          uniform vec3 uStreet;
          uniform vec3 uSignal;
          uniform vec3 uViolet;
          varying vec2 vWorldXZ;
          const float STREETS[4] = float[4](${streetList});
          float lineAA(float d, float w) {
            float aa = fwidth(d);
            return 1.0 - smoothstep(w - aa, w + aa, d);
          }`,
        )
        .replace(
          "#include <color_fragment>",
          /* glsl */ `#include <color_fragment>
          vec2 p = vWorldXZ;
          float street = 0.0;
          float lane = 0.0;
          for (int i = 0; i < 4; i++) {
            float dx = abs(p.x - STREETS[i]);
            float dz = abs(p.y - STREETS[i]);
            street = max(street, max(lineAA(dx, 0.42), lineAA(dz, 0.42)));
            // dashed centre lines: the "data lanes" agents travel on
            float dashZ = step(0.5, fract(p.y * 1.25 - uTime * 0.35));
            float dashX = step(0.5, fract(p.x * 1.25 - uTime * 0.35));
            lane = max(lane, max(lineAA(dx, 0.018) * dashZ, lineAA(dz, 0.018) * dashX));
          }
          vec3 col = mix(uBlock, uStreet, street);
          // faint cell grid on the blocks only
          vec2 g = abs(fract(p + 0.5) - 0.5);
          float grid = max(lineAA(g.x, 0.008), lineAA(g.y, 0.008)) * (1.0 - street);
          col += uViolet * grid * 0.08;
          col += uSignal * lane * 0.22 * smoothstep(0.4, 1.0, uBoot);
          // boot pulse: a lime ring sweeping out from the HQ
          float dist = length(p);
          float ring = exp(-pow((dist - uBoot * 12.0) * 2.2, 2.0));
          col += uSignal * ring * (1.0 - uBoot) * 1.6;
          // before boot, only the grid is visible
          col = mix(uBlock * 0.6 + uViolet * grid * 0.12, col, smoothstep(0.0, 1.0, uBoot * 12.0 - dist + 1.0));
          diffuseColor.rgb = col;`,
        );
    };
    m.customProgramCacheKey = () => "city-ground";
    return m;
  }, [uniforms]);

  useFrame(({ clock }) => {
    uniforms.uBoot.value = boot.value;
    uniforms.uTime.value = clock.elapsedTime;
  });

  return material;
}

/** Soft violet glow under the island, so it reads as floating in the void. */
function useUnderglowMaterial() {
  return useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: new Color(palette.violet) } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            float d = length(vUv - 0.5) * 2.0;
            float a = pow(max(0.0, 1.0 - d), 2.4) * 0.35;
            gl_FragColor = vec4(uColor * a, a);
          }`,
      }),
    [],
  );
}

export function Ground() {
  const ground = useGroundMaterial();
  const underglow = useUnderglowMaterial();
  const size = ISLAND_HALF * 2;
  const rim = 0.035;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} material={ground}>
        <planeGeometry args={[size, size]} />
      </mesh>
      {/* the island slab */}
      <mesh position-y={-0.36}>
        <boxGeometry args={[size, 0.7, size]} />
        <meshLambertMaterial color="#0a0d16" />
      </mesh>
      {/* lime rim around the top edge */}
      {[
        [0, ISLAND_HALF, size, rim],
        [0, -ISLAND_HALF, size, rim],
        [ISLAND_HALF, 0, rim, size],
        [-ISLAND_HALF, 0, rim, size],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.012, z]}>
          <boxGeometry args={[w, 0.024, d]} />
          <meshBasicMaterial color={palette.signal} toneMapped={false} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position-y={-2.2} material={underglow}>
        <planeGeometry args={[34, 34]} />
      </mesh>
    </group>
  );
}
