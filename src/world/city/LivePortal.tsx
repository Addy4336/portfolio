"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Mesh, MeshBasicMaterial } from "three";
import { palette } from "../palette";
import { Sign } from "./Sign";

/** A little glowing gate on a district's plaza: "try it live". Clicking it opens the project's live app (see CityPicker). */
export function LivePortal({ position }: { position: [number, number, number] }) {
  const glow = useRef<Mesh>(null);
  const lime = useMemo(() => new MeshBasicMaterial({ color: palette.signal, toneMapped: false }), []);
  const veil = useMemo(
    () =>
      new MeshBasicMaterial({
        color: palette.violet,
        transparent: true,
        opacity: 0.4,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    veil.opacity = 0.32 + Math.sin(t * 2.2) * 0.12;
    if (glow.current) glow.current.scale.y = 0.94 + Math.sin(t * 3) * 0.04;
  });
  return (
    <group position={position} rotation-y={Math.PI}>
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.26, 0]} material={lime}>
          <boxGeometry args={[0.035, 0.52, 0.035]} />
        </mesh>
      ))}
      <mesh position={[0, 0.53, 0]} material={lime}>
        <boxGeometry args={[0.49, 0.035, 0.035]} />
      </mesh>
      <mesh ref={glow} position={[0, 0.27, 0]} material={veil} userData={{ dynamic: true }}>
        <planeGeometry args={[0.4, 0.5]} />
      </mesh>
      <Sign lines={["try it live"]} width={0.62} position={[0, 0.78, 0]} />
    </group>
  );
}
