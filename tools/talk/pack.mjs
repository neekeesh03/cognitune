// Packs the trained large model (out/big.json, base64 int8) into one compact binary for the browser:
//   [u32 header length][header JSON][pad to 4][u32 row index][int8 embedding rows that are in use][int8 dense layers...]
// Embedding rows that no training message used are zero and are simply left out, so the file is much smaller than the table.
// Usage: node tools/talk/pack.mjs   ->  public/talk/lagomo-talk-10m-v1.bin
import fs from "fs";
const m = JSON.parse(fs.readFileSync(new URL("./out/big.json", import.meta.url), "utf8"));
const i8 = q => { const b = Buffer.from(q.b, "base64"); const o = new Int8Array(b.length); for (let i = 0; i < b.length; i++) o[i] = (b[i] << 24) >> 24; return o; }; // copy out of the shared buffer pool
const E = i8(m.q.E); const rows = []; for (let r = 0; r < m.B; r++) { let nz = false; for (let d = 0; d < m.D && !nz; d++) if (E[r * m.D + d] !== 0) nz = true; if (nz) rows.push(r); }
const order = ["C1", "C2", "W1", "b1", "W2", "b2", "W3", "b3"]; const mats = Object.fromEntries(order.map(k => [k, i8(m.q[k])]));
const header = { v: 1, labels: m.labels, B: m.B, D: m.D, DC: m.DC, H1: m.H1, H2: m.H2, K: m.K, NC: m.NC, T: m.T, threshold: m.threshold, params: m.params, rows: rows.length, scales: Object.fromEntries(["E", ...order].map(k => [k, m.q[k].s])), sizes: Object.fromEntries(order.map(k => [k, mats[k].length])) };
const hb = Buffer.from(JSON.stringify(header)); let off = 4 + hb.length; const pad = ((off + 3) & ~3) - off;
const total = ((4 + hb.length + pad) + rows.length * 4 + rows.length * m.D + order.reduce((a, k) => a + mats[k].length, 0));
const out = Buffer.alloc(total); out.writeUInt32LE(hb.length, 0); hb.copy(out, 4); off = 4 + hb.length + pad;
for (const r of rows) { out.writeUInt32LE(r, off); off += 4; }
for (const r of rows) { Buffer.from(E.buffer, E.byteOffset + r * m.D, m.D).copy(out, off); off += m.D; }
for (const k of order) { Buffer.from(mats[k].buffer, mats[k].byteOffset, mats[k].length).copy(out, off); off += mats[k].length; }
fs.mkdirSync(new URL("../../public/talk/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../../public/talk/lagomo-talk-10m-v1.bin", import.meta.url), out);
console.log("rows in use", rows.length, "of", m.B, "file bytes", out.length, "params", m.params);
