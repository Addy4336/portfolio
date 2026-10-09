"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Group, MeshBasicMaterial, MeshLambertMaterial } from "three";
import { DISTRICT_NAMES, WORKSHOP_PLOTS, type CityProject, type DistrictId } from "@/lib/districts";
import { boot } from "../boot";
import { palette } from "../palette";
import { blockCentre } from "./layout";
import { Scaffold } from "./Scaffold";
import { Sign } from "./Sign";

function useMats() {
  return useMemo(
    () => ({
      slab: new MeshLambertMaterial({ color: "#121726" }),
      body: new MeshLambertMaterial({ color: palette.buildingLight }),
      wall: new MeshLambertMaterial({ color: "#3b4468" }),
      roof: new MeshLambertMaterial({ color: "#47379e" }),
      dark: new MeshLambertMaterial({ color: "#171c2b" }),
      pale: new MeshLambertMaterial({ color: "#b9bfd8" }),
      warm: new MeshBasicMaterial({ color: "#d9c79a", toneMapped: false }),
      lime: new MeshBasicMaterial({ color: palette.signal, toneMapped: false }),
      violet: new MeshBasicMaterial({ color: palette.violet, toneMapped: false }),
    }),
    [],
  );
}
type Mats = ReturnType<typeof useMats>;

/** Places a district at its block, turned so local −z faces out of the city (towards its camera). */
function DistrictFrame({ id, children }: { id: DistrictId; children: React.ReactNode }) {
  const [x, z] = blockCentre(id);
  return (
    <group position={[x, 0, z]} rotation-y={Math.atan2(-x, -z)}>
      {children}
    </group>
  );
}

const pct = (p: number) => `${Math.round(p * 100)}% built`;

/** InterviewIQ: a broadcast studio — lit window, two figures facing each other, ON AIR, sound rings. */
function Studio({ project, mats }: { project?: CityProject; mats: Mats }) {
  const rings = useRef<Group>(null);
  const ringMats = useMemo(
    () => [0, 1, 2].map(() => new MeshBasicMaterial({ color: palette.signal, toneMapped: false, transparent: true, depthWrite: false })),
    [],
  );
  useFrame(({ clock }) => {
    rings.current?.children.forEach((child, i) => {
      const phase = (clock.elapsedTime * 0.5 + i / 3) % 1;
      child.scale.setScalar(0.3 + phase * 1.4);
      ringMats[i].opacity = (1 - phase) * 0.7;
    });
  });
  const figure = (x: number, facing: number) => (
    <group position={[x, 0.18, -0.68]} rotation-y={facing}>
      <mesh position-y={0.14} material={mats.dark}>
        <capsuleGeometry args={[0.07, 0.1, 3, 8]} />
      </mesh>
      <mesh position-y={0.34} material={mats.dark}>
        <sphereGeometry args={[0.075, 12, 10]} />
      </mesh>
      <mesh position={[0, 0.36, 0]} rotation-z={0} material={mats.lime}>
        <torusGeometry args={[0.082, 0.009, 6, 20, Math.PI]} />
      </mesh>
    </group>
  );
  return (
    <group>
      <mesh position-y={0.02} material={mats.slab}>
        <boxGeometry args={[2.9, 0.04, 2.9]} />
      </mesh>
      <mesh position-y={0.55} material={mats.body}>
        <boxGeometry args={[1.9, 1.1, 1.3]} />
      </mesh>
      {/* the studio window on the outward face, with two silhouettes at the desk */}
      <mesh position={[0, 0.55, -0.655]} rotation-y={Math.PI} material={mats.warm}>
        <planeGeometry args={[1.5, 0.62]} />
      </mesh>
      <mesh position={[0, 0.36, -0.69]} material={mats.dark}>
        <boxGeometry args={[0.5, 0.04, 0.12]} />
      </mesh>
      {figure(-0.42, Math.PI / 2)}
      {figure(0.42, -Math.PI / 2)}
      {/* roof: ON AIR sign and an antenna sending sound rings */}
      <Sign lines={["● on air"]} width={0.62} position={[-0.45, 1.27, -0.4]} billboard={false} rotationY={Math.PI} />
      <mesh position={[0.5, 1.4, 0.1]} material={mats.dark}>
        <cylinderGeometry args={[0.02, 0.03, 0.6, 6]} />
      </mesh>
      <group ref={rings} position={[0.5, 1.72, 0.1]}>
        {ringMats.map((m, i) => (
          <mesh key={i} rotation-x={Math.PI / 2} material={m}>
            <torusGeometry args={[0.25, 0.01, 6, 36]} />
          </mesh>
        ))}
      </group>
      {/* a couple of neighbours for density */}
      <mesh position={[1.05, 0.4, 0.95]} material={mats.body}>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
      </mesh>
      <mesh position={[-1.05, 0.3, 0.95]} material={mats.body}>
        <boxGeometry args={[0.55, 0.6, 0.6]} />
      </mesh>
      <Sign
        lines={[DISTRICT_NAMES.studio, project?.title ?? "Plot available"]}
        position={[0, 2.25, 0]}
        accent={project?.accent}
      />
    </group>
  );
}

/** NextStateAI: a row of houses with holo price tags; unbuilt ones are under scaffolding. */
function Estate({ project, mats }: { project?: CityProject; mats: Mats }) {
  const tags = useRef<Group>(null);
  const scanner = useRef<Group>(null);
  const progress = project?.progress ?? 0;
  const lots = useMemo(
    () => [-0.9, 0, 0.9].flatMap((x) => [-0.55, 0.55].map((z) => [x, z] as [number, number])),
    [],
  );
  const built = Math.round(progress * lots.length);
  const beam = useMemo(
    () => new MeshBasicMaterial({ color: palette.violet, transparent: true, opacity: 0.25, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    [],
  );
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    tags.current?.children.forEach((tag, i) => {
      tag.position.y = 0.92 + Math.sin(t * 1.6 + i) * 0.04;
      tag.quaternion.copy(camera.quaternion);
    });
    if (scanner.current && built > 0) {
      // drift slowly between the finished houses
      const f = (t * 0.12) % 1;
      const i = Math.floor(f * built);
      const [x, z] = lots[i];
      scanner.current.position.x += (x - scanner.current.position.x) * 0.02;
      scanner.current.position.z += (z - scanner.current.position.z) * 0.02;
      scanner.current.position.y = 1.2 + Math.sin(t * 2) * 0.03;
    }
  });
  return (
    <group>
      <mesh position-y={0.02} material={mats.slab}>
        <boxGeometry args={[2.9, 0.04, 2.9]} />
      </mesh>
      {lots.map(([x, z], i) =>
        i < built ? (
          <group key={i} position={[x, 0, z]}>
            <mesh position-y={0.2} material={mats.wall}>
              <boxGeometry args={[0.52, 0.36, 0.44]} />
            </mesh>
            {/* gabled roof: a three-sided cylinder on its side, ridge running front to
                back so the triangular gable faces the district camera */}
            <mesh position-y={0.53} rotation-x={Math.PI / 2} material={mats.roof}>
              <cylinderGeometry args={[0.3, 0.3, 0.5, 3, 1, false, Math.PI]} />
            </mesh>
            <mesh position={[0, 0.22, -0.225]} rotation-y={Math.PI} material={mats.warm}>
              <planeGeometry args={[0.16, 0.14]} />
            </mesh>
          </group>
        ) : (
          <group key={i} position={[x, 0, z]}>
            <mesh position-y={0.05} material={mats.dark}>
              <boxGeometry args={[0.52, 0.06, 0.44]} />
            </mesh>
            <Scaffold width={0.56} depth={0.48} height={0.6} position={[0, 0.06, 0]} />
          </group>
        ),
      )}
      <group ref={tags}>
        {lots.slice(0, built).map(([x, z], i) => (
          <mesh key={i} position={[x, 0.92, z]} material={i % 2 ? mats.violet : mats.lime}>
            <planeGeometry args={[0.22, 0.1]} />
          </mesh>
        ))}
      </group>
      {built > 0 && (
        <group ref={scanner} position={[lots[0][0], 1.2, lots[0][1]]}>
          <mesh material={mats.pale}>
            <capsuleGeometry args={[0.06, 0.08, 3, 8]} />
          </mesh>
          <mesh position-y={-0.45} material={beam}>
            <coneGeometry args={[0.28, 0.8, 20, 1, true]} />
          </mesh>
        </group>
      )}
      <Sign
        lines={[
          progress < 1 ? `${DISTRICT_NAMES.estate} · ${pct(progress)}` : DISTRICT_NAMES.estate,
          project?.title ?? "Plot available",
        ]}
        position={[0, 1.95, 0]}
        accent={project?.accent}
      />
    </group>
  );
}

/** Research: an observatory that rises out of its scaffolding as `progress` grows. */
function Lab({ project, mats }: { project?: CityProject; mats: Mats }) {
  const lights = useRef<Group>(null);
  const progress = project?.progress ?? 0;
  const dome = 0.18 + 0.82 * progress;
  useFrame(({ clock }) => {
    lights.current?.children.forEach((l, i) => {
      l.visible = Math.sin(clock.elapsedTime * 3 + i * 1.7) > 0;
    });
  });
  return (
    <group>
      <mesh position-y={0.02} material={mats.slab}>
        <boxGeometry args={[2.9, 0.04, 2.9]} />
      </mesh>
      <mesh position-y={0.25} material={mats.body}>
        <cylinderGeometry args={[0.85, 0.9, 0.5, 32]} />
      </mesh>
      <mesh position-y={0.5} scale={[1, dome, 1]} material={mats.pale}>
        <sphereGeometry args={[0.78, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {progress > 0.6 && (
        <mesh position={[0, 0.5 + 0.6 * dome, -0.3]} rotation-x={-0.7} material={mats.dark}>
          <cylinderGeometry args={[0.07, 0.09, 0.7, 12]} />
        </mesh>
      )}
      {progress < 1 && (
        <>
          <Scaffold width={2.0} depth={2.0} height={1.45} position={[0, 0.04, 0]} />
          <group ref={lights}>
            {[
              [1, 1],
              [1, -1],
              [-1, 1],
              [-1, -1],
            ].map(([sx, sz]) => (
              <mesh key={`${sx}${sz}`} position={[sx * 1.0, 1.52, sz * 1.0]} material={mats.lime}>
                <sphereGeometry args={[0.035, 8, 6]} />
              </mesh>
            ))}
          </group>
          {/* tower crane */}
          <mesh position={[1.25, 1.2, 1.25]} material={mats.dark}>
            <boxGeometry args={[0.07, 2.4, 0.07]} />
          </mesh>
          <mesh position={[0.65, 2.38, 1.25]} material={mats.pale}>
            <boxGeometry args={[1.5, 0.05, 0.05]} />
          </mesh>
        </>
      )}
      <Sign
        lines={[
          progress < 1 ? `${DISTRICT_NAMES.lab} · ${pct(progress)}` : DISTRICT_NAMES.lab,
          project?.title ?? "Plot available",
        ]}
        position={[0, 2.75, 0]}
        accent={project?.accent}
      />
    </group>
  );
}

/** Side projects: one kiosk per project; the free plots wait with "coming soon" posts. */
function Workshop({ projects, mats }: { projects: CityProject[]; mats: Mats }) {
  const posts = useRef<Group>(null);
  const plots = useMemo(
    () => [-1, 0, 1].flatMap((j) => [-1, 0, 1].map((i) => [i * 0.95, j * 0.95] as [number, number])),
    [],
  );
  const kiosks = projects.slice(0, WORKSHOP_PLOTS);
  const outline = useMemo(() => new MeshBasicMaterial({ color: palette.signal, toneMapped: false, transparent: true, opacity: 0.35 }), []);
  useFrame(({ clock }) => {
    posts.current?.children.forEach((p, i) => {
      const dot = p.children[1];
      if (dot) dot.visible = Math.sin(clock.elapsedTime * 2.4 + i) > -0.2;
    });
  });
  return (
    <group>
      <mesh position-y={0.02} material={mats.slab}>
        <boxGeometry args={[2.9, 0.04, 2.9]} />
      </mesh>
      {kiosks.map((p, k) => {
        const [x, z] = plots[k];
        const accent = p.accent ?? palette.signal;
        return (
          <group key={p.slug} position={[x, 0, z]}>
            <mesh position-y={0.17} material={mats.body}>
              <boxGeometry args={[0.56, 0.3, 0.46]} />
            </mesh>
            <mesh position={[0, 0.38, -0.12]} rotation-x={0.35}>
              <boxGeometry args={[0.62, 0.025, 0.36]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
            <Sign lines={["kiosk", p.title]} width={0.7} position={[0, 0.72, 0]} accent={accent} />
          </group>
        );
      })}
      <group ref={posts}>
        {plots.slice(kiosks.length).map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position-y={0.25} material={mats.dark}>
              <boxGeometry args={[0.025, 0.42, 0.025]} />
            </mesh>
            <mesh position-y={0.48} material={mats.lime}>
              <sphereGeometry args={[0.03, 8, 6]} />
            </mesh>
            {/* plot outline */}
            {[
              [0, -0.33, 0.62, 0.012],
              [0, 0.33, 0.62, 0.012],
              [-0.31, 0, 0.012, 0.66],
              [0.31, 0, 0.012, 0.66],
            ].map(([ox, oz, w, d], e) => (
              <mesh key={e} position={[ox, 0.045, oz]} material={outline}>
                <boxGeometry args={[w, 0.006, d]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      <Sign
        lines={[
          DISTRICT_NAMES.workshop,
          kiosks.length ? `${kiosks.length} side project${kiosks.length > 1 ? "s" : ""}` : "Opening soon",
        ]}
        position={[0, 1.45, 0]}
      />
    </group>
  );
}

/** All four project districts, filled from the project files. */
export function Districts({ projects }: { projects: CityProject[] }) {
  const mats = useMats();
  const root = useRef<Group>(null);
  const one = (d: DistrictId) => projects.find((p) => p.district === d);
  useFrame(() => {
    if (root.current) root.current.scale.y = Math.max(0.001, Math.min(1, (boot.value - 0.35) / 0.5));
  });
  return (
    <group ref={root}>
      <DistrictFrame id="studio">
        <Studio project={one("studio")} mats={mats} />
      </DistrictFrame>
      <DistrictFrame id="estate">
        <Estate project={one("estate")} mats={mats} />
      </DistrictFrame>
      <DistrictFrame id="lab">
        <Lab project={one("lab")} mats={mats} />
      </DistrictFrame>
      <DistrictFrame id="workshop">
        <Workshop projects={projects.filter((p) => p.district === "workshop")} mats={mats} />
      </DistrictFrame>
    </group>
  );
}
