"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import { pointerState } from "@/lib/pointer-state";
import { voiceState, WAVE_EVENT } from "@/lib/voice-state";
import { boot } from "../boot";
import { palette } from "../palette";

/** Where Adi stands: on the HQ plaza, in front of the tower, turned towards the About camera. */
export const ADI_POSITION: [number, number, number] = [0.35, 0.06, 1.2];
const FACING = 0.75;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Adi, as a little toy figure built from primitives: violet hoodie, a round
 * head with a screen face, a lime headphone band and a mic boom whose tip
 * lights up while the About story is "spoken". The head follows the cursor,
 * the eyes blink, and the right arm waves on the WAVE_EVENT.
 */
export function Character() {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const micTip = useRef<Mesh>(null);
  const marker = useRef<Mesh>(null);
  const motion = useRef({ yaw: 0, pitch: 0, wave: -10, nextBlink: 2, blink: 0 });

  const mats = useMemo(
    () => ({
      hoodie: new MeshLambertMaterial({ color: "#5a45d4" }),
      dark: new MeshLambertMaterial({ color: "#1b2234" }),
      // lighter than the cups so the mic boom reads against the dark tower
      boom: new MeshLambertMaterial({ color: "#8f97b8" }),
      skin: new MeshLambertMaterial({ color: palette.paper }),
      face: new MeshLambertMaterial({ color: "#0b0e17" }),
      lime: new MeshBasicMaterial({ color: palette.signal, toneMapped: false }),
      mic: new MeshBasicMaterial({ color: palette.signal, toneMapped: false }),
      ring: new MeshBasicMaterial({ color: palette.signal, toneMapped: false, transparent: true, opacity: 0.6 }),
    }),
    [],
  );

  const boom = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(0.108, 0, 0),
      new Vector3(0.105, -0.055, 0.05),
      new Vector3(0.045, -0.078, 0.098),
    ]);
    return new TubeGeometry(curve, 16, 0.006, 6, false);
  }, []);

  const micColors = useMemo(
    () => ({ dim: new Color(palette.signal).multiplyScalar(0.35), bright: new Color(palette.signal).multiplyScalar(1.6) }),
    [],
  );

  useEffect(() => {
    const onWave = () => (motion.current.wave = performance.now() / 1000);
    window.addEventListener(WAVE_EVENT, onWave);
    return () => window.removeEventListener(WAVE_EVENT, onWave);
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const m = motion.current;
    const k = 1 - Math.exp(-delta * 6);

    if (root.current) {
      const s = clamp((boot.value - 0.88) / 0.12, 0, 1);
      root.current.scale.setScalar(Math.max(0.001, s));
      root.current.position.y = ADI_POSITION[1] + Math.sin(t * 2.1) * 0.004;
    }

    // Look towards the cursor (screen right is the character's left).
    m.yaw += (clamp(-pointerState.x * 0.6, -0.6, 0.6) - m.yaw) * k;
    m.pitch += (clamp(pointerState.y * 0.35, -0.25, 0.35) - m.pitch) * k;
    if (head.current) {
      head.current.rotation.set(m.pitch, m.yaw, Math.sin(t * 0.9) * 0.03);
    }

    // Blink every few seconds.
    if (t > m.nextBlink) {
      m.blink = t;
      m.nextBlink = t + 2.5 + Math.random() * 3;
    }
    if (eyes.current) {
      const b = t - m.blink;
      eyes.current.scale.y = b < 0.13 ? 0.15 : 1;
    }

    // Wave for 1.6 s after the event.
    if (rightArm.current) {
      const since = performance.now() / 1000 - m.wave;
      const waving = since >= 0 && since < 1.6;
      const target = waving ? -2.5 + Math.sin(since * 12) * 0.35 : -0.12;
      rightArm.current.rotation.z += (target - rightArm.current.rotation.z) * (1 - Math.exp(-delta * 10));
    }

    // Mic light follows the "voice".
    voiceState.level = Math.max(0, voiceState.level - delta * 2.2);
    if (micTip.current) {
      mats.mic.color.copy(micColors.dim).lerp(micColors.bright, voiceState.level);
      micTip.current.scale.setScalar(1 + voiceState.level * 0.6);
    }
    if (marker.current) {
      const pulse = (t * 0.6) % 1;
      marker.current.scale.setScalar(1 + pulse * 0.6);
      mats.ring.opacity = 0.55 * (1 - pulse);
    }
  });

  return (
    <group ref={root} position={ADI_POSITION} rotation-y={FACING}>
      {/* "you are here" pulse on the plaza */}
      <mesh ref={marker} rotation-x={-Math.PI / 2} position-y={0.004} material={mats.ring}>
        <ringGeometry args={[0.15, 0.165, 40]} />
      </mesh>

      {/* legs */}
      {[-0.042, 0.042].map((x) => (
        <mesh key={x} position={[x, 0.07, 0]} material={mats.dark}>
          <capsuleGeometry args={[0.03, 0.08, 3, 8]} />
        </mesh>
      ))}

      {/* torso */}
      <mesh position-y={0.245} material={mats.hoodie}>
        <capsuleGeometry args={[0.078, 0.085, 4, 12]} />
      </mesh>

      {/* arms: left hangs, right can wave (pivot at the shoulder) */}
      <group position={[0.1, 0.33, 0]} rotation-z={0.12}>
        <mesh position-y={-0.07} material={mats.hoodie}>
          <capsuleGeometry args={[0.026, 0.1, 3, 8]} />
        </mesh>
      </group>
      <group ref={rightArm} position={[-0.1, 0.33, 0]} rotation-z={-0.12}>
        <mesh position-y={-0.07} material={mats.hoodie}>
          <capsuleGeometry args={[0.026, 0.1, 3, 8]} />
        </mesh>
      </group>

      {/* head, with headphones and mic */}
      <group ref={head} position-y={0.385}>
        <mesh position-y={0.1} material={mats.skin}>
          <sphereGeometry args={[0.1, 24, 18]} />
        </mesh>
        <group position-y={0.1}>
          {/* screen face */}
          <mesh position-z={0.06} scale={[0.78, 0.56, 0.45]} material={mats.face}>
            <sphereGeometry args={[0.1, 20, 14]} />
          </mesh>
          <group ref={eyes} position={[0, 0.006, 0.104]}>
            {[-0.03, 0.03].map((x) => (
              <mesh key={x} position-x={x} material={mats.lime}>
                <capsuleGeometry args={[0.009, 0.016, 2, 6]} />
              </mesh>
            ))}
          </group>
          {/* headphone band over the top, cups on the sides */}
          <mesh material={mats.lime}>
            <torusGeometry args={[0.112, 0.011, 8, 32, Math.PI]} />
          </mesh>
          {[-0.108, 0.108].map((x) => (
            <mesh key={x} position-x={x} rotation-z={Math.PI / 2} material={mats.dark}>
              <cylinderGeometry args={[0.036, 0.036, 0.034, 16]} />
            </mesh>
          ))}
          <mesh geometry={boom} material={mats.boom} />
          <mesh ref={micTip} position={[0.045, -0.078, 0.098]} material={mats.mic}>
            <sphereGeometry args={[0.015, 12, 10]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
