// Trains the Lagomo language model from scratch on tools/gpt/out/corpus.jsonl using all CPU cores (worker threads).
// Usage: node tools/gpt/train.mjs   env: STEPS, BATCH, L, C, H, LR, TMAX_MIN
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import fs from "fs"; import os from "os";
import { layout, initParams, lossAndGrad, countParams } from "./gpt.mjs";
import { VOCAB, ID, encPrompt, encReply } from "./vocab.mjs";
const T = 256;
const cfg = { V: VOCAB.length, T, C: +(process.env.C ?? 96), L: +(process.env.L ?? 4), H: +(process.env.H ?? 4) };
if (!isMainThread) {
  const { P, G, id, seqs } = workerData; const g = new Float32Array(G);
  parentPort.on("message", ({ batch }) => { g.fill(0); let loss = 0, cnt = 0; for (const i of batch) { const s = seqs[i]; const r = lossAndGrad(cfg, P_, g, s.ids, s.mask); loss += r.loss; cnt += r.cnt; } parentPort.postMessage({ loss, cnt }); });
  var P_ = new Float32Array(P);
} else {
  const rows = fs.readFileSync(new URL("./out/corpus.jsonl", import.meta.url), "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
  const mk = r => { const p = encPrompt(r.act, r.user), q = encReply(r.reply); const ids = [...p, ...q]; if (ids.length > T + 1) return null; const mask = ids.slice(0, -1).map((_, t) => (t >= p.length - 1 ? 1 : 0)); return { ids, mask }; };
  const tr = rows.filter(r => r.split === "train").map(mk).filter(Boolean), va = rows.filter(r => r.split === "val").map(mk).filter(Boolean);
  const tokens = tr.reduce((a, s) => a + s.ids.length, 0);
  console.log("train", tr.length, "val", va.length, "tokens", tokens, "params", countParams(cfg), cfg);
  let seed = 99; const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const NP = countParams(cfg); const Psab = new SharedArrayBuffer(NP * 4); const P = new Float32Array(Psab); P.set(initParams(cfg, rand));
  const W = Math.min(8, os.cpus().length); const BATCH = +(process.env.BATCH ?? 24); const STEPS = +(process.env.STEPS ?? 1500); const LR = +(process.env.LR ?? 3e-3); const TMAX = +(process.env.TMAX_MIN ?? 40) * 60e3;
  const workers = [], gs = [];
  // each worker keeps its own parameter copy; main broadcasts new values each step through a SharedArrayBuffer view
  for (let w = 0; w < W; w++) { const G = new SharedArrayBuffer(NP * 4); gs.push(new Float32Array(G)); }
  const mkWorker = w => new Worker(new URL(import.meta.url), { workerData: { P: Psab, G: gs[w].buffer, id: w, seqs: [...tr, ...va] } });
  for (let w = 0; w < W; w++) workers.push(mkWorker(w));
  const m = new Float32Array(NP), v = new Float32Array(NP), o = layout(cfg);
  const decay = new Uint8Array(NP); for (const k of Object.keys(o)) if (/^(qkv|proj|fc|fp)_/.test(k) || k === "wte") { const next = Object.values(o).filter(x => x > o[k]).sort((a, b) => a - b)[0] ?? o.total; decay.fill(1, o[k], Math.min(next, o.total)); }
  const run = (w, batch) => new Promise(res => { workers[w].once("message", res); workers[w].postMessage({ batch }); });
  const t0 = Date.now(); let ema = 0; const hist = [];
  const evalVal = async () => { let l = 0, c = 0; const take = va.slice(0, 96); const per = Math.ceil(take.length / W); const idx = take.map((_, i) => tr.length + i); const rs = await Promise.all(Array.from({ length: W }, (_, w) => run(w, idx.slice(w * per, (w + 1) * per).map(i => i)).then(r => (l += r.loss, c += r.cnt)))); void rs; return l / c; };
  (async () => {
    for (let step = 1; step <= STEPS; step++) {
      const lr = LR * Math.min(1, step / 60) * (0.1 + 0.9 * 0.5 * (1 + Math.cos(Math.PI * Math.min(1, Math.max(step / STEPS, (Date.now() - t0) / TMAX)))));
      const per = Math.ceil(BATCH / W); const pick = () => Math.floor(rand() * tr.length);
      const rs = await Promise.all(Array.from({ length: W }, (_, w) => run(w, Array.from({ length: per }, pick))));
      let loss = 0, cnt = 0; const g = new Float32Array(NP); for (let w = 0; w < W; w++) { for (let i = 0; i < NP; i++) g[i] += gs[w][i]; loss += rs[w].loss; cnt += rs[w].cnt; }
      let gn = 0; for (let i = 0; i < NP; i++) { g[i] /= cnt; gn += g[i] * g[i]; } gn = Math.sqrt(gn); const clip = gn > 1 ? 1 / gn : 1;
      const b1 = 0.9, b2 = 0.95, bc1 = 1 - Math.pow(b1, step), bc2 = 1 - Math.pow(b2, step);
      for (let i = 0; i < NP; i++) { const gi = g[i] * clip; m[i] = b1 * m[i] + (1 - b1) * gi; v[i] = b2 * v[i] + (1 - b2) * gi * gi; P[i] -= lr * ((m[i] / bc1) / (Math.sqrt(v[i] / bc2) + 1e-8) + (decay[i] ? 0.05 * P[i] : 0)); }
      // workers read the shared parameter buffer directly
      const l = loss / cnt; ema = step === 1 ? l : 0.95 * ema + 0.05 * l;
      if (step % 25 === 0 || step === 1) { console.log(`step ${step} loss ${l.toFixed(3)} ema ${ema.toFixed(3)} lr ${lr.toExponential(1)} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
      if (step % 100 === 0) { const vl = await evalVal(); hist.push([step, +ema.toFixed(3), +vl.toFixed(3)]); console.log("  val loss", vl.toFixed(3), "ppl", Math.exp(vl).toFixed(2)); fs.writeFileSync(new URL("./out/ckpt.json", import.meta.url), JSON.stringify({ cfg, step, params: Array.from(P) })); }
      if (Date.now() - t0 > TMAX) { console.log("time budget reached at step", step); break; }
    }
    const vl = await evalVal(); hist.push(["final", 0, +vl.toFixed(3)]);
    fs.writeFileSync(new URL("./out/ckpt.json", import.meta.url), JSON.stringify({ cfg, step: -1, params: Array.from(P), valLoss: vl, hist }));
    console.log("done val loss", vl.toFixed(3), "ppl", Math.exp(vl).toFixed(2)); process.exit(0);
  })();
}
