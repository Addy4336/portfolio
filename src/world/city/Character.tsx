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
import { adiState } from "@/lib/adi-state";
import { chirp } from "@/lib/ambience";
import { pointerState } from "@/lib/pointer-state";
import { voiceState, WAVE_EVENT } from "@/lib/voice-state";
import { boot } from "../boot";
import { palette } from "../palette";

/** Where Adi stands: on the HQ plaza, in front of the tower, turned towards the About camera. */
export const ADI_POSITION: [number, number, number] = [0.35, 0.06, 1.2];
const FACING = 0.75;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** A "high wave": both arms up, a couple of hops, happy eyes. Seconds. */
const WAVE_SECONDS = 2.3;
/** Don't greet again sooner than this after the last wave. */
const WAVE_COOLDOWN = 6;
/** Scroll speed (px per frame) above which the page counts as "moving". */
const SCROLL_MOVING = 3;
/** How long the page must be still before Adi notices you've stopped. */
const SCROLL_SETTLE = 0.45;
/** Idle greeting: still on the About section for this long. */
const IDLE_WAVE = 9;

type CharacterProps = {
  position?: [number, number, number];
  facing?: number;
  /** Seated (e.g. on a bench): legs forward, no marker. */
  sitting?: boolean;
  /** The HQ Adi follows the cursor, waves and "speaks"; others just idle. */
  interactive?: boolean;
};

/**
 * Adi, as a little toy figure built from primitives: violet hoodie, a round
 * head with a screen face, a lime headphone band and a mic boom whose tip
 * lights up while the About story is "spoken". The interactive one follows
 * the cursor, blinks, and waves on the WAVE_EVENT.
 */
export function Character({
  position = ADI_POSITION,
  facing = FACING,
  sitting = false,
  interactive = true,
}: CharacterProps) {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightFore = useRef<Group>(null);
  const leftFore = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const happyEyes = useRef<Group>(null);
  const micTip = useRef<Mesh>(null);
  const marker = useRef<Mesh>(null);
  const motion = useRef({
    yaw: 0,
    pitch: 0,
    lean: 0,
    wave: -10,
    nextBlink: 2,
    blink: 0,
    scrollY: -1,
    lastMoving: -10,
    quietSince: 0,
    wasAbout: false,
  });

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
    if (!interactive) return;
    const onWave = () => {
      const m = motion.current;
      if (performance.now() / 1000 - m.wave < WAVE_SECONDS) return;
      m.wave = performance.now() / 1000;
      m.quietSince = performance.now() / 1000;
      chirp();
    };
    window.addEventListener(WAVE_EVENT, onWave);
    return () => window.removeEventListener(WAVE_EVENT, onWave);
  }, [interactive]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const m = motion.current;
    const k = 1 - Math.exp(-delta * 6);

    if (root.current) {
      const s = clamp((boot.value - 0.88) / 0.12, 0, 1);
      root.current.scale.setScalar(Math.max(0.001, s));
    }

    // Scroll awareness (the HQ Adi only): lean along the scroll, and when the
    // page stops moving while About is on screen, notice and wave.
    const now = performance.now() / 1000;
    if (interactive) {
      const dy = m.scrollY < 0 ? 0 : window.scrollY - m.scrollY;
      m.scrollY = window.scrollY;
      if (Math.abs(dy) > SCROLL_MOVING) {
        m.lastMoving = now;
        m.quietSince = now;
      }
      const leanTarget = clamp(dy * 0.012, -0.22, 0.22);
      m.lean += (leanTarget - m.lean) * (1 - Math.exp(-delta * 8));

      const about = adiState.aboutVisible;
      if (about && !m.wasAbout) {
        // arriving: the wave comes once the camera has settled
        m.wave = Math.min(m.wave, now - WAVE_COOLDOWN);
      }
      m.wasAbout = about;
      const settled = now - m.lastMoving > SCROLL_SETTLE;
      const cooled = now - m.wave > WAVE_COOLDOWN;
      const greet = about && settled && m.lastMoving > m.wave && cooled;
      const idle = about && now - m.quietSince > IDLE_WAVE && cooled;
      if (greet || idle) {
        m.wave = now;
        m.quietSince = now;
        chirp();
      }
    }

    // 0 → 1 → 0 over the wave: eased in, held, eased out.
    const since = now - m.wave;
    const waveAmount =
      since >= 0 && since < WAVE_SECONDS
        ? smooth(0, 0.28, since) * (1 - smooth(WAVE_SECONDS - 0.4, WAVE_SECONDS, since))
        : 0;
    if (root.current) {
      const hop = waveAmount > 0 ? Math.max(0, Math.sin(since * 7.5)) * 0.05 * waveAmount : 0;
      root.current.position.y = position[1] + Math.sin(t * 2.1) * 0.004 + hop;
      root.current.rotation.z = m.lean * 0.5;
    }

    // Look towards the cursor (screen right is the character's left), or,
    // off duty, nod slowly along to whatever's in the headphones.
    const yaw = interactive ? clamp(-pointerState.x * 0.6, -0.6, 0.6) : Math.sin(t * 0.4) * 0.25;
    const pitch = interactive
      ? clamp(pointerState.y * 0.35 - m.lean * 0.8 - waveAmount * 0.1, -0.35, 0.35)
      : 0.12 + Math.sin(t * 3.2) * 0.06;
    m.yaw += (yaw - m.yaw) * k;
    m.pitch += (pitch - m.pitch) * k;
    if (head.current) {
      head.current.rotation.set(m.pitch, m.yaw, Math.sin(t * 0.9) * 0.03);
    }

    // Blink every few seconds.
    if (t > m.nextBlink) {
      m.blink = t;
      m.nextBlink = t + 2.5 + Math.random() * 3;
    }
    // Happy ^ ^ eyes while waving, otherwise the round ones (which blink).
    const happy = waveAmount > 0.35;
    if (eyes.current) {
      const b = t - m.blink;
      eyes.current.visible = !happy;
      eyes.current.scale.y = b < 0.13 ? 0.15 : 1;
    }
    if (happyEyes.current) happyEyes.current.visible = happy;

    // Arms: hang by the sides, or go up and flap while waving.
    const ease = 1 - Math.exp(-delta * 14);
    const armTo = (arm: Group | null, fore: Group | null, side: 1 | -1, phase: number) => {
      if (!arm) return;
      const rest = 0.12 * side;
      const up = 2.75 * side;
      arm.rotation.z += (rest + (up - rest) * waveAmount - arm.rotation.z) * ease;
      if (fore) fore.rotation.z += (waveAmount * Math.sin(since * 12 + phase) * 0.55 * side - fore.rotation.z) * ease;
    };
    armTo(rightArm.current, rightFore.current, -1, 0);
    armTo(leftArm.current, leftFore.current, 1, 1.4);

    // Mic light follows the "voice" (only the HQ Adi speaks).
    if (interactive) {
      voiceState.level = Math.max(voiceState.level - delta * 2.2, waveAmount, 0);
      if (micTip.current) {
        mats.mic.color.copy(micColors.dim).lerp(micColors.bright, voiceState.level);
        micTip.current.scale.setScalar(1 + voiceState.level * 0.6);
      }
    } else {
      mats.mic.color.copy(micColors.dim);
    }
    if (marker.current) {
      const pulse = (t * 0.6) % 1;
      marker.current.scale.setScalar(1 + pulse * 0.6);
      mats.ring.opacity = 0.55 * (1 - pulse);
    }
  });

  return (
    <group ref={root} position={position} rotation-y={facing} userData={{ dynamic: true }}>
      {/* "you are here" pulse on the plaza */}
      {!sitting && (
        <mesh ref={marker} rotation-x={-Math.PI / 2} position-y={0.004} material={mats.ring}>
          <ringGeometry args={[0.15, 0.165, 40]} />
        </mesh>
      )}

      {/* legs, pivoting at the hip: straight down, or forward when seated */}
      <group position-y={0.13} rotation-x={sitting ? -1.45 : 0}>
        {[-0.042, 0.042].map((x) => (
          <mesh key={x} position={[x, -0.06, 0]} material={mats.dark}>
            <capsuleGeometry args={[0.03, 0.08, 3, 8]} />
          </mesh>
        ))}
      </group>

      {/* torso */}
      <mesh position-y={0.245} material={mats.hoodie}>
        <capsuleGeometry args={[0.078, 0.085, 4, 12]} />
      </mesh>

      {/* arms, pivoting at the shoulder, each with a forearm that flaps when waving */}
      {([
        [leftArm, leftFore, 0.1, 0.12],
        [rightArm, rightFore, -0.1, -0.12],
      ] as const).map(([arm, fore, x, rest]) => (
        <group key={x} ref={arm} position={[x, 0.33, 0]} rotation-z={rest}>
          <mesh position-y={-0.05} material={mats.hoodie}>
            <capsuleGeometry args={[0.026, 0.06, 3, 8]} />
          </mesh>
          <group ref={fore} position-y={-0.1}>
            <mesh position-y={-0.045} material={mats.hoodie}>
              <capsuleGeometry args={[0.024, 0.05, 3, 8]} />
            </mesh>
            <mesh position-y={-0.1} material={mats.skin}>
              <sphereGeometry args={[0.027, 10, 8]} />
            </mesh>
          </group>
        </group>
      ))}

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
          {/* happy ^ ^ eyes, shown instead of the round ones while waving */}
          <group ref={happyEyes} position={[0, 0.002, 0.104]} visible={false}>
            {[-0.03, 0.03].map((x) => (
              <mesh key={x} position-x={x} material={mats.lime}>
                <torusGeometry args={[0.017, 0.006, 6, 12, Math.PI]} />
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
