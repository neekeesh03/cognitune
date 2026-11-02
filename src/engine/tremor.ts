/** Hand steadiness from the phone motion sensor: size and pitch of the tiny shake while you hold still. */
export interface TremorResult { ok: boolean; rms: number; hz: number; rate: number; reason?: string }
export function analyseTremor(t: number[], x: number[], y: number[], z: number[]): TremorResult {
  const bad = (reason: string): TremorResult => ({ ok: false, rms: 0, hz: 0, rate: 0, reason });
  if (t.length < 200) return bad("The motion sensor gave too few readings.");
  const rate = (t.length - 1) / ((t[t.length - 1] - t[0]) / 1000); if (rate < 25) return bad("This phone's motion sensor is too slow for this check.");
  const w = Math.max(2, Math.round(rate * 0.12)); // remove gravity and slow arm drift (below ~4 Hz)
  const hp = (a: number[]) => { const ps = [0]; a.forEach((v, i) => ps.push(ps[i] + v)); return a.map((v, i) => { const lo = Math.max(0, i - w), hi = Math.min(a.length, i + w + 1); return v - (ps[hi] - ps[lo]) / (hi - lo); }); };
  const H = [hp(x), hp(y), hp(z)]; const n = t.length;
  const rms = Math.sqrt(H.reduce((s, h) => s + h.reduce((q, v) => q + v * v, 0), 0) / n);
  let best = 0, hz = 0; // strongest frequency between 4 and 14 Hz, summed over the three axes
  for (let f = 4; f <= Math.min(14, rate / 2 - 1); f += 0.25) { let p = 0; for (const h of H) { let re = 0, im = 0; for (let i = 0; i < n; i++) { const a = 2 * Math.PI * f * (t[i] / 1000); re += h[i] * Math.cos(a); im += h[i] * Math.sin(a); } p += re * re + im * im; } if (p > best) { best = p; hz = f; } }
  return { ok: true, rms: Math.round(rms * 1000) / 1000, hz: Math.round(hz * 10) / 10, rate: Math.round(rate) };
}
