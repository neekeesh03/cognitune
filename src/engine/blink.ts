/** Tiredness from eye blinks. Frames carry the two eye-closure scores (0 open to 1 shut) from an on-device face model. */
export interface Frame { t: number; l: number; r: number }
export interface BlinkResult { ok: boolean; rate: number; perclos: number; slow: number; seen: number; reason?: string }
export function analyseBlinks(f: Frame[], totalMs: number): BlinkResult {
  const bad = (reason: string): BlinkResult => ({ ok: false, rate: 0, perclos: 0, slow: 0, seen: 0, reason });
  const seen = f.length ? Math.min(1, (f[f.length - 1].t - f[0].t) / totalMs) : 0; if (f.length < 100 || seen < 0.7) return bad("I could not see your face well enough. Face the screen in good light.");
  const CL = 0.6; let blinks = 0, slow = 0, closedMs = 0, start = -1, span = 0;
  for (let i = 0; i < f.length; i++) {
    const dt = i ? Math.min(100, f[i].t - f[i - 1].t) : 0; span += dt; const c = (f[i].l + f[i].r) / 2 > CL;
    if (c) { closedMs += dt; if (start < 0) start = f[i].t; } else if (start >= 0) { const d = f[i].t - start; if (d >= 60 && d < 500) blinks++; else if (d >= 500) slow++; start = -1; }
  }
  const mins = span / 60000; return { ok: true, rate: Math.round(blinks / mins), perclos: Math.round((closedMs / span) * 1000) / 10, slow, seen: Math.round(seen * 100) };
}
