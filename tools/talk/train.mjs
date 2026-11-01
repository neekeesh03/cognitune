// Trains the 10k-parameter talk model from scratch in plain JavaScript (no libraries, no outside AI).
// Architecture: signed hashed word and character n-grams -> mean embedding (d=16)
//               + previous-act embedding (dc=8) -> tanh layer (H=48) -> softmax over 26 conversation acts.
// Run:  node tools/talk/train.mjs        Writes src/engine/talkModel.json and tools/talk/report.json
import fs from "fs";
import { ACTS, build, R } from "./data.mjs";
import { HAND } from "./hand.mjs";

const B = 1400, D = 32, DC = 12, H = 96, K = ACTS.length, NC = K + 1; // previous act: one slot per act plus "none"
const P = B * D + NC * DC + (D + DC) * H + H + H * K + K;
console.log("parameters:", P);

export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export const tok = t => t.toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
export function feats(text) {
  const w = tok(text); const out = [];
  for (const x of w) { out.push("w:" + x); const p = "^" + x + "$"; for (let i = 0; i + 3 <= p.length; i++) out.push("c:" + p.slice(i, i + 3)); }
  for (let i = 0; i + 1 < w.length; i++) out.push("b:" + w[i] + "_" + w[i + 1]);
  for (let i = 0; i + 1 < w.length; i++) if (["not", "dont", "never", "cant", "no", "nothing"].includes(w[i])) out.push("n:" + w[i + 1]);
  return out.map(f => { const h = hash(f); return [h % B, ((h >>> 20) & 1) ? 1 : -1]; });
}
const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const E = new Float64Array(B * D).map(() => gauss() * 0.1), C = new Float64Array(NC * DC).map(() => gauss() * 0.1);
const W1 = new Float64Array((D + DC) * H).map(() => gauss() * Math.sqrt(1 / (D + DC))), b1 = new Float64Array(H);
const W2 = new Float64Array(H * K).map(() => gauss() * Math.sqrt(1 / H)), b2 = new Float64Array(K);
const params = { E, C, W1, b1, W2, b2 };
const opt = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, { m: new Float64Array(v.length), v: new Float64Array(v.length) }]));
const prevIdx = p => (p === "" ? K : ACTS.indexOf(p));

function forward(fs_, prev, drop) {
  const x = new Float64Array(D); let n = 0; const used = [];
  for (const [b, s] of fs_) { if (drop && R() < drop) continue; used.push([b, s]); n++; for (let d = 0; d < D; d++) x[d] += s * E[b * D + d]; }
  const sc = n ? 1 / Math.sqrt(n) : 0; for (let d = 0; d < D; d++) x[d] *= sc;
  const pi = prevIdx(prev); const inp = new Float64Array(D + DC); inp.set(x); for (let d = 0; d < DC; d++) inp[D + d] = C[pi * DC + d];
  const h = new Float64Array(H); for (let j = 0; j < H; j++) { let z = b1[j]; for (let i = 0; i < D + DC; i++) z += inp[i] * W1[i * H + j]; h[j] = Math.tanh(z); }
  const z = new Float64Array(K); for (let k = 0; k < K; k++) { let a = b2[k]; for (let j = 0; j < H; j++) a += h[j] * W2[j * K + k]; z[k] = a; }
  let mx = -1e9; for (const v of z) if (v > mx) mx = v; let sum = 0; const p = new Float64Array(K); for (let k = 0; k < K; k++) { p[k] = Math.exp(z[k] - mx); sum += p[k]; } for (let k = 0; k < K; k++) p[k] /= sum;
  return { x, inp, h, p, used, sc, pi };
}
export function predict(text, prev) { return forward(feats(text), prev, 0).p; }

const { train, test } = build();
const trF = train.map(e => ({ f: feats(e.x), prev: e.prev, y: ACTS.indexOf(e.y) })); const teF = test.map(e => ({ f: feats(e.x), prev: e.prev, y: ACTS.indexOf(e.y), x: e.x }));
const hdF = HAND.map(([x, prev, y]) => ({ f: feats(x), prev, y: ACTS.indexOf(y), x }));
if (hdF.some(e => e.y < 0)) throw new Error("bad act in HAND");
const acc = set => { let ok = 0; for (const e of set) { const p = forward(e.f, e.prev, 0).p; let b = 0; for (let k = 1; k < K; k++) if (p[k] > p[b]) b = k; if (b === e.y) ok++; } return ok / set.length; };

const EPOCHS = 30, BATCH = 64; let step = 0;
function adam(name, grad, lr, wd = 0) { const o = opt[name], w = params[name]; const t = step; const b1_ = 0.9, b2_ = 0.999; for (const i of grad.keys()) { const g = grad.get(i) + wd * w[i]; o.m[i] = b1_ * o.m[i] + (1 - b1_) * g; o.v[i] = b2_ * o.v[i] + (1 - b2_) * g * g; const mh = o.m[i] / (1 - Math.pow(b1_, t)), vh = o.v[i] / (1 - Math.pow(b2_, t)); w[i] -= lr * mh / (Math.sqrt(vh) + 1e-8); } }
const hist = [];
for (let ep = 0; ep < EPOCHS; ep++) {
  const idx = trF.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const lr = 0.015 * (ep < EPOCHS - 8 ? 1 : 0.3); let loss = 0;
  for (let s = 0; s < idx.length; s += BATCH) {
    step++; const g = { E: new Map(), C: new Map(), W1: new Map(), b1: new Map(), W2: new Map(), b2: new Map() }; const add = (m, i, v) => m.set(i, (m.get(i) || 0) + v);
    const bs = idx.slice(s, s + BATCH);
    for (const ii of bs) {
      const e = trF[ii]; const r = forward(e.f, e.prev, 0.2); loss -= Math.log(r.p[e.y] * 0.95 + 0.05 / K + 1e-9);
      const dz = new Float64Array(K); for (let k = 0; k < K; k++) dz[k] = (r.p[k] - ((k === e.y ? 0.95 : 0) + 0.05 / K)) / bs.length;
      const dh = new Float64Array(H); for (let j = 0; j < H; j++) { let a = 0; for (let k = 0; k < K; k++) { add(g.W2, j * K + k, r.h[j] * dz[k]); a += W2[j * K + k] * dz[k]; } dh[j] = a * (1 - r.h[j] * r.h[j]); }
      for (let k = 0; k < K; k++) add(g.b2, k, dz[k]);
      const dinp = new Float64Array(D + DC); for (let j = 0; j < H; j++) { add(g.b1, j, dh[j]); for (let i = 0; i < D + DC; i++) { add(g.W1, i * H + j, r.inp[i] * dh[j]); dinp[i] += W1[i * H + j] * dh[j]; } }
      for (let d = 0; d < DC; d++) add(g.C, r.pi * DC + d, dinp[D + d]);
      for (const [b, sg] of r.used) for (let d = 0; d < D; d++) add(g.E, b * D + d, sg * r.sc * dinp[d]);
    }
    for (const k of Object.keys(g)) adam(k, g[k], lr, k === "E" ? 3e-5 : 0);
  }
  if (ep % 5 === 4 || ep === EPOCHS - 1) { const a = { ep: ep + 1, loss: +(loss / trF.length).toFixed(4), train: +acc(trF.slice(0, 3000)).toFixed(3), heldOutWording: +acc(teF).toFixed(3), handWritten: +acc(hdF).toFixed(3) }; hist.push(a); console.log(JSON.stringify(a)); }
}

// per-class held-out accuracy and the most confused pairs
const conf = {}; const perClass = Object.fromEntries(ACTS.map(a => [a, { n: 0, ok: 0 }]));
const wrong = [];
for (const e of [...teF, ...hdF]) { const p = forward(e.f, e.prev, 0).p; let b = 0; for (let k = 1; k < K; k++) if (p[k] > p[b]) b = k; perClass[ACTS[e.y]].n++; if (b === e.y) perClass[ACTS[e.y]].ok++; else { const key = ACTS[e.y] + "->" + ACTS[b]; conf[key] = (conf[key] || 0) + 1; if (hdF.includes(e)) wrong.push([e.x, e.prev, ACTS[e.y], ACTS[b], +p[b].toFixed(2)]); } }
const worst = Object.entries(perClass).map(([a, v]) => [a, +(v.ok / v.n).toFixed(2)]).sort((x, y) => x[1] - y[1]).slice(0, 6);
// confidence calibration on held-out wording: how often is the model right when it is at least 0.5 / 0.7 sure
const cal = th => { let n = 0, ok = 0; for (const e of [...teF, ...hdF]) { const p = forward(e.f, e.prev, 0).p; let b = 0; for (let k = 1; k < K; k++) if (p[k] > p[b]) b = k; if (p[b] >= th) { n++; if (b === e.y) ok++; } } return { threshold: th, answered: +(n / (teF.length + hdF.length)).toFixed(3), accuracyWhenAnswering: +(ok / Math.max(1, n)).toFixed(3) }; };
const calibration = [0.4, 0.5, 0.6, 0.7].map(cal);
const round = (a, n = 3) => Array.from(a, v => +v.toFixed(n));
const model = { v: 1, labels: ACTS, B, D, DC, H, K, params: P, E: round(E), C: round(C), W1: round(W1), b1: round(b1), W2: round(W2), b2: round(b2), threshold: 0.5 };
fs.writeFileSync(new URL("../../src/engine/talkModel.json", import.meta.url), JSON.stringify(model));
fs.writeFileSync(new URL("./report.json", import.meta.url), JSON.stringify({ parameters: P, trainExamples: trF.length, heldOutWordingExamples: teF.length, handWrittenExamples: hdF.length, history: hist, weakestActs: worst, topConfusions: Object.entries(conf).sort((a, b) => b[1] - a[1]).slice(0, 8), calibration, handWrittenMisses: wrong.slice(0, 25) }, null, 2));
console.log("weakest:", JSON.stringify(worst)); console.log("calibration:", JSON.stringify(calibration));
