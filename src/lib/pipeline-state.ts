/**
 * Where the example request is on its trip around the transit loop.
 * `progress` runs 0 → 4: one unit per stage (listen, think, act, speak).
 * Written by the "How I build" section on scroll, read by the 3D stations
 * and packet every frame. `presence` fades the packet in/out (0…1).
 */
export const pipelineState = { progress: 0, presence: 0 };

export const PIPELINE_STAGES = 4;
