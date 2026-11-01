// Understands a few words about what is hard. A small softmax model trained on about 6,000 written practice dialogues
// (1,000 + 5,200), using words, two-word phrases, "not X" and the part after "but honestly". It runs on this device.
// It is a starting point, not a mind reader: below 60% sure, it shows its top two guesses and lets you choose.
import replies from "@/engine/coachReplies.json";
import { analyze } from "@/engine/text";
import type { Friction } from "@/engine/coach";

export type Intent = Friction | "feeling" | "ready" | "other";
interface M { labels: string[]; drop: string[]; char: boolean; T: number; B: number[]; w: Record<string, number[]>; thresholds: { confident: number } }
let cache: Promise<M> | null = null;
const load = () => (cache ??= import("@/engine/coachModel.json").then(x => (x.default ?? x) as unknown as M));
const SAFETY = /\b(kill myself|killing myself|suicid\w*|end it all|(?:want|wanna|wish|going) to die(?! of| from| laughing| inside)|hurt myself|hurting myself|harm myself|better off dead|not be alive|dont want to be alive|dont want to live(?: anymore| any more|\s*$|[.!,])|wish i were dead|disappear forever|end my life|better off without me|better off if i (?:was|were) gone|no reason to (?:keep )?(?:live|living)|not worth living|isnt worth living|wish i (?:would not|wouldnt|did not|didnt) wake up)\b/;
const tok = (s: string) => s.toLowerCase().replace(/'/g, "").replace(/[^\p{L}\p{N} ]+/gu, " ").split(/\s+/).filter(Boolean);
function primary(text: string): string | null { const t = text.toLowerCase().replace(/[\u2019']/g, ""); let m = t.match(/(?:but honestly|though mostly|but really|but actually)\s+(.*)$/); if (m) return m[1]; m = t.match(/^(.*?),?\s*plus a bit of\b/); if (m) return m[1]; m = t.match(/\b(?:im|i am) not [^,]+,\s*(.*)$/); if (m) return m[1]; return null; }
function feats(text: string, m: M): string[] {
  const drop = new Set(m.drop); const w = tok(text).filter(x => !drop.has(x)); const f = new Set<string>();
  const pr = primary(text); if (pr) { const pw = tok(pr).filter(x => !drop.has(x)); for (const x of pw) f.add("p:" + x); for (let i = 0; i < pw.length - 1; i++) f.add("pb:" + pw[i] + "_" + pw[i + 1]); }
  const all = tok(text); for (let i = 0; i < all.length - 1; i++) if (all[i] === "not" || all[i] === "dont" || all[i] === "never") { f.add("n:" + all[i + 1]); if (all[i + 2]) f.add("n:" + all[i + 2]); }
  for (const x of w) f.add("w:" + x); for (let i = 0; i < w.length - 1; i++) f.add("b:" + w[i] + "_" + w[i + 1]);
  if (m.char) for (const x of w) { const p = "^" + x + "$"; for (let n = 3; n <= 5; n++) for (let i = 0; i + n <= p.length; i++) f.add("c:" + p.slice(i, i + n)); }
  return [...f];
}
export interface Reading { safety: boolean; top: { intent: Intent; p: number }[]; confident: boolean }
export async function read(text: string): Promise<Reading> {
  const clean = text.toLowerCase().replace(/[\u2019']/g, "");
  if (SAFETY.test(clean) || analyze(text).crisis) return { safety: true, top: [], confident: false };
  const m = await load(); const f = feats(text, m); const K = m.labels.length; const z = m.B.slice(); let n = 0; const val = 1 / Math.sqrt(Math.max(1, f.length));
  for (const x of f) { const v = m.w[x]; if (v) { n++; for (let k = 0; k < K; k++) z[k] += v[k] * val; } }
  if (n === 0) return { safety: false, top: [{ intent: "other", p: 1 }], confident: false };
  const zz = z.map(v => v / m.T); const mx = Math.max(...zz); const e = zz.map(v => Math.exp(v - mx)); const sum = e.reduce((a, b) => a + b, 0);
  const top = e.map((v, i) => ({ intent: m.labels[i] as Intent, p: v / sum })).sort((a, b) => b.p - a.p).slice(0, 2);
  return { safety: false, top, confident: top[0].p >= m.thresholds.confident && top[0].intent !== "other" };
}
const R = replies as Record<string, string[]>;
/** A warm opening line for this kind of difficulty, from the practice dialogues. */
export const openingLine = (i: Intent) => { const a = R[i] ?? []; return a.length ? a[Math.floor(Math.random() * a.length)] : ""; };
export const SAFETY_TEXT = "I am really sorry you are feeling this way. I cannot help with this, but you deserve support from a person right now. If you are in danger, please contact local emergency services or someone you trust. findahelpline.com lists free lines by country.";
