// Analytics for the VIRELICH-style behavioural measures (Lagun 2025, IJSRA Table 7 and 8; LTA Tables 12, 14, 15; CTT Table 12).
// Pure functions. Each takes raw event times and returns plain numbers, so they can be tested and re-run later in research.
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sd = (a: number[]) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
export { med, mean, sd };

/** Ex-Gaussian fit by method of moments. tau is the slow tail: attention lapses and drift (Slip). mu is the typical speed. */
export function exGauss(rts: number[]): { mu: number; sigma: number; tau: number } {
  if (rts.length < 8) return { mu: mean(rts), sigma: 0, tau: 0 };
  const m = mean(rts), s = sd(rts); const g = rts.reduce((a, x) => a + ((x - m) / (s || 1)) ** 3, 0) / rts.length;
  const tau = g > 0 ? Math.min(s, s * Math.cbrt(g / 2)) : 0; const sigma = Math.sqrt(Math.max(s * s - tau * tau, 0));
  return { mu: m - tau, sigma, tau };
}
/** Shannon entropy of a log-binned distribution over a FIXED range (so a tight rhythm scores low and a scattered one high), scaled 0 to 1. Default range 50 ms to 3 s. */
export function entropy(vals: number[], bins = 12, lo = 50, hi = 3000): number {
  const v = vals.filter(x => x > 0).map(x => Math.log(Math.min(hi, Math.max(lo, x)))); if (v.length < 8) return 0; const a = Math.log(lo), b = Math.log(hi);
  const c = new Array(bins).fill(0); v.forEach(x => { c[Math.min(bins - 1, Math.floor(((x - a) / (b - a)) * bins))]++; });
  return -c.reduce((sum, n) => (n ? sum + (n / v.length) * Math.log(n / v.length) : sum), 0) / Math.log(bins);
}

// ---------- typing (Monkeytype style) ----------
export interface Key { t: number; ok: boolean; back?: boolean } // t in ms on the active clock; back = backspace
export interface TypingResult {
  chars: number; wpm: number; burstWpm: number; accuracy: number; firstKeyMs: number; ikiMed: number; ikiCv: number; tau: number; entropy: number;
  longPauses: number; hesitation: number; backspaces: number; resumeMs: number | null; n: number;
}
/** keys: every keystroke on the active clock. firstKeyMs: time from the text appearing to the first key. resumeMs: time from the end of an interruption to the next key. */
export function typingMetrics(keys: Key[], activeMs: number, firstKeyMs: number, resumeMs: number | null): TypingResult {
  const real = keys.filter(k => !k.back); const good = real.filter(k => k.ok).length; const ikis: number[] = [];
  for (let i = 1; i < keys.length; i++) { const d = keys[i].t - keys[i - 1].t; if (d > 0 && d < 5000) ikis.push(d); }
  const m = med(ikis); const hes = ikis.length ? ikis.filter(d => d > 2 * m && d > 400).length / ikis.length : 0;
  let burst = 0; for (let i = 0; i + 10 < real.length; i++) { const dt = real[i + 10].t - real[i].t; if (dt > 0) burst = Math.max(burst, (10 / 5) * (60000 / dt)); }
  const ex = exGauss(ikis);
  return { chars: good, wpm: activeMs > 0 ? (good / 5) / (activeMs / 60000) : 0, burstWpm: burst, accuracy: real.length ? good / real.length : 0, firstKeyMs, ikiMed: m, ikiCv: m ? sd(ikis) / mean(ikis) : 0, tau: ex.tau, entropy: entropy(ikis),
    longPauses: ikis.filter(d => d > 1000).length, hesitation: hes, backspaces: keys.filter(k => k.back).length, resumeMs, n: keys.length };
}

// ---------- task switching (Flexion) ----------
export interface Trial { rt: number; ok: boolean; kind: string } // kind: "switch" | "repeat" | "con" | "inc" | "emo" | "neu"
export function switchMetrics(tr: Trial[]) { const okT = tr.filter(t => t.ok && t.rt > 150 && t.rt < 5000); const s = okT.filter(t => t.kind === "switch").map(t => t.rt), r = okT.filter(t => t.kind === "repeat").map(t => t.rt);
  return { cost: s.length >= 4 && r.length >= 4 ? med(s) - med(r) : null, rt: med(okT.map(t => t.rt)), errors: tr.length ? tr.filter(t => !t.ok).length / tr.length : 0, cv: okT.length ? sd(okT.map(t => t.rt)) / mean(okT.map(t => t.rt)) : 0, n: tr.length }; }
// ---------- Stroop, neutral and emotional (Anchory, CAP spill) ----------
export function stroopMetrics(tr: Trial[]) { const okT = tr.filter(t => t.ok && t.rt > 150 && t.rt < 6000); const g = (k: string) => okT.filter(t => t.kind === k).map(t => t.rt);
  const con = g("con"), inc = g("inc"), emo = g("emo"), neu = g("neu");
  return { interference: con.length >= 4 && inc.length >= 4 ? med(inc) - med(con) : null, emotional: emo.length >= 4 && neu.length >= 4 ? med(emo) - med(neu) : null, rt: med(okT.map(t => t.rt)), errors: tr.length ? tr.filter(t => !t.ok).length / tr.length : 0, cv: okT.length ? sd(okT.map(t => t.rt)) / mean(okT.map(t => t.rt)) : 0, n: tr.length }; }

// ---------- cursor tracing (Flexion smoothness, Slip trajectory noise) ----------
export interface Pt { t: number; x: number; y: number; tx: number; ty: number } // pointer and target, px, ms
/** Log dimensionless jerk of the pointer path: higher (less negative) means a smoother, more fluent movement (Balasubramanian et al. 2015). */
export function logDimensionlessJerk(t: number[], x: number[], y: number[]): number | null {
  if (t.length < 60) return null; const dt = (t[t.length - 1] - t[0]) / (t.length - 1) / 1000; if (dt <= 0) return null;
  const sm = (a: number[]) => a.map((_, i) => { const lo = Math.max(0, i - 2), hi = Math.min(a.length, i + 3); return mean(a.slice(lo, hi)); });
  const X = sm(x), Y = sm(y); const vx = X.slice(1).map((v, i) => (v - X[i]) / dt), vy = Y.slice(1).map((v, i) => (v - Y[i]) / dt); const sp = vx.map((v, i) => Math.hypot(v, vy[i]));
  const ax = vx.slice(1).map((v, i) => (v - vx[i]) / dt), ay = vy.slice(1).map((v, i) => (v - vy[i]) / dt); const jx = ax.slice(1).map((v, i) => (v - ax[i]) / dt), jy = ay.slice(1).map((v, i) => (v - ay[i]) / dt);
  const j2 = jx.reduce((s, v, i) => s + (v * v + jy[i] * jy[i]) * dt, 0); const T = (t[t.length - 1] - t[0]) / 1000; const vp = Math.max(...sp); if (!vp || !j2) return null;
  return -Math.log((Math.pow(T, 3) / (vp * vp)) * j2);
}
export function traceMetrics(p: Pt[], radius: number) {
  if (p.length < 120) return null; const err = p.map(q => Math.hypot(q.x - q.tx, q.y - q.ty)); const rms = Math.sqrt(mean(err.map(e => e * e)));
  const ldlj = logDimensionlessJerk(p.map(q => q.t), p.map(q => q.x), p.map(q => q.y));
  // noise: what is left of the pointer path after removing a slow (about 0.4 s) moving average
  const w = 12; const dev = p.map((q, i) => { const lo = Math.max(0, i - w), hi = Math.min(p.length, i + w + 1); const mx = mean(p.slice(lo, hi).map(z => z.x)), my = mean(p.slice(lo, hi).map(z => z.y)); return Math.hypot(q.x - mx, q.y - my); });
  return { error: rms / radius, ldlj, noise: Math.sqrt(mean(dev.map(d => d * d))), n: p.length };
}

// ---------- tab switching entropy and latent load (LTA Table 12) ----------
export interface TabEv { ts: number; hidden: boolean }
/** Switches in the last window and how irregular the gaps between them are. Both rise when attention is being pulled away. */
export function tabStats(ev: TabEv[], now: number, windowMs = 30 * 60000) {
  const r = ev.filter(e => e.ts <= now && now - e.ts <= windowMs); const hides = r.filter(e => e.hidden); const gaps: number[] = []; for (let i = 1; i < hides.length; i++) gaps.push(hides[i].ts - hides[i - 1].ts);
  let away = 0; for (let i = 0; i < r.length; i++) if (r[i].hidden) { const nx = r.slice(i + 1).find(e => !e.hidden); if (nx) away += nx.ts - r[i].ts; }
  return { switches: hides.length, entropy: entropy(gaps, 8, 1000, 3600000), awaySec: Math.round(away / 1000), n: r.length };
}
