// Understands a few words about what is hard. A small naive-Bayes model trained on 1000 written practice dialogues,
// running on this device. It is a starting point, not a mind reader: it always shows its top two guesses.
import model from "@/engine/coachModel.json";
import { analyze } from "@/engine/text";
import type { Friction } from "@/engine/coach";

export type Intent = Friction | "feeling" | "ready";
interface M { drop: string[]; labels: string[]; prior: number[]; unk: number[]; k: number; words: Record<string, number[]>; replies: Record<string, string[]> }
const M = model as unknown as M; const DROP = new Set(M.drop);
const tok = (s: string) => s.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
function feats(s: string) { const w = tok(s).filter(x => !DROP.has(x)); const f = new Set(w); for (let i = 0; i < w.length - 1; i++) f.add(w[i] + "_" + w[i + 1]); return [...f]; }
const SAFETY = /\b(kill myself|suicid|end it all|want to die|wanna die|hurt myself|harm myself|better off dead|not be alive|dont want to be alive|wish i were dead|disappear forever)\b/;
export interface Reading { safety: boolean; top: { intent: Intent; p: number }[]; confident: boolean }
export function read(text: string): Reading {
  const clean = text.toLowerCase().replace(/'/g, "");
  if (SAFETY.test(clean) || analyze(text).crisis) return { safety: true, top: [], confident: false };
  const f = feats(text); const s = M.prior.slice(); let n = 0;
  for (const w of f) { const v = M.words[w]; if (v) { n++; for (let i = 0; i < s.length; i++) s[i] += v[i]; } }
  if (n === 0) return { safety: false, top: [], confident: false };
  const z = s.map(x => x / Math.max(1, n) * M.k); const mx = Math.max(...z); const e = z.map(x => Math.exp(x - mx)); const sum = e.reduce((a, b) => a + b, 0);
  const top = e.map((v, i) => ({ intent: M.labels[i] as Intent, p: v / sum })).sort((a, b) => b.p - a.p).slice(0, 2);
  return { safety: false, top, confident: top[0].p >= 0.6 };
}
/** A warm opening line for this kind of difficulty, from the practice dialogues. */
export const openingLine = (i: Intent) => { const a = M.replies[i] ?? []; return a.length ? a[Math.floor(Math.random() * a.length)] : ""; };
export const SAFETY_TEXT = "I am really sorry you are feeling this way. I cannot help with this, but you deserve support from a person right now. If you are in danger, please contact local emergency services or someone you trust. findahelpline.com lists free lines by country.";
