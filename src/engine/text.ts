// Local, transparent text analysis. Lexicon-based, so it is a rough signal, not mind reading.
import { VAR_KEYS, VarKey } from "./model";

export interface TextSignals {
  levels: Partial<Record<VarKey, number>>; // estimated 0..1 level of each variable implied by the text
  hits: Partial<Record<VarKey, { hi: number; lo: number }>>;
  sentiment: number; // -1..1
  openLoops: string[];
  wins: string[];
  words: number;
  crisis: boolean;
}

const L: Record<VarKey, { hi: RegExp[]; lo: RegExp[] }> = {
  Primode: {
    hi: [/\bstarted\b/, /\bbegan\b/, /\bdove in\b/, /\bgot going\b/, /\bjumped in\b/, /\bfirst step\b/, /\bready to\b/, /\bon it\b/, /\bkicked off\b/, /\bopened (the|my)\b/, /\bgot (it )?started\b/],
    lo: [/\bcan'?t (even )?start\b/, /\bcannot start\b/, /\bputting (it )?off\b/, /\bprocrastinat\w*/, /\bavoid\w*/, /\bstuck\b/, /\bfrozen\b/, /\bhaven'?t started\b/, /\bnot starting\b/, /\bkeep delaying\b/, /\bdelay\w*/, /\bcan'?t get (myself )?(going|started)\b/],
  },
  CAP: {
    hi: [/\bdeadline\b/, /\bdue\b/, /\burgent\b/, /\bimportant\b/, /\bmatters?\b/, /\breally want\b/, /\bcare about\b/, /\bexcited\b/, /\bmust\b/, /\bneed to\b/],
    lo: [/\bdon'?t care\b/, /\bpointless\b/, /\bwhatever\b/, /\bmeaningless\b/, /\bno reason\b/, /\bbored\b/, /\bunmotivated\b/, /\bno point\b/],
  },
  Flexion: {
    hi: [/\bmakes sense\b/, /\bclear\b/, /\beasy\b/, /\bcomfortable\b/, /\bmanageable\b/, /\bknow what to do\b/, /\bgood fit\b/, /\bright size\b/],
    lo: [/\btoo hard\b/, /\btoo big\b/, /\bdon'?t know how\b/, /\bconfus\w*/, /\bunclear\b/, /\bnot sure (where|how)\b/, /\bout of my depth\b/, /\btoo much\b/, /\bno idea\b/],
  },
  Anchory: {
    hi: [/\bfocused\b/, /\bin the zone\b/, /\bflow\b/, /\blocked in\b/, /\bconcentrat\w*/, /\bdeep work\b/, /\babsorbed\b/],
    lo: [/\bdistract\w*/, /\bscrolling\b/, /\bcan'?t (focus|concentrate)\b/, /\bunfocused\b/, /\bnotifications?\b/, /\bmind (was )?wander\w*/, /\bphone\b/],
  },
  Grain: {
    hi: [/\bheavy\b/, /\bdread\w*/, /\banxi\w*/, /\bstress\w*/, /\btired\b/, /\bexhausted\b/, /\bdrained\b/, /\bburn(ed|t)? out\b/, /\bweighs?\b/, /\bhate\b/, /\bworried\b/, /\boverwhelm\w*/],
    lo: [/\blight\b/, /\brelaxed\b/, /\bcalm\b/, /\brested\b/, /\benergi[sz]ed\b/, /\bfresh\b/, /\beffortless\b/],
  },
  Slip: {
    hi: [/\ball over the place\b/, /\bscatter\w*/, /\bjumping\b/, /\bbouncing\b/, /\bforgot\b/, /\blost track\b/, /\brestless\b/, /\berratic\b/, /\boff track\b/, /\bdrifting\b/, /\bzoned out\b/],
    lo: [/\bsteady\b/, /\bconsistent\b/, /\bon track\b/, /\bstable\b/, /\broutine\b/],
  },
};
const POS = [/\bgood\b/, /\bgreat\b/, /\bhappy\b/, /\bproud\b/, /\bgrateful\b/, /\bthankful\b/, /\bwin\b/, /\bprogress\b/, /\bbetter\b/, /\bgood\b/, /\blove\b/, /\benjoy\w*/, /\bhopeful\b/];
const NEG = [/\bbad\b/, /\bsad\b/, /\bangry\b/, /\bfrustrat\w*/, /\bawful\b/, /\bterrible\b/, /\bworse\b/, /\bhopeless\b/, /\blonely\b/, /\bguilt\w*/, /\bashamed\b/, /\bfailed?\b/, /\bupset\b/, /\bcry\w*/];
const LOOP = /\b(i (still )?(need|have|should|must|ought) to|haven'?t|didn'?t get to|still (need|have)|supposed to|behind on|i'?ve been meaning to)\b/;
const WIN = /\b(finished|completed|done with|managed to|submitted|sent|wrote|got .{1,30} done|started|cleaned|called|replied)\b/;
const CRISIS = /(suicid|kill myself|end my life|self[- ]?harm|don'?t want to (live|be alive)|hurt myself|want to die)/;

const count = (t: string, rs: RegExp[]) => rs.reduce((n, r) => n + (t.match(new RegExp(r.source, "g"))?.length ?? 0), 0);
const clip = (s: string) => { const x = s.trim().replace(/\s+/g, " "); return x.length > 90 ? x.slice(0, 87) + "..." : x; };

export function analyze(raw: string): TextSignals {
  const t = raw.toLowerCase();
  const levels: TextSignals["levels"] = {}; const hits: TextSignals["hits"] = {};
  VAR_KEYS.forEach(k => {
    const hi = count(t, L[k].hi), lo = count(t, L[k].lo);
    if (hi + lo > 0) { hits[k] = { hi, lo }; levels[k] = 0.5 + 0.5 * Math.tanh(0.9 * (hi - lo)); }
  });
  const pos = count(t, POS), neg = count(t, NEG);
  const sentences = raw.split(/(?<=[.!?\n])\s+/).filter(Boolean);
  return {
    levels, hits,
    sentiment: pos + neg === 0 ? 0 : (pos - neg) / (pos + neg + 1),
    openLoops: sentences.filter(s => LOOP.test(s.toLowerCase())).map(clip).slice(0, 3),
    wins: sentences.filter(s => WIN.test(s.toLowerCase()) && !/\b(haven'?t|didn'?t|not)\b/.test(s.toLowerCase())).map(clip).slice(0, 3),
    words: raw.trim().split(/\s+/).filter(Boolean).length,
    crisis: CRISIS.test(t),
  };
}
const STOP = new Set("about after again also because been before being could doing don't from have just like more really some something that their them then there these they this today very want were what when where which while with would your into over than only myself still need should going other even much many".split(" "));
export function themes(texts: string[], n = 6) {
  const c: Record<string, number> = {};
  texts.join(" ").toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).forEach(w => { if (w.length > 4 && !STOP.has(w)) c[w] = (c[w] || 0) + 1; });
  return Object.entries(c).filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}
