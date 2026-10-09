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
} satisfies Record<string, CameraShot>;

export type CameraKeyName = keyof typeof CAMERA_KEYS;
