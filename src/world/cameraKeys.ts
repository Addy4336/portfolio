/**
 * One camera "shot" per page section. A section opts in with
 * `data-cam="<key>"`; the rig holds that shot while the section is on screen
 * and glides to the next section's shot as you scroll into it.
 *
 * `frame` shifts the whole picture within the viewport (fractions of width and
 * height) so the subject sits beside the text instead of under it.
 */
export type CameraKey = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  frame: [number, number];
};

export type CameraShot = { desktop: CameraKey; mobile: CameraKey };

/**
 * A shot from just outside a corner district, looking back in towards HQ.
 * `textSide` is where the page text sits, so the district is framed opposite.
 */
function districtShot(cx: number, cz: number, lift: number, textSide: "left" | "right"): CameraShot {
  const len = Math.hypot(cx, cz);
  const ox = cx / len;
  const oz = cz / len;
  const frameX = textSide === "left" ? -0.2 : 0.2;
  return {
    desktop: {
      position: [cx + ox * 5.2, 3.5 + lift, cz + oz * 5.2],
      target: [cx - ox * 0.3, 0.95 + lift * 0.5, cz - oz * 0.3],
      fov: 40,
      frame: [frameX, 0.03],
    },
    mobile: {
      position: [cx + ox * 7, 5.2 + lift, cz + oz * 7],
      target: [cx - ox * 0.3, 0.9 + lift * 0.5, cz - oz * 0.3],
      fov: 44,
      frame: [0, 0.27],
    },
  };
}

export const CAMERA_KEYS = {
  hero: {
    desktop: { position: [17, 13, 18], target: [0, 1, 0], fov: 30, frame: [-0.24, 0.02] },
    mobile: { position: [22, 19, 24], target: [0, 1.2, 0], fov: 34, frame: [0, 0.27] },
  },
  // Low angle on Adi standing on the HQ plaza, the tower rising behind.
  about: {
    desktop: { position: [2.35, 0.95, 3.35], target: [0.3, 0.75, 1.0], fov: 40, frame: [0.21, 0] },
    mobile: { position: [2.75, 1.15, 4.4], target: [0.32, 0.5, 1.15], fov: 44, frame: [0, 0.31] },
  },
  // High over the island so the whole transit loop and its four stations show.
  pipeline: {
    desktop: { position: [6.4, 13, 9.6], target: [0.2, 0, 0.5], fov: 38, frame: [-0.21, 0.03] },
    mobile: { position: [12.5, 27, 17.5], target: [0, 0, 0.6], fov: 40, frame: [0, 0.29] },
  },
  "district-studio": districtShot(4, -4, 0.1, "left"),
  "district-estate": districtShot(-4, -4, 0.1, "right"),
  "district-lab": districtShot(4, 4, 0.5, "left"),
  "district-workshop": districtShot(-4, 4, 0, "right"),
} satisfies Record<string, CameraShot>;

export type CameraKeyName = keyof typeof CAMERA_KEYS;
