"use client";

/**
 * The city's ambient sound, synthesised with the Web Audio API: a low,
 * slowly breathing drone, a filtered-noise "city hum", and the occasional
 * soft two-note blip of agents talking. Zero audio files to download.
 * Off by default; only starts from a click.
 */
type Ambience = { ctx: AudioContext; master: GainNode; timer: number };

let current: Ambience | null = null;

function noiseBuffer(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    // brown-ish noise: integrated white noise, softer than hiss
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

function blip(ctx: AudioContext, out: AudioNode) {
  const now = ctx.currentTime;
  const base = [660, 740, 880, 990][Math.floor(Math.random() * 4)];
  for (const [i, freq] of [base, base * 1.5].entries()) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.09;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.05, start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(start + 0.3);
  }
}

export function startAmbience() {
  if (current) return;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  master.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 1.5);

  // drone: two detuned low sines through a lowpass, with a slow swell
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.18;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 420;
  droneGain.connect(lowpass).connect(master);
  for (const freq of [55, 82.6, 110.3]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(droneGain);
    osc.start();
  }
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 0.06;
  lfo.connect(lfoGain).connect(droneGain.gain);
  lfo.start();

  // city hum
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx);
  noise.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 300;
  band.Q.value = 0.6;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.05;
  noise.connect(band).connect(noiseGain).connect(master);
  noise.start();

  const schedule = () => {
    blip(ctx, master);
    if (current) current.timer = window.setTimeout(schedule, 3000 + Math.random() * 5000);
  };
  current = { ctx, master, timer: window.setTimeout(schedule, 2000) };
}

export function stopAmbience() {
  const a = current;
  if (!a) return;
  current = null;
  window.clearTimeout(a.timer);
  a.master.gain.cancelScheduledValues(a.ctx.currentTime);
  a.master.gain.setValueAtTime(a.master.gain.value, a.ctx.currentTime);
  a.master.gain.linearRampToValueAtTime(0, a.ctx.currentTime + 0.6);
  window.setTimeout(() => a.ctx.close(), 700);
}

/** A short happy three-note chirp, only if the visitor has turned the sound on. */
export function chirp() {
  const a = current;
  if (!a) return;
  const now = a.ctx.currentTime;
  [784, 988, 1319].forEach((freq, i) => {
    const osc = a.ctx.createOscillator();
    const env = a.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const start = now + i * 0.07;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.07, start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.connect(env).connect(a.master);
    osc.start(start);
    osc.stop(start + 0.25);
  });
}
