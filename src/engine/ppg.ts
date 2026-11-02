/** Heart signal from a fingertip over the camera (photoplethysmography). Runs on the device; no video is kept. */
export interface PpgResult { ok: boolean; hr: number; rmssd: number; beats: number; quality: number; snr?: number; hrvOk?: boolean; reason?: string }
/** Below this signal-to-noise ratio, beat timing is too jittery to trust beat-to-beat variability, so only heart rate is reported. */
export const SNR_MIN = 1; // chosen on 200 simulated testers: keeps 74% of readings, 83% of those within 0.7 to 1.5x of the true variability (73% without the gate)
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
/** t in ms, v = average red brightness per frame. */
export function analysePpg(t: number[], v: number[]): PpgResult {
  const bad = (reason: string): PpgResult => ({ ok: false, hr: 0, rmssd: 0, beats: 0, quality: 0, reason });
  if (t.length < 150) return bad("Not enough camera frames.");
  const fs = (t.length - 1) / ((t[t.length - 1] - t[0]) / 1000); if (fs < 15) return bad("The camera is too slow on this device.");
  // remove slow drift (moving average ~0.8 s), then smooth (~0.1 s)
  const w = Math.max(3, Math.round(fs * 0.8)), sm = Math.max(1, Math.round(fs * 0.1)); const x: number[] = [];
  const ps = [0]; v.forEach((a, i) => ps.push(ps[i] + a));
  for (let i = 0; i < v.length; i++) { const a = Math.max(0, i - w), b = Math.min(v.length, i + w + 1); x.push(v[i] - (ps[b] - ps[a]) / (b - a)); }
  const y = x.map((_, i) => { const a = Math.max(0, i - sm), b = Math.min(x.length, i + sm + 1); let s = 0; for (let k = a; k < b; k++) s += x[k]; return s / (b - a); });
  const sd = Math.sqrt(y.reduce((s, a) => s + a * a, 0) / y.length); if (sd < 0.05) return bad("No pulse signal. Cover the camera fully with your fingertip.");
  const hf = x.map((a, i) => a - y[i]); const noiseSd = Math.sqrt(hf.reduce((s2, a) => s2 + a * a, 0) / hf.length) || 1e-9; const snr = sd / noiseSd;
  const minGap = Math.round(fs * 0.33), peaks: number[] = []; // times in ms with parabolic refinement
  let last = -minGap;
  for (let i = 1; i < y.length - 1; i++) if (y[i] > 0.25 * sd && y[i] >= y[i - 1] && y[i] > y[i + 1] && i - last >= minGap) {
    const d = y[i - 1] - 2 * y[i] + y[i + 1]; const off = d ? (0.5 * (y[i - 1] - y[i + 1])) / d : 0; const dt = off >= 0 ? t[i + 1] - t[i] : t[i] - t[i - 1];
    peaks.push(t[i] + off * dt); last = i;
  }
  const ibi: number[] = []; for (let i = 1; i < peaks.length; i++) ibi.push(peaks[i] - peaks[i - 1]);
  const m = med(ibi); const good = ibi.filter(d => d > 330 && d < 1500 && Math.abs(d - m) < 0.3 * m);
  const quality = ibi.length ? good.length / ibi.length : 0;
  if (good.length < 25 || quality < 0.7) return bad("The signal was too shaky. Rest your hand on a table and keep still.");
  const hr = 60000 / (good.reduce((s, a) => s + a, 0) / good.length);
  // successive differences only between neighbouring good beats
  const diffs: number[] = []; for (let i = 1; i < ibi.length; i++) if (good.includes(ibi[i]) && good.includes(ibi[i - 1])) diffs.push(ibi[i] - ibi[i - 1]);
  const rmssd = diffs.length >= 15 ? Math.sqrt(diffs.reduce((s, a) => s + a * a, 0) / diffs.length) : 0;
  if (!rmssd) return bad("Too few clean beats in a row. Try again.");
  const hrvOk = snr >= SNR_MIN; return { ok: true, hr: Math.round(hr), rmssd: hrvOk ? Math.round(rmssd) : 0, beats: good.length + 1, quality: Math.round(quality * 100), snr: Math.round(snr * 10) / 10, hrvOk };
}
