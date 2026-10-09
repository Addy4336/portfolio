"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { QUALITY, type Tier } from "@/lib/tier";
import { Bench } from "./Bench";
import { boot, BOOT_SECONDS, CITY_READY_EVENT, type CityReadyDetail } from "./boot";
import { CameraRig } from "./CameraRig";
import { Agents } from "./city/Agents";
import { Buildings } from "./city/Buildings";
import { Ground } from "./city/Ground";
import { HQ, hqBuildings } from "./city/HQ";
import { generateBuildings } from "./city/layout";
import { palette } from "./palette";
import { Precompile } from "./Precompile";

// Post-processing is only downloaded on tiers that use it.
const Effects = lazy(() => import("./Effects"));

type SceneProps = { tier: Exclude<Tier, 0>; isMobile: boolean; onReady: () => void };

/** Starts the boot clock on the first frame and tells the page the city is up. */
function BootClock({ agents, onReady }: { agents: number; onReady: () => void }) {
  const started = useRef(false);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!started.current) {
      started.current = true;
      boot.startedAt = t + 0.25; // let the canvas fade in before the pulse starts
      requestAnimationFrame(() => {
        onReady();
        window.dispatchEvent(
          new CustomEvent<CityReadyDetail>(CITY_READY_EVENT, { detail: { agents } }),
        );
      });
    }
    boot.value = Math.min(1, Math.max(0, (t - boot.startedAt) / BOOT_SECONDS));
  });
  return null;
}

function City({ agents }: { agents: number }) {
  const buildings = useMemo(() => [...generateBuildings(["hq"]), ...hqBuildings], []);
  return (
    <group>
      <Ground />
      <Buildings buildings={buildings} />
      <HQ />
      <Agents count={agents} />
    </group>
  );
}

export default function Scene({ tier, isMobile, onReady }: SceneProps) {
  const quality = QUALITY[tier];
  // The tier is fixed for the session; PerformanceMonitor nudges DPR within its range.
  const [dpr, setDpr] = useState(quality.dpr[1]);
  // Nothing renders until every shader has compiled in the background.
  const [compiled, setCompiled] = useState(false);
  const onCompiled = useCallback(() => setCompiled(true), []);
  const agents = isMobile ? Math.round(quality.agents * 0.6) : quality.agents;

  return (
    <Canvas
      flat
      dpr={dpr}
      frameloop={compiled ? "always" : "never"}
      gl={{ antialias: quality.antialias, powerPreference: "high-performance" }}
      camera={{ position: [14, 11, 15], fov: 30, near: 0.1, far: 120 }}
      onCreated={({ gl }) => {
        // Checking each shader for errors forces a synchronous wait on the
        // GPU; keep it for development only.
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
      }}
    >
      <color attach="background" args={[palette.void]} />
      <fogExp2 attach="fog" args={[palette.void, 0.022]} />
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(quality.dpr[0], d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(quality.dpr[1], d + 0.25))}
      />
      <hemisphereLight args={["#8d97c9", palette.ground, 0.55]} />
      <directionalLight position={[-6, 12, 5]} intensity={1.1} color="#c3cbff" />
      <pointLight position={[0, 1.2, 0]} intensity={6} distance={9} color={palette.violet} />
      <City agents={agents} />
      <CameraRig isMobile={isMobile} />
      <Precompile onDone={onCompiled} />
      <BootClock agents={agents} onReady={onReady} />
      <Bench />
      {quality.bloom && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </Canvas>
  );
}
