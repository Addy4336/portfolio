"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/**
 * Compiles every shader in the scene before the first frame is drawn.
 * `compileAsync` uses KHR_parallel_shader_compile where available, so the
 * browser compiles in the background instead of freezing the page (on
 * Windows, Chrome translates each shader to Direct3D, which is slow).
 * The canvas runs with frameloop="never" until this calls onDone.
 */
export function Precompile({ onDone }: { onDone: () => void }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    let cancelled = false;
    gl.compileAsync(scene, camera)
      .catch(() => {
        // Fall back to compiling on first render.
      })
      .then(() => {
        if (!cancelled) onDone();
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, onDone]);

  return null;
}
