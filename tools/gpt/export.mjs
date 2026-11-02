// Packs out/ckpt.json into the browser file. Usage: node tools/gpt/export.mjs [--f32]   ->  public/talk/lagomo-gpt-v1.bin  (or out/parity.bin with --f32)
import fs from "fs";
import { layout, countParams } from "./gpt.mjs";
import { VOCAB, GEN_ACTS } from "./vocab.mjs";
const f32 = process.argv.includes("--f32");
const ck = JSON.parse(fs.readFileSync(new URL("./out/ckpt.json", import.meta.url), "utf8")); const { cfg } = ck; const P = Float32Array.from(ck.params);
const o = layout(cfg); const { V, T, C, L } = cfg;
const spec = [["wte", V, C, 1], ["wpe", T, C, 1]];
for (let l = 0; l < L; l++) spec.push([`g1_${l}`, 1, C, 0], [`qkv_${l}`, C, 3 * C, 1], [`proj_${l}`, C, C, 1], [`g2_${l}`, 1, C, 0], [`fc_${l}`, C, 4 * C, 1], [`fp_${l}`, 4 * C, C, 1]);
spec.push(["gf", 1, C, 0]);
const rows = fs.readFileSync(new URL("./out/corpus.jsonl", import.meta.url), "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)).filter(r => r.split === "train");
const bank = new Set(), words = new Set(), byAct = {}; for (const r of rows) { for (const x of r.reply.split(/(?<=[.?!])\s+/)) (byAct[r.act] ??= new Set()).add(x); for (const s of r.reply.split(/(?<=[.?!])\s+/)) bank.add(s); for (const w of r.reply.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/)) if (w) words.add(w); }
const header = { v: 1, name: "lagomo-gpt-v1", cfg, vocab: VOCAB, acts: GEN_ACTS, params: countParams(cfg), bank: [...bank], byAct: Object.fromEntries(Object.entries(byAct).map(([a, v]) => [a, [...v].map(x => [...bank].indexOf(x))])), words: [...words].sort(), order: spec.map(([k, r, c, q]) => ({ k, off: o[k], rows: r, cols: c, q: !f32 && !!q })) };
const hb = Buffer.from(JSON.stringify(header)); const parts = [Buffer.alloc(4), hb]; parts[0].writeUInt32LE(hb.length); let len = 4 + hb.length; const pad = b => { const p = ((len + 3) & ~3) - len; if (p) { parts.push(Buffer.alloc(p)); len += p; } void b; };
pad();
let maxErr = 0;
for (const [k, r, c, q] of spec) {
  const w = P.subarray(o[k], o[k] + r * c);
  if (f32 || !q) { const b = Buffer.from(new Float32Array(w).buffer); parts.push(b); len += b.length; pad(); continue; }
  const qd = new Int8Array(r * c), sc = new Float32Array(r);
  for (let i = 0; i < r; i++) { let mx = 0; for (let j = 0; j < c; j++) mx = Math.max(mx, Math.abs(w[i * c + j])); const s = mx / 127 || 1; sc[i] = s; for (let j = 0; j < c; j++) { qd[i * c + j] = Math.round(w[i * c + j] / s); maxErr = Math.max(maxErr, Math.abs(qd[i * c + j] * s - w[i * c + j]) / (mx || 1)); } }
  parts.push(Buffer.from(qd.buffer)); len += qd.length; pad(); parts.push(Buffer.from(sc.buffer)); len += sc.length * 4; pad();
}
const out = Buffer.concat(parts); const dest = f32 ? new URL("./out/parity.bin", import.meta.url) : new URL("../../public/talk/lagomo-gpt-v1.bin", import.meta.url);
fs.writeFileSync(dest, out); console.log("wrote", dest.pathname, out.length, "bytes", "params", header.params, "bank", bank.size, "words", words.size, f32 ? "" : "max row-relative quant error " + maxErr.toFixed(4));
