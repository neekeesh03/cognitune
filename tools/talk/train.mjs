// Trains the rabbit's conversation model from scratch in plain JavaScript (no libraries, no outside AI).
// v3 architecture (566,881 parameters):
//   signed hashed word / character / phrase n-grams -> mean embedding (D=32, 16,000 buckets)
//   + embeddings of the previous TWO conversation acts (DC=16 each)
//   -> tanh layer (256) -> tanh layer (128) -> softmax over the conversation acts.
// Run:  node tools/talk/train.mjs     Writes src/engine/talkModel.json (int8-quantised) and tools/talk/report.json
import fs from "fs";
import { ACTS, build, R } from "./data.mjs";
import { HAND } from "./hand.mjs";
import { OOD } from "./ood.mjs";

const B = +(process.env.B || 16000), D = +(process.env.D || 32), DC = 16, H1 = +(process.env.H1 || 256), H2 = +(process.env.H2 || 128), K = ACTS.length, NC = K + 1, IN = D + 2 * DC;
const P = B * D + 2 * NC * DC + IN * H1 + H1 + H1 * H2 + H2 + H2 * K + K;
console.log("parameters:", P, "acts:", K);
const EPOCHS = +(process.env.EPOCHS || 14), BATCH = 64;

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const tok = t => t.toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
function feats(text) {
  const w = tok(text); const out = [];
  for (const x of w) { out.push("w:" + x); const p = "^" + x + "$"; for (let i = 0; i + 3 <= p.length; i++) out.push("c:" + p.slice(i, i + 3)); }
  for (let i = 0; i + 1 < w.length; i++) out.push("b:" + w[i] + "_" + w[i + 1]);
  for (let i = 0; i + 2 < w.length; i++) out.push("t:" + w[i] + "_" + w[i + 1] + "_" + w[i + 2]);
  for (let i = 0; i + 1 < w.length; i++) if (["not", "dont", "never", "cant", "no", "nothing"].includes(w[i])) out.push("n:" + w[i + 1]);
  return out.map(f => { const h = hash(f); return [h % B, ((h >>> 20) & 1) ? 1 : -1]; });
}
const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const mk = (n, sd) => Float32Array.from({ length: n }, () => gauss() * sd);
const W = { E: mk(B * D, 0.1), C1: mk(NC * DC, 0.1), C2: mk(NC * DC, 0.1), W1: mk(IN * H1, Math.sqrt(1 / IN)), b1: new Float32Array(H1), W2: mk(H1 * H2, Math.sqrt(1 / H1)), b2: new Float32Array(H2), W3: mk(H2 * K, Math.sqrt(1 / H2)), b3: new Float32Array(K) };
const M = Object.fromEntries(Object.keys(W).map(k => [k, new Float32Array(W[k].length)])), V = Object.fromEntries(Object.keys(W).map(k => [k, new Float32Array(W[k].length)]));
const pi = p => (p === "" || p == null ? K : ACTS.indexOf(p));

function forward(w, f, p1, p2, drop) {
  const x = new Float32Array(D); let n = 0; const used = [];
  for (const [b, s] of f) { if (drop && R() < drop) continue; used.push([b, s]); n++; for (let d = 0; d < D; d++) x[d] += s * w.E[b * D + d]; }
  const sc = n ? 1 / Math.sqrt(n) : 0; for (let d = 0; d < D; d++) x[d] *= sc;
  const a = pi(p1), c = pi(p2); const inp = new Float32Array(IN); inp.set(x); for (let d = 0; d < DC; d++) { inp[D + d] = w.C1[a * DC + d]; inp[D + DC + d] = w.C2[c * DC + d]; }
  const h1 = new Float32Array(H1); for (let j = 0; j < H1; j++) { let z = w.b1[j]; for (let i = 0; i < IN; i++) z += inp[i] * w.W1[i * H1 + j]; h1[j] = Math.tanh(z); }
  const h2 = new Float32Array(H2); for (let j = 0; j < H2; j++) { let z = w.b2[j]; for (let i = 0; i < H1; i++) z += h1[i] * w.W2[i * H2 + j]; h2[j] = Math.tanh(z); }
  const z = new Float32Array(K); let mx = -1e9; for (let k = 0; k < K; k++) { let s = w.b3[k]; for (let j = 0; j < H2; j++) s += h2[j] * w.W3[j * K + k]; z[k] = s; if (s > mx) mx = s; }
  let sum = 0; const p = new Float32Array(K); for (let k = 0; k < K; k++) { p[k] = Math.exp(z[k] - mx); sum += p[k]; } for (let k = 0; k < K; k++) p[k] /= sum;
  return { inp, h1, h2, p, z, used, sc, a, c };
}

const { train, test } = build();
const enc = e => ({ f: feats(e.x), p1: e.prev, p2: e.prev2 ?? "", y: ACTS.indexOf(e.y), x: e.x });
const od = OOD.map(([x, prev, y]) => ({ f: feats(x), p1: prev, p2: "", y: ACTS.indexOf(y), x })); if (od.some(e => e.y < 0)) throw new Error("bad act in OOD");
const tr = train.map(enc), te = test.map(enc), hd = HAND.map(([x, prev, y]) => ({ f: feats(x), p1: prev, p2: "", y: ACTS.indexOf(y), x }));
if (hd.some(e => e.y < 0)) throw new Error("bad act in HAND");
console.log("train", tr.length, "test", te.length, "hand", hd.length);
const accOf = (w, set) => { let ok = 0; for (const e of set) { const p = forward(w, e.f, e.p1, e.p2, 0).p; let b = 0; for (let k = 1; k < K; k++) if (p[k] > p[b]) b = k; if (b === e.y) ok++; } return ok / set.length; };

let step = 0; const b1_ = 0.9, b2_ = 0.999;
function adamDense(name, g, lr, wd = 0) { const w = W[name], m = M[name], v = V[name]; const c1 = 1 - Math.pow(b1_, step), c2 = 1 - Math.pow(b2_, step); for (let i = 0; i < w.length; i++) { const gi = g[i] + wd * w[i]; m[i] = b1_ * m[i] + (1 - b1_) * gi; v[i] = b2_ * v[i] + (1 - b2_) * gi * gi; w[i] -= lr * (m[i] / c1) / (Math.sqrt(v[i] / c2) + 1e-8); } }
function adamRows(name, g, rows, width, lr, wd = 0) { const w = W[name], m = M[name], v = V[name]; const c1 = 1 - Math.pow(b1_, step), c2 = 1 - Math.pow(b2_, step); for (const r of rows) for (let d = 0; d < width; d++) { const i = r * width + d; const gi = g[i] + wd * w[i]; m[i] = b1_ * m[i] + (1 - b1_) * gi; v[i] = b2_ * v[i] + (1 - b2_) * gi * gi; w[i] -= lr * (m[i] / c1) / (Math.sqrt(v[i] / c2) + 1e-8); } }
const G = { E: new Float32Array(B * D), C1: new Float32Array(NC * DC), C2: new Float32Array(NC * DC), W1: new Float32Array(IN * H1), b1: new Float32Array(H1), W2: new Float32Array(H1 * H2), b2: new Float32Array(H2), W3: new Float32Array(H2 * K), b3: new Float32Array(K) };
const hist = []; const t0 = Date.now();
for (let ep = 0; ep < EPOCHS; ep++) {
  const idx = tr.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const lr = 0.008 * (ep < EPOCHS - 4 ? 1 : 0.35); let loss = 0;
  for (let s = 0; s < idx.length; s += BATCH) {
    step++; for (const k of ["W1", "b1", "W2", "b2", "W3", "b3", "C1", "C2"]) G[k].fill(0); const rowsE = new Set(), rowsC1 = new Set(), rowsC2 = new Set();
    const bs = idx.slice(s, s + BATCH); const inv = 1 / bs.length;
    for (const ii of bs) {
      const e = tr[ii]; const r = forward(W, e.f, e.p1, e.p2, 0.15); loss -= Math.log(r.p[e.y] * 0.95 + 0.05 / K + 1e-9);
      const dz = new Float32Array(K); for (let k = 0; k < K; k++) dz[k] = (r.p[k] - ((k === e.y ? 0.95 : 0) + 0.05 / K)) * inv;
      const dh2 = new Float32Array(H2); for (let j = 0; j < H2; j++) { let a = 0; for (let k = 0; k < K; k++) { G.W3[j * K + k] += r.h2[j] * dz[k]; a += W.W3[j * K + k] * dz[k]; } dh2[j] = a * (1 - r.h2[j] * r.h2[j]); }
      for (let k = 0; k < K; k++) G.b3[k] += dz[k];
      const dh1 = new Float32Array(H1); for (let i = 0; i < H1; i++) { let a = 0; const hi = r.h1[i]; for (let j = 0; j < H2; j++) { G.W2[i * H2 + j] += hi * dh2[j]; a += W.W2[i * H2 + j] * dh2[j]; } dh1[i] = a * (1 - hi * hi); }
      for (let j = 0; j < H2; j++) G.b2[j] += dh2[j];
      const din = new Float32Array(IN); for (let i = 0; i < IN; i++) { let a = 0; const xi = r.inp[i]; for (let j = 0; j < H1; j++) { G.W1[i * H1 + j] += xi * dh1[j]; a += W.W1[i * H1 + j] * dh1[j]; } din[i] = a; }
      for (let j = 0; j < H1; j++) G.b1[j] += dh1[j];
      for (let d = 0; d < DC; d++) { G.C1[r.a * DC + d] += din[D + d]; G.C2[r.c * DC + d] += din[D + DC + d]; } rowsC1.add(r.a); rowsC2.add(r.c);
      for (const [b, sg] of r.used) { rowsE.add(b); for (let d = 0; d < D; d++) G.E[b * D + d] += sg * r.sc * din[d]; }
    }
    for (const k of ["W1", "b1", "W2", "b2", "W3", "b3"]) adamDense(k, G[k], lr);
    adamRows("C1", G.C1, rowsC1, DC, lr); adamRows("C2", G.C2, rowsC2, DC, lr); adamRows("E", G.E, rowsE, D, lr, 2e-5);
    for (const b of rowsE) for (let d = 0; d < D; d++) G.E[b * D + d] = 0;
  }
  if (ep % 2 === 1 || ep === EPOCHS - 1) { const a = { ep: ep + 1, loss: +(loss / tr.length).toFixed(4), heldOutWording: +accOf(W, te).toFixed(3), handWritten: +accOf(W, hd).toFixed(3), minutes: +((Date.now() - t0) / 6e4).toFixed(1) }; hist.push(a); console.log(JSON.stringify(a)); }
}

// Buckets that no training message ever used still hold their random starting values. Zero them, so an unfamiliar phrase adds nothing instead of noise (this also makes the file much smaller).
const usedRows = new Set(); for (const e of [...tr, ...te, ...hd]) for (const [b] of e.f) usedRows.add(b);
for (let b = 0; b < B; b++) if (!usedRows.has(b)) for (let d = 0; d < D; d++) W.E[b * D + d] = 0;
console.log("embedding rows used:", usedRows.size, "of", B);
// int8 quantisation: each matrix keeps one scale; the shipped model is evaluated in its quantised form.
const quant = {}; const Wq = {};
for (const k of Object.keys(W)) { const w = W[k]; let mx = 0; for (const v of w) mx = Math.max(mx, Math.abs(v)); const s = mx / 127 || 1; const q = new Int8Array(w.length); for (let i = 0; i < w.length; i++) q[i] = Math.max(-127, Math.min(127, Math.round(w[i] / s))); quant[k] = { s: +s.toPrecision(6), b: Buffer.from(q.buffer).toString("base64") }; Wq[k] = Float32Array.from(q, v => v * s); }
const softT = (z, T) => { let mx = -1e9; for (const v of z) if (v > mx) mx = v; let sum = 0; const p = Array.from(z, v => { const e = Math.exp((v - mx) / T); sum += e; return e; }); return p.map(v => v / sum); };
let bestT = 1, bestNll = 1e9; for (let T = 0.8; T <= 4.01; T += 0.1) { let nll = 0; for (const e of te) { const z = forward(Wq, e.f, e.p1, e.p2, 0).z; nll -= Math.log(softT(z, T)[e.y] + 1e-9); } nll /= te.length; if (nll < bestNll) { bestNll = nll; bestT = +T.toFixed(1); } }
console.log("temperature", bestT);
const accQ = { held: +accOf(Wq, te).toFixed(3), hand: +accOf(Wq, hd).toFixed(3) }; console.log("quantised accuracy", JSON.stringify(accQ));
const conf = {}, perClass = Object.fromEntries(ACTS.map(a => [a, { n: 0, ok: 0 }])); const wrong = [];
const guess = (e) => { const p = softT(forward(Wq, e.f, e.p1, e.p2, 0).z, bestT); let b = 0; for (let k = 1; k < K; k++) if (p[k] > p[b]) b = k; return [b, p[b]]; };
for (const e of [...te, ...hd]) { const [b, pb] = guess(e); perClass[ACTS[e.y]].n++; if (b === e.y) perClass[ACTS[e.y]].ok++; else { const key = ACTS[e.y] + "->" + ACTS[b]; conf[key] = (conf[key] || 0) + 1; if (hd.includes(e)) wrong.push([e.x, e.p1, ACTS[e.y], ACTS[b], +pb.toFixed(2)]); } }
const cal = th => { let n = 0, ok = 0; const all = [...te, ...hd]; for (const e of all) { const [b, pb] = guess(e); if (pb >= th) { n++; if (b === e.y) ok++; } } return { threshold: th, answered: +(n / all.length).toFixed(3), accuracyWhenAnswering: +(ok / Math.max(1, n)).toFixed(3) }; };
const oodRows = od.map(e => { const [b, pb] = guess(e); return [e.x, ACTS[e.y], ACTS[b], +pb.toFixed(2), b === e.y]; });
const oodAcc = +(oodRows.filter(r => r[4]).length / oodRows.length).toFixed(3); const oodConfidentWrong = oodRows.filter(r => !r[4] && r[3] >= 0.6).length; console.log("OOD challenge accuracy", oodAcc, "confident-wrong", oodConfidentWrong);
const model = { v: 3, T: bestT, usedRows: usedRows.size, labels: ACTS, B, D, DC, H1, H2, K, NC, params: P, threshold: 0.45, q: quant };
const OUT = process.env.OUT ? new URL(process.env.OUT, import.meta.url) : new URL("../../src/engine/talkModel.json", import.meta.url); fs.mkdirSync(new URL(".", OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(model));
fs.writeFileSync(process.env.REPORT ? new URL(process.env.REPORT, import.meta.url) : new URL("./report.json", import.meta.url), JSON.stringify({ parameters: P, temperature: bestT, oodAccuracy: oodAcc, oodConfidentWrong, oodMisses: oodRows.filter(r => !r[4]), trainExamples: tr.length, heldOutWordingExamples: te.length, handWrittenExamples: hd.length, history: hist, quantisedAccuracy: accQ, weakestActs: Object.entries(perClass).map(([a, v]) => [a, +(v.ok / Math.max(1, v.n)).toFixed(2)]).sort((x, y) => x[1] - y[1]).slice(0, 8), topConfusions: Object.entries(conf).sort((a, b) => b[1] - a[1]).slice(0, 10), calibration: [0.4, 0.5, 0.6, 0.7].map(cal), handWrittenMisses: wrong.slice(0, 30) }, null, 2));
console.log("done", JSON.stringify(accQ), "model bytes", fs.statSync(OUT).size);
