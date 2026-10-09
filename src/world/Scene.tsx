"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useRef, useState } from "react";
import type { Group } from "three";
import { QUALITY, type Tier } from "@/lib/tier";
import { scrollState } from "@/lib/scroll-state";
import { palette } from "./palette";

type SceneProps = { tier: Exclude<Tier, 0>; isMobile: boolean; onReady: () => void };

/** Calls onReady after the first rendered frame, so the canvas fades in on a real image. */
function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(onReady);
  });
  return null;
}

// Placeholder world for the setup step; Section 1 replaces it with the city.
function Placeholder() {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.05;
    group.current.position.y = -scrollState.progress * 2;
  });
  return (
    <group ref={group}>
      <gridHelper args={[40, 40, palette.signal, palette.building]} />
      {[-4, -1.5, 1, 3.5].map((x, i) => (
        <mesh key={x} position={[x, 0.5 + i * 0.4, -i]}>
          <boxGeometry args={[1.4, 1 + i * 0.8, 1.4]} />
          <meshStandardMaterial color={palette.building} />
        </mesh>
      ))}
    </group>
  );
}

export default function Scene({ tier, isMobile, onReady }: SceneProps) {
  const quality = QUALITY[tier];
  // The tier is fixed for the session; PerformanceMonitor nudges DPR within its range.
  const [dpr, setDpr] = useState(quality.dpr[1]);

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: quality.antialias, powerPreference: "high-performance" }}
      camera={{ position: [0, 6, isMobile ? 16 : 12], fov: isMobile ? 55 : 45 }}
    >
      <color attach="background" args={[palette.void]} />
      <fog attach="fog" args={[palette.void, 10, 34]} />
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(quality.dpr[0], d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(quality.dpr[1], d + 0.25))}
      />
      <hemisphereLight args={[palette.paper, palette.ground, 0.6]} />
      <directionalLight position={[6, 10, 4]} intensity={1.2} color={palette.paper} />
      <Placeholder />
      <FirstFrame onReady={onReady} />
    </Canvas>
  );
}
