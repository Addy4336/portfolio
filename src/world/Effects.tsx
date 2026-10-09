"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";

/** Selective-looking glow: only the bright emissives (lime, violet, windows) pass the threshold. */
export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={0.6} luminanceSmoothing={0.2} intensity={0.85} radius={0.65} />
    </EffectComposer>
  );
}
