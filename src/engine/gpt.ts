// Lagomo's own language model: a small GPT (nanoGPT design) trained from scratch in tools/gpt. It runs on this device, with no outside AI.
// It only writes text. It is conditioned on the conversation act chosen by the classifier and on what the person said, and every
// candidate reply must pass `checkReply` before anyone sees it. If the model is missing, slow or fails a check, the written replies are used.
// File format (tools/gpt/export.mjs): [u32 header length][header JSON][pad to 4][int8 weights and float32 row scales per tensor].

interface Header { v: number; cfg: { V: number; T: number; C: number; L: number; H: number }; vocab: string[]; order: { k: string; off: number; rows: number; cols: number; q: boolean }[]; params: number; bank: string[]; frames?: Record<string, string[]>; prevs?: string[]; byAct?: Record<string, number[]>; words: string[]; acts: string[]; name: string }
export interface GptModel { h: Header; P: Float32Array; o: Record<string, number>; ids: Record<string, number> }

let model: Promise<GptModel | null> | null = null;
export const GPT_URL = "/talk/lagomo-gpt-v2.bin";

export function parseGpt(buf: ArrayBuffer): GptModel {
  const dv = new DataView(buf); const hl = dv.getUint32(0, true); const h = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl))) as Header;
  const total = h.order.reduce((a, t) => a + t.rows * t.cols, 0); const P = new Float32Array(total); const o: Record<string, number> = {};
  let off = (4 + hl + 3) & ~3; let dst = 0;
  for (const t of h.order) {
    o[t.k] = dst; const n = t.rows * t.cols;
    if (t.q) { const q = new Int8Array(buf, off, n); off += n; off = (off + 3) & ~3; const sc = new Float32Array(buf.slice(off, off + t.rows * 4)); off += t.rows * 4; for (let r = 0; r < t.rows; r++) for (let c = 0; c < t.cols; c++) P[dst + r * t.cols + c] = q[r * t.cols + c] * sc[r]; }
    else { P.set(new Float32Array(buf.slice(off, off + n * 4)), dst); off += n * 4; }
    dst += n;
  }
  const ids: Record<string, number> = {}; h.vocab.forEach((t, i) => { ids[t] = i; });
  return { h, P, o, ids };
}
/** Fetch the model in the background (small, about 0.5 MB). Returns null if it can't be loaded; callers then use the written replies. */
export function loadGpt(): Promise<GptModel | null> {
  return (model ??= (async () => {
    try {
      const c = (navigator as unknown as { connection?: { saveData?: boolean } }).connection; if (c?.saveData) return null;
      const r = await fetch(GPT_URL); if (!r.ok) return null; return parseGpt(await r.arrayBuffer());
    } catch { return null; }
  })().then(m => { if (!m) model = null; return m; }));
}
export const gptReady = () => model !== null;

const K0 = Math.sqrt(2 / Math.PI);
const gelu = (x: number) => 0.5 * x * (1 + Math.tanh(K0 * (x + 0.044715 * x * x * x)));

/** One-token-at-a-time forward pass with a key/value cache. */
export class Runner {
  private kc: Float32Array[]; private vc: Float32Array[]; pos = 0; private C: number; private H: number; private L: number; private V: number;
  constructor(private m: GptModel) { const { C, L, H, T, V } = m.h.cfg; this.C = C; this.H = H; this.L = L; this.V = V; this.kc = Array.from({ length: L }, () => new Float32Array(T * C)); this.vc = Array.from({ length: L }, () => new Float32Array(T * C)); }
  private ln(x: Float32Array, g: Float32Array | number, goff: number) {
    const C = this.C; let mu = 0; for (let j = 0; j < C; j++) mu += x[j]; mu /= C; let v = 0; for (let j = 0; j < C; j++) { const d = x[j] - mu; v += d * d; }
    const r = 1 / Math.sqrt(v / C + 1e-5); const y = new Float32Array(C); const P = this.m.P; for (let j = 0; j < C; j++) y[j] = (x[j] - mu) * r * P[goff + j]; void g; return y;
  }
  private vm(a: Float32Array, off: number, n: number, mcols: number) { const P = this.m.P; const out = new Float32Array(mcols); for (let p = 0; p < n; p++) { const av = a[p]; const b = off + p * mcols; for (let j = 0; j < mcols; j++) out[j] += av * P[b + j]; } return out; }
  /** Feed one token; returns logits for the next token. */
  step(id: number): Float32Array {
    const { C, H, L, V, m } = this; const P = m.P, o = m.o; const T = m.h.cfg.T; if (this.pos >= T) throw new Error("context full");
    const t = this.pos; const hs = C / H; const sc = 1 / Math.sqrt(hs);
    let x = new Float32Array(C); for (let j = 0; j < C; j++) x[j] = P[o.wte + id * C + j] + P[o.wpe + t * C + j];
    for (let l = 0; l < L; l++) {
      const a = this.ln(x, 0, o[`g1_${l}`]); const qkv = this.vm(a, o[`qkv_${l}`], C, 3 * C);
      this.kc[l].set(qkv.subarray(C, 2 * C), t * C); this.vc[l].set(qkv.subarray(2 * C, 3 * C), t * C);
      const y = new Float32Array(C);
      for (let h = 0; h < H; h++) {
        const sco = new Float32Array(t + 1); let mx = -1e30;
        for (let s = 0; s <= t; s++) { let d = 0; for (let j = 0; j < hs; j++) d += qkv[h * hs + j] * this.kc[l][s * C + h * hs + j]; d *= sc; sco[s] = d; if (d > mx) mx = d; }
        let z = 0; for (let s = 0; s <= t; s++) { sco[s] = Math.exp(sco[s] - mx); z += sco[s]; }
        for (let s = 0; s <= t; s++) { const w = sco[s] / z; for (let j = 0; j < hs; j++) y[h * hs + j] += w * this.vc[l][s * C + h * hs + j]; }
      }
      const pr = this.vm(y, o[`proj_${l}`], C, C); for (let j = 0; j < C; j++) x[j] += pr[j];
      const a2 = this.ln(x, 0, o[`g2_${l}`]); const f = this.vm(a2, o[`fc_${l}`], C, 4 * C); for (let j = 0; j < f.length; j++) f[j] = gelu(f[j]);
      const mo = this.vm(f, o[`fp_${l}`], 4 * C, C); for (let j = 0; j < C; j++) x[j] += mo[j];
    }
    const z = this.ln(x, 0, o.gf); const lg = new Float32Array(V); for (let v = 0; v < V; v++) { let d = 0; const b = o.wte + v * C; for (let j = 0; j < C; j++) d += z[j] * P[b + j]; lg[v] = d; }
    this.pos++; return lg;
  }
}

/** Person swap for the mirror sentences ("my sister lied to me" -> "your sister lied to you"). Must match youForm() in tools/gpt/vocab.mjs. */
export const youForm = (s: string) => s.toLowerCase().replace(/\u2019/g, "'").replace(/[^a-z0-9 ']/g, " ").replace(/\s+/g, " ").trim()
  .replace(/\bi'm\b/g, "you're").replace(/\bi've\b/g, "you've").replace(/\bi'll\b/g, "you'll").replace(/\bi'd\b/g, "you'd").replace(/\bi am\b/g, "you are").replace(/\bi was\b/g, "you were")
  .replace(/\bmyself\b/g, "yourself").replace(/\bmine\b/g, "yours").replace(/\bmy\b/g, "your").replace(/\bme\b/g, "you").replace(/\bi\b/g, "you");
const norm = (s: string) => s.toLowerCase().replace(/\u2019/g, "'").replace(/[^a-z0-9 .,'?!:;-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
export interface GenOpts { prev?: string; maxNew?: number; temperature?: number; topK?: number; rand?: () => number; deadline?: number }
/** Write one reply for (act, text). Throws if the model can't be run. */
export function generate(m: GptModel, act: string, text: string, opt: GenOpts = {}): string {
  const aid = m.ids["<act:" + act + ">"]; if (aid === undefined) throw new Error("act not covered");
  const r = new Runner(m); const rand = opt.rand ?? Math.random; const temp = opt.temperature ?? 0.7, topK = opt.topK ?? 20, maxNew = opt.maxNew ?? 150;
  const pv = m.ids["<prev:" + (opt.prev && m.ids["<prev:" + opt.prev + ">"] !== undefined ? opt.prev : opt.prev ? "other" : "none") + ">"] ?? m.ids["<prev:none>"];
  const prompt = [m.ids["<bos>"], pv, aid, ...norm(text).split("").map(c => m.ids[c] ?? m.ids[" "]), m.ids["<sep>"]];
  let lg = new Float32Array(0); for (const id of prompt) lg = r.step(id);
  const out: number[] = []; const end = m.ids["<end>"]; const dead = opt.deadline ?? Date.now() + 2500;
  for (let i = 0; i < maxNew; i++) {
    const idx = Array.from(lg, (v, k) => k).filter(k => k > 3 || k === end).sort((a, b) => lg[b] - lg[a]).slice(0, topK); // ids 0-3 are pad/bos/sep/end; only <end> may be produced
    const mx = lg[idx[0]]; const w = idx.map(k => Math.exp((lg[k] - mx) / temp)); const z = w.reduce((a, b) => a + b, 0); let u = rand() * z, pick = idx[0];
    for (let k = 0; k < idx.length; k++) { u -= w[k]; if (u <= 0) { pick = idx[k]; break; } }
    if (pick === end) break; out.push(pick); if (r.pos >= m.h.cfg.T || Date.now() > dead) break; lg = r.step(pick);
  }
  return out.map(i => m.h.vocab[i]).join("").replace(/\s+/g, " ").trim();
}

const BANNED = /\b(kill|suicid\w*|self[- ]?harm|die|dead|hurt yourself|diagnos\w*|medicat\w*|therap\w*|doctor|pills?|drugs?|alcohol|sex\w*|porn\w*|nazi|racist|http|www|\.com|password|i am (a )?human|i'm (a )?human|my (mum|mom|dad|wife|husband|kids?)|i love you)\b/i;
/** Every candidate goes through here. Returns the cleaned reply, or null to fall back to the written one. */
const FILLER = ["honestly", "so", "ugh", "like", "today", "and", "well", "ok", "okay", "um", "hmm", "ngl", "idk", "but", "hey", "yeah", "anyway", "basically", "actually", "just", "uh", "oh", "pip", "lagomo", "lago", "also", "then", "because", "that", "just so you know"];
const TRAIL = ["lol", "tbh", "ugh", "honestly", "though", "again", "haha"];
/** The part of what the person said that can be echoed back: filler trimmed, 3 to 14 words, not a question, not about the rabbit. */
export function clauseOf(user: string): string | null {
  if (/[?]/.test(user)) return null;
  const orig = user.toLowerCase().replace(/\u2019/g, "'").replace(/[^a-z0-9 ']/g, " ").split(/\s+/).filter(Boolean);
  if (orig.some(x => x === "you" || x === "your" || x === "yours" || x === "u" || x === "ur" || x === "youre" || x === "you're")) return null; // addressed to the rabbit: don't echo
  let w = youForm(user).split(" ").filter(Boolean);
  for (let go = true; go;) { go = false; for (const f of FILLER.slice().sort((a, b) => b.length - a.length)) { const fw = f.split(" "); if (w.slice(0, fw.length).join(" ") === f && w.length > fw.length) { w = w.slice(fw.length); go = true; } } }
  while (w.length > 3 && TRAIL.includes(w[w.length - 1])) w.pop();
  if (w.length < 3 || w.length > 14) return null;
  return w.join(" ");
}
/** Replace the model's ":::" placeholder with the person's own words, or return null if there is nothing safe to echo. */
function fillMirror(raw: string, user?: string): string | null {
  const s = raw.trim(); if (!s.includes(":::")) return s;
  const cl = user !== undefined ? clauseOf(user) : null; if (!cl || (s.match(/:::/g) ?? []).length !== 1) return null;
  return s.replace(":::", cl);
}
// Sentences that mention a topic must be grounded in what the person actually said (no "work" line when they talked about grandma).
const TOPIC: [RegExp, RegExp][] = [
  [/\bwork\b/i, /\b(boss|manager|work|job|meeting|coworker|colleague|office|client|shift)\b/],
  [/\bschool\b/i, /\b(school|class|teacher|exam|homework|professor|college|lecture|classmate|grades)\b/],
  [/\b(family|at home)\b/i, /\b(mum|mom|dad|brother|sister|family|parents|grandma|cousin)\b/],
  [/\b(friend stuff|people you care about)\b/i, /\b(friend|friends|roommate|partner|girlfriend|boyfriend|bestie|group chat)\b/],
  [/\bmoney\b/i, /\b(money|rent|bills|salary|broke|debt)\b/],
];
export function checkReply(m: GptModel, raw: string, ctx: { last?: string; act: string; maxChars?: number; user?: string }): string | null {
  const s = fillMirror(raw, ctx.user); if (s === null) return null;
  if (s.length < 12 || s.length > (ctx.maxChars ?? 230)) return null;
  if (!/[.?!]$/.test(s)) return null;
  if (BANNED.test(s) || /\d/.test(s)) return null;
  const sents = s.split(/(?<=[.?!])\s+/).filter(Boolean); if (sents.length > 4) return null;
  if (new Set(sents.map(x => x.toLowerCase())).size !== sents.length) return null;
  if (ctx.last && s.toLowerCase() === ctx.last.toLowerCase()) return null;
  const bank = new Set(m.h.bank); const allowed = m.h.byAct?.[ctx.act] ? new Set(m.h.byAct[ctx.act].map(i => m.h.bank[i])) : null;
  for (const x of sents) {
    if (bank.has(x)) { if (allowed && !allowed.has(x)) return null; continue; }
    // a mirror sentence: an allowed opening + the person's own words (already filled in by fillMirror) and nothing else
    const fr = (m.h.frames?.[ctx.act] ?? []).find(f => x.startsWith(f)); const cl = ctx.user !== undefined ? clauseOf(ctx.user) : null;
    if (!fr || !cl || x !== fr + cl + ".") return null;
  }
  if (ctx.user !== undefined) { const u = ctx.user.toLowerCase(); const sNoPraise = s.replace(/\b(nice|good|great) work\b/gi, ""); for (const [say, need] of TOPIC) if (say.test(sNoPraise) && !need.test(u)) return null; }
  return s;
}
