"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

declare global {
  interface Window {
    __cityBench?: (frames?: number) => {
      msPerFrame: number;
      fpsEquivalent: number;
      drawCalls: number;
      triangles: number;
      parts: Record<string, number>;
    };
  }
}

/**
 * With `?bench` in the URL, exposes `window.__cityBench()`, which renders N
 * frames back to back and waits for the GPU after each one (a 1-pixel
 * readPixels forces completion). That measures real frame cost even when the
 * tab is hidden and requestAnimationFrame is throttled.
 */
export function Bench() {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("bench")) return;
    const pixel = new Uint8Array(4);
    window.__cityBench = (frames = 120) => {
      const ctx = gl.getContext();
      gl.render(scene, camera); // warm up
      ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixel);
      const start = performance.now();
      for (let i = 0; i < frames; i++) {
        gl.render(scene, camera);
        ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixel);
      }
      const ms = (performance.now() - start) / frames;
      // Visible meshes per named part ≈ draw calls per part.
      const parts: Record<string, number> = {};
      scene.traverseVisible((o) => {
        if (!(o as { isMesh?: boolean }).isMesh) return;
        let p = o.parent;
        while (p && !p.name) p = p.parent;
        const key = p?.name || "other";
        parts[key] = (parts[key] ?? 0) + 1;
      });
      return {
        msPerFrame: Math.round(ms * 100) / 100,
        fpsEquivalent: Math.round(1000 / ms),
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        parts,
      };
    };
    return () => {
      delete window.__cityBench;
    };
  }, [gl, scene, camera]);

  return null;
}
