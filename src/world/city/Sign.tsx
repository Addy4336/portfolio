"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, Mesh, MeshBasicMaterial, SRGBColorSpace, Vector3 } from "three";
import { palette } from "../palette";

type SignProps = {
  lines: [string, string?];
  width?: number;
  position?: [number, number, number];
  /** Face the camera (billboard) instead of a fixed direction. */
  billboard?: boolean;
  rotationY?: number;
  accent?: string;
};

/**
 * A small lit sign drawn onto a canvas texture with the site's own fonts:
 * a mono label line and a display-font title. No font files or text
 * geometry to download.
 */
export function Sign({ lines, width = 1.4, position = [0, 0, 0], billboard = true, rotationY = 0, accent = palette.signal }: SignProps) {
  const mesh = useRef<Mesh>(null);
  const W = 512;
  const H = 160;

  const { texture, material } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, depthWrite: false });
    return { texture, material };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const ctx = (texture.image as HTMLCanvasElement).getContext("2d")!;
      ctx.clearRect(0, 0, W, H);
      // panel
      ctx.fillStyle = "rgba(7, 8, 12, 0.88)";
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(4, 4, W - 8, H - 8, 26);
      ctx.fill();
      ctx.stroke();
      ctx.textBaseline = "middle";
      if (!lines[1]) {
        // A one-line sign (e.g. ON AIR): big, centred.
        ctx.fillStyle = accent;
        ctx.textAlign = "center";
        ctx.font = '600 64px "Geist Mono", ui-monospace, monospace';
        ctx.fillText(lines[0].toUpperCase(), W / 2, H / 2 + 2);
        ctx.textAlign = "start";
        texture.needsUpdate = true;
        return;
      }
      // label line
      ctx.fillStyle = accent;
      ctx.font = '500 26px "Geist Mono", ui-monospace, monospace';
      ctx.fillText(lines[0].toUpperCase(), 34, 48);
      // title line
      {
        ctx.fillStyle = palette.paper;
        let size = 54;
        ctx.font = `600 ${size}px Unbounded, system-ui, sans-serif`;
        while (ctx.measureText(lines[1]).width > W - 68 && size > 26) {
          size -= 2;
          ctx.font = `600 ${size}px Unbounded, system-ui, sans-serif`;
        }
        ctx.fillText(lines[1], 34, 106);
      }
      texture.needsUpdate = true;
    };
    draw();
    // Redraw once the web fonts are in (the first draw may use fallbacks).
    Promise.all([document.fonts.load("600 54px Unbounded"), document.fonts.load('500 26px "Geist Mono"')])
      .then(draw)
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [texture, lines, accent]);

  useEffect(() => () => {
    texture.dispose();
    material.dispose();
  }, [texture, material]);

  // Billboard around the vertical axis only, so signs stay upright.
  const world = useMemo(() => new Vector3(), []);
  useFrame(({ camera }) => {
    if (!billboard || !mesh.current) return;
    mesh.current.getWorldPosition(world);
    mesh.current.lookAt(camera.position.x, world.y, camera.position.z);
  });

  return (
    <mesh ref={mesh} position={position} rotation-y={billboard ? 0 : rotationY} material={material}>
      <planeGeometry args={[width, (width * H) / W]} />
    </mesh>
  );
}
