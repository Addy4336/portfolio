"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { lazy, startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QUALITY, type Tier } from "@/lib/tier";
import { Bench } from "./Bench";
import { boot, BOOT_SECONDS, CITY_READY_EVENT, type CityReadyDetail } from "./boot";
import { CameraRig } from "./CameraRig";
import { CityPicker } from "./CityPicker";
import { Agents } from "./city/Agents";
import { Buildings } from "./city/Buildings";
import { Character } from "./city/Character";
import { Districts } from "./city/Districts";
import { Flare } from "./city/Flare";
import { OffClock } from "./city/OffClock";
import { site } from "@content/site";
import type { CityProject } from "@/lib/districts";
import { Ground } from "./city/Ground";
import { HQ, hqBuildings } from "./city/HQ";
import { generateBuildings } from "./city/layout";
import { Packet } from "./city/Packet";
import { Stations } from "./city/Stations";
import { palette } from "./palette";
import { Precompile } from "./Precompile";

// Post-processing is only downloaded on tiers that use it.
const Effects = lazy(() => import("./Effects"));

type SceneProps = {
  tier: Exclude<Tier, 0>;
  isMobile: boolean;
  projects: CityProject[];
  onReady: () => void;
};

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

function City({
  agents,
  projects,
  onStaged,
}: {
  agents: number;
  projects: CityProject[];
  onStaged: () => void;
}) {
  // Generic filler everywhere except HQ and the four project districts.
  const buildings = useMemo(
    () => [...generateBuildings(["hq", "studio", "estate", "lab", "workshop"]), ...hqBuildings],
    [],
  );
  // Mount the city in stages, each as a separate (interruptible) transition,
  // so creating hundreds of three.js objects never blocks the page in one
  // long task. The frame loop is off until everything is in and compiled.
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= LAST_STAGE) {
      onStaged();
      return;
    }
    const t = setTimeout(() => startTransition(() => setStage((s) => s + 1)), 0);
    return () => clearTimeout(t);
  }, [stage, onStaged]);

  return (
    // Named groups so ?bench can report draw calls per part.
    <group>
      <group name="ground"><Ground /></group>
      <group name="buildings"><Buildings buildings={buildings} /></group>
      <group name="hq"><HQ /></group>
      {stage >= 1 && (
        <>
          <group name="adi"><Character /></group>
          <group name="stations"><Stations /></group>
          <group name="packet"><Packet /></group>
          <group name="agents"><Agents count={agents} /></group>
        </>
      )}
      {stage >= 2 && <group name="districts"><Districts projects={projects} /></group>}
      {stage >= 3 && (
        <>
          <group name="offclock"><OffClock items={site.offClock} /></group>
          <group name="flare"><Flare /></group>
        </>
      )}
    </group>
  );
}

const LAST_STAGE = 3;

export default function Scene({ tier, isMobile, projects, onReady }: SceneProps) {
  const quality = QUALITY[tier];
  // The tier is fixed for the session; PerformanceMonitor nudges DPR within its range.
  const [dpr, setDpr] = useState(quality.dpr[1]);
  // Nothing renders until the whole city is mounted and every shader has
  // compiled in the background.
  const [staged, setStaged] = useState(false);
  const onStaged = useCallback(() => setStaged(true), []);
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
      <City agents={agents} projects={projects} onStaged={onStaged} />
      <CameraRig isMobile={isMobile} />
      <CityPicker projects={projects} />
      {staged && <Precompile onDone={onCompiled} />}
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
