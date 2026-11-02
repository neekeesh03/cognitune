import { layout, initParams, lossAndGrad, countParams } from "./gpt.mjs";
const cfg = { V: 11, T: 12, C: 8, L: 2, H: 2 }; let s = 7; const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const P = initParams(cfg, rand); for (let i = 0; i < P.length; i++) P[i] += (rand() - 0.5) * 0.2;
const ids = [1, 3, 5, 2, 7, 4, 4, 9, 2, 6, 8]; const mask = [0, 0, 1, 1, 1, 1, 0, 1, 1, 1];
const g = new Float32Array(P.length); const r = lossAndGrad(cfg, P, g, ids, mask);
let worst = 0; const n = P.length; const eps = 1e-2;
const Pd = new Float64Array(P);
for (let k = 0; k < 60; k++) { const i = Math.floor(rand() * n); const a = P[i]; P[i] = a + eps; const lp = lossAndGrad(cfg, P, null, ids, mask).loss; P[i] = a - eps; const lm = lossAndGrad(cfg, P, null, ids, mask).loss; P[i] = a; const num = (lp - lm) / (2 * eps); const rel = Math.abs(num - g[i]) / Math.max(1e-3, Math.abs(num) + Math.abs(g[i])); worst = Math.max(worst, rel); if (rel > 0.05) console.log("BAD", i, num, g[i]); }
console.log("params", countParams(cfg), "loss", r.loss, "worst rel err", worst.toFixed(4));
