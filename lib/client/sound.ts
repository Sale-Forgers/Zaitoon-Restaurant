"use client";

/** Small synthesised chimes for the kitchen and waiter screens: no audio files needed. */

let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Browsers only allow sound after a tap: call this from the first interaction. */
export function unlockSound() {
  audio();
}

const TUNES = {
  order: [
    [880, 0],
    [1174.66, 0.14],
    [1567.98, 0.28],
  ],
  call: [
    [987.77, 0],
    [987.77, 0.2],
  ],
  ready: [
    [1318.51, 0],
    [1760, 0.16],
  ],
} as const;

export function chime(kind: keyof typeof TUNES = "order") {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + 0.02;
  for (const [freq, at] of TUNES[kind]) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + at);
    gain.gain.exponentialRampToValueAtTime(0.22, t0 + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.42);
    osc.connect(gain).connect(a.destination);
    osc.start(t0 + at);
    osc.stop(t0 + at + 0.45);
  }
}
