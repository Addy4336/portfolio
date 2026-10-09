/**
 * How "loud" Adi is speaking right now, 0…1. The live-caption story bumps it
 * each time a word lands; the character's mic light reads and decays it every
 * frame. Plain mutable object: never triggers a React render.
 */
export const voiceState = { level: 0 };

export function speak(amount = 1) {
  voiceState.level = Math.min(1, voiceState.level + amount);
}

export const WAVE_EVENT = "adi:wave";
