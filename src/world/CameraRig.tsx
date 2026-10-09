"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { listenToPointer, pointerState } from "@/lib/pointer-state";
import { CAMERA_KEYS, type CameraKey, type CameraShot } from "./cameraKeys";

/** `hold`: fraction of the section during which its shot stays put before gliding on. */
type Section = { shot: CameraShot; top: number; height: number; hold: number };

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Reads every `[data-cam]` section's position on the page (and its optional
 * `data-cam-hold`). Re-run on resize / content changes.
 */
function measureSections(): Section[] {
  return [...document.querySelectorAll<HTMLElement>("[data-cam]")]
    .map((el) => {
      const shot = CAMERA_KEYS[el.dataset.cam as keyof typeof CAMERA_KEYS];
      const rect = el.getBoundingClientRect();
      const hold = Number(el.dataset.camHold ?? 0.45);
      return shot ? { shot, top: rect.top + window.scrollY, height: rect.height, hold } : null;
    })
    .filter((s): s is Section => s !== null)
    .sort((a, b) => a.top - b.top);
}

export function CameraRig({ isMobile }: { isMobile: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const sections = useRef<Section[]>([]);
  const pointer = useRef({ sx: 0, sy: 0 });
  const current = useRef<{ pos: Vector3; target: Vector3; fov: number; fx: number; fy: number } | null>(
    null,
  );
  const tmp = useMemo(
    () => ({ pos: new Vector3(), target: new Vector3(), a: new Vector3(), b: new Vector3(), right: new Vector3() }),
    [],
  );

  useEffect(() => {
    const refresh = () => (sections.current = measureSections());
    refresh();
    const ro = new ResizeObserver(refresh);
    ro.observe(document.body);
    // The canvas outlives page navigations, so also re-read the sections
    // periodically: a new page can have the same height as the old one.
    const timer = window.setInterval(refresh, 800);
    listenToPointer();
    return () => {
      ro.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const portrait = isMobile || size.width / size.height < 0.9;
    const pick = (shot: CameraShot): CameraKey => (portrait ? shot.mobile : shot.desktop);

    // Which section is the middle of the viewport in, and how far through it?
    const list = sections.current;
    const mid = window.scrollY + window.innerHeight * 0.5;
    let from: CameraKey = pick(CAMERA_KEYS.hero);
    let to = from;
    let blend = 0;
    if (list.length) {
      let i = list.findIndex((s, k) => mid < s.top + s.height || k === list.length - 1);
      if (i < 0) i = list.length - 1;
      const s = list[i];
      from = pick(s.shot);
      const next = list[i + 1];
      if (next) {
        to = pick(next.shot);
        // hold the shot for the first part of the section, then glide to the next
        blend = smoothstep(s.hold, 1, (mid - s.top) / s.height);
      } else {
        to = from;
      }
    }

    tmp.pos.fromArray(from.position).lerp(tmp.a.fromArray(to.position), blend);
    tmp.target.fromArray(from.target).lerp(tmp.b.fromArray(to.target), blend);
    const fov = from.fov + (to.fov - from.fov) * blend;
    const fx = from.frame[0] + (to.frame[0] - from.frame[0]) * blend;
    const fy = from.frame[1] + (to.frame[1] - from.frame[1]) * blend;

    // slow idle drift around the city, plus a little cursor parallax
    const t = clock.elapsedTime;
    const p = pointer.current;
    const k = 1 - Math.exp(-delta * 3);
    p.sx += (pointerState.x - p.sx) * k;
    p.sy += (pointerState.y - p.sy) * k;
    const angle = Math.sin(t * 0.07) * 0.05 + (portrait ? 0 : p.sx * 0.06);
    const dx = tmp.pos.x - tmp.target.x;
    const dz = tmp.pos.z - tmp.target.z;
    tmp.pos.x = tmp.target.x + dx * Math.cos(angle) - dz * Math.sin(angle);
    tmp.pos.z = tmp.target.z + dx * Math.sin(angle) + dz * Math.cos(angle);
    tmp.pos.y += portrait ? 0 : -p.sy * 0.35;

    // damp towards the goal so scroll jumps never snap the camera
    const c = (current.current ??= {
      pos: tmp.pos.clone(),
      target: tmp.target.clone(),
      fov,
      fx,
      fy,
    });
    const d = 1 - Math.exp(-delta * 4);
    c.pos.lerp(tmp.pos, d);
    c.target.lerp(tmp.target, d);
    c.fov += (fov - c.fov) * d;
    c.fx += (fx - c.fx) * d;
    c.fy += (fy - c.fy) * d;

    camera.position.copy(c.pos);
    camera.lookAt(c.target);
    if (Math.abs(camera.fov - c.fov) > 0.01) {
      camera.fov = c.fov;
    }
    const w = size.width;
    const h = size.height;
    camera.setViewOffset(w, h, c.fx * w, c.fy * h, w, h);
    camera.updateProjectionMatrix();
  });

  return null;
}
