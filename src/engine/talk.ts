// Talk: the rabbit's own conversation engine. No outside AI, no internet call to a model.
// A 566,881-parameter neural network (tools/talk/train.mjs) reads each message together with the last two things that were said
// and picks one of 33 conversation acts, even when a message opens with a filler like "I don't know, I need to talk". A dialogue manager then answers from written replies, remembers your task, repairs the
// conversation when it is lost, and offers next steps. When it is not sure it asks, and it never leaves you at a dead end.
import { analyze } from "@/engine/text";
import { SAFETY_TEXT, looksUnsafe } from "@/engine/coachNlu";
import { suggestSteps } from "@/engine/plan";
import { loadLog } from "@/lib/startlog";
import { dayKeyOf } from "@/engine/pattern";
import { petNow } from "@/lib/pet";
import { tomorrowStep } from "@/engine/director";
import { directorOn } from "@/lib/arm";

export type Act = "greet" | "thanks" | "bye" | "howru" | "who_help" | "unclear" | "big" | "boring" | "scared" | "tired" | "distract" | "overwhelm" | "low" | "win" | "ask_start" | "ask_plan" | "ask_break" | "motivate" | "joke" | "chitchat" | "yes" | "no" | "task_say" | "progress" | "deadline" | "other" | "dont_know" | "clarify" | "complain" | "share" | "good_mood" | "want_to_talk" | "vent";
export interface Chip { label: string; send?: string; act?: "start" | "coach" | "plan" | "circle"; task?: string; step?: string }
export interface Msg { id: string; from: "me" | "pip"; text: string; ts: number; chips?: Chip[]; act?: Act; conf?: number }
export interface TalkState { last: Act | ""; task?: string; awaiting?: Act | null; pending?: "start" | "plan" | null; lowRun: number; used: Record<string, number>; turns: number; unsureRun: number; lastReply?: string; lastStep?: string; prev2?: Act | ""; mode?: "listen" | null; listenTurns?: number }
export const emptyState = (): TalkState => ({ last: "", lowRun: 0, used: {}, turns: 0, unsureRun: 0 });
export const MODEL_PARAMS = 566881; // the small model; the large one has 10,240,097

interface QMat { s: number; b: string }
interface RawModel { T?: number; labels: Act[]; B: number; D: number; DC: number; H1: number; H2: number; K: number; NC: number; threshold: number; params: number; q: Record<"E" | "C1" | "C2" | "W1" | "b1" | "W2" | "b2" | "W3" | "b3", QMat> }
/** E stays int8 (with one scale) so a 10-million-parameter table never has to be expanded in memory. */
interface Model { T?: number; labels: Act[]; B: number; D: number; DC: number; H1: number; H2: number; K: number; NC: number; threshold: number; params: number; E: Int8Array; eS: number; w: Record<string, Float32Array> }
const b64 = (m: QMat) => { const bin = atob(m.b); const out = new Int8Array(bin.length); for (let i = 0; i < bin.length; i++) { const v = bin.charCodeAt(i); out[i] = v > 127 ? v - 256 : v; } return out; };
let cache: Promise<Model> | null = null;
const load = () => (cache ??= import("@/engine/talkModel.json").then(x => { const r = (x.default ?? x) as unknown as RawModel; const w: Record<string, Float32Array> = {}; for (const k of Object.keys(r.q) as (keyof RawModel["q"])[]) { if (k === "E") continue; const i8 = b64(r.q[k]); const f = new Float32Array(i8.length); for (let i = 0; i < i8.length; i++) f[i] = i8[i] * r.q[k].s; w[k] = f; } const { q, ...rest } = r; return { ...rest, E: b64(q.E), eS: q.E.s, w } as Model; }));

// The large model (about 10 million parameters) is a separate file. It is fetched in the background only after the person has
// actually used Talk, on a fast, non-metered connection, and kept by the browser. Until then the small model answers.
let big: Model | null = null; let bigTry: Promise<void> | null = null;
export const BIG_URL = "/talk/lagomo-talk-10m-v1.bin";
function parseBig(buf: ArrayBuffer): Model {
  const dv = new DataView(buf); const hl = dv.getUint32(0, true); const h = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
  let off = 4 + hl; off = (off + 3) & ~3; const nRows = h.rows as number;
  const idx = new Uint32Array(buf, off, nRows); off += nRows * 4;
  const E = new Int8Array(h.B * h.D); const rows = new Int8Array(buf, off, nRows * h.D); off += nRows * h.D;
  for (let r = 0; r < nRows; r++) E.set(rows.subarray(r * h.D, (r + 1) * h.D), idx[r] * h.D);
  const w: Record<string, Float32Array> = {};
  for (const k of ["C1", "C2", "W1", "b1", "W2", "b2", "W3", "b3"]) { const n = h.sizes[k] as number; const i8 = new Int8Array(buf, off, n); off += n; const f = new Float32Array(n); const s = h.scales[k] as number; for (let i = 0; i < n; i++) f[i] = i8[i] * s; w[k] = f; }
  return { T: h.T, labels: h.labels, B: h.B, D: h.D, DC: h.DC, H1: h.H1, H2: h.H2, K: h.K, NC: h.NC, threshold: h.threshold, params: h.params, E, eS: h.scales.E, w };
}
/** Start the quiet upgrade to the large model, if this device and connection suit it. Safe to call many times. */
export function upgradeTalk(): Promise<void> {
  if (big || bigTry) return bigTry ?? Promise.resolve();
  try { const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string; type?: string }; deviceMemory?: number }); const n = c.connection; if (n?.saveData || (n?.effectiveType && n.effectiveType !== "4g") || n?.type === "cellular" || (c.deviceMemory ?? 4) < 4) return Promise.resolve(); } catch { /* assume fine */ }
  bigTry = fetch(BIG_URL).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("no big model")))).then(b => { big = parseBig(b); }).catch(() => { bigTry = null; });
  return bigTry;
}
export const usingBigModel = () => !!big;

/** Fetch and decode the small model quietly in the background, so the first message in Talk is instant. Skips slow or data-saver connections. */
export function preloadTalk() {
  try { const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection; if (c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? "")) return; } catch { /* ignore */ }
  void load().catch(() => { cache = null; });
}

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const tok = (t: string) => t.toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
function feats(text: string, B: number): [number, number][] {
  const w = tok(text); const out: string[] = [];
  for (const x of w) { out.push("w:" + x); const p = "^" + x + "$"; for (let i = 0; i + 3 <= p.length; i++) out.push("c:" + p.slice(i, i + 3)); }
  for (let i = 0; i + 1 < w.length; i++) out.push("b:" + w[i] + "_" + w[i + 1]);
  for (let i = 0; i + 2 < w.length; i++) out.push("t:" + w[i] + "_" + w[i + 1] + "_" + w[i + 2]);
  for (let i = 0; i + 1 < w.length; i++) if (["not", "dont", "never", "cant", "no", "nothing"].includes(w[i])) out.push("n:" + w[i + 1]);
  return out.map(f => { const h = hash(f); return [h % B, ((h >>> 20) & 1) ? 1 : -1] as [number, number]; });
}
export interface Reading { top: { act: Act; p: number }[]; confident: boolean }
/** Run the network. `prev` and `prev2` are the acts of the last two turns. */
export async function readAct(text: string, prev: Act | "", prev2: Act | "" = ""): Promise<Reading> {
  const small = await load(); const m = big ?? small; const { B, D, DC, H1, H2, K } = m; const w = m.w; const f = feats(text, B); const IN = D + 2 * DC;
  const x = new Float32Array(D); for (const [b, sg] of f) for (let d = 0; d < D; d++) x[d] += sg * m.E[b * D + d] * m.eS;
  const sc = f.length ? 1 / Math.sqrt(f.length) : 0; const a = prev === "" ? K : m.labels.indexOf(prev), c = prev2 === "" ? K : m.labels.indexOf(prev2);
  const inp = new Float32Array(IN); for (let d = 0; d < D; d++) inp[d] = x[d] * sc; for (let d = 0; d < DC; d++) { inp[D + d] = w.C1[a * DC + d]; inp[D + DC + d] = w.C2[c * DC + d]; }
  const h1 = new Float32Array(H1); for (let j = 0; j < H1; j++) { let z = w.b1[j]; for (let i = 0; i < IN; i++) z += inp[i] * w.W1[i * H1 + j]; h1[j] = Math.tanh(z); }
  const h2 = new Float32Array(H2); for (let j = 0; j < H2; j++) { let z = w.b2[j]; for (let i = 0; i < H1; i++) z += h1[i] * w.W2[i * H2 + j]; h2[j] = Math.tanh(z); }
  const z = new Float32Array(K); for (let k = 0; k < K; k++) { let sum = w.b3[k]; for (let j = 0; j < H2; j++) sum += h2[j] * w.W3[j * K + k]; z[k] = sum; }
  const T = m.T ?? 1; const mx = Math.max(...z); const e = Array.from(z, v => Math.exp((v - mx) / T)); const sm = e.reduce((p, q) => p + q, 0);
  const top = e.map((v, i) => ({ act: m.labels[i], p: v / sm })).sort((p, q) => q.p - p.p).slice(0, 3);
  return { top, confident: top[0].p >= m.threshold };
}

/** A variant not used recently for this act. */
function vary(st: TalkState, key: string, a: string[]): string {
  const last = st.used[key]; let i = Math.floor(Math.random() * a.length); if (a.length > 1 && i === last) i = (i + 1) % a.length; st.used[key] = i; return a[i];
}
const REPLY: Record<string, string[]> = {
  greet: ["Hey again, {me}. What's going on?", "Hi! I'm here. What would you like to do?", "Hi {me}! I'm {pet}. What's on your mind today?", "Hey {me}. Good to see you. Want to start something small, or just talk?", "Hello! {pet} here. What would help right now?"],
  thanks: ["Any time. You did the hard part by showing up.", "Happy to. Want to keep going, or take a breather?", "You're welcome. I'm glad it helped."],
  bye: ["Take care, {me}. I'll be here whenever you want to start something.", "See you soon. Rest well.", "Bye for now. One small start tomorrow is plenty."],
  howru: ["I'm doing well, thanks for asking. I'm an AI, so my day is mostly waiting for you. How are you?", "Cheerful. I'm a rabbit made of maths, and I like it when you drop by. How about you?"],
  who_help: ["Still me, {pet}. I help you start things, plan your day, and keep you company. What would you like to do?", "I'm {pet}, your rabbit. Ask me for a tiny first step, a plan for the day, or just talk. I'm listening.", "I'm {pet}, a small AI that lives in this app. I can help you start things, break tasks down, plan your day, and keep you company. The model is {model} and runs on your device.", "I'm {pet}. I'm not a person. I'm a small model trained to help you get started, and I make mistakes, so tell me when I get it wrong."],
  unclear: ["Not knowing where to start is really common. Let's find just the first move.", "That fog is normal when something is vague. We only need one clear action."],
  big: ["That does sound like a lot. We can shrink it until it stops looking like a mountain.", "Big things feel impossible all at once. We only have to do the first small piece."],
  boring: ["Boring is real. Let's make it short and a bit more fun, like two minutes with a treat nearby.", "Tedious tasks are hard to start. A tiny timer makes them easier."],
  scared: ["That worry is really common, and it often shows up when something matters to you. A rough first draft is allowed.", "It doesn't have to be good yet. It only has to exist."],
  tired: ["That sounds draining. Let's keep it very small today, or rest if you need to.", "Being tired makes everything harder. One tiny step or a proper rest are both fine."],
  distract: ["Your phone is built to pull you. Let's make the first step easy and put the phone out of reach.", "That happens to everyone. A short timer with the phone in another room helps."],
  overwhelm: ["Everything at once is a lot. Let's pick just one thing, and the rest can wait.", "When it all piles up, the answer is one small thing. We'll choose it together."],
  low: ["I'm sorry you're feeling this way. You don't need to do anything right now. I'm here.", "That sounds heavy. Thank you for telling me. We can go slow."],
  win: ["Yes! That counts, {me}. Starting is the hard part and you did it.", "Nice work. That one is yours.", "I'm proud of you. Even a little progress is real progress."],
  ask_start: ["Let's start tiny. Two minutes, nothing more.", "Good. Let's pick one small first step."],
  ask_plan: ["Happy to. Planning is easier in the calendar, where you can drop small blocks into your day."],
  ask_break: ["Yes. Rest is allowed. Five minutes away from the screen, some water, then see how you feel.", "Of course. A real break is part of the work. Stretch, drink some water, and come back when you're ready."],
  motivate: ["You don't need motivation to start, only two minutes. Motivation usually arrives after you begin.", "You have started before, and you can again. One tiny step is enough."],
  chitchat: ["I like carrots, but I've never had one. I'm software. I do like it when you tell me about your day.", "I'm a rabbit made of maths who lives on your device. It's a quiet life. What about you?", "Fun fact: rabbits do a little jump called a binky when they're happy. That is my entire personality.", "I don't sleep, but I do enjoy a good quiet moment. What's something small you enjoyed today?"],
  no: ["Okay, no pressure.", "That's fine. I'm here if you change your mind.", "No problem."],
  other: ["I'm not sure how to help with that one. I'm best at helping you start things and keeping you company.", "That one is outside what I can do. I'm good at starting things, breaking tasks down and keeping you company.", "I can't help with that, but I can help you get going on something."],
  good_mood: ["I'm glad to hear it. Good energy is perfect for a tiny start. Want to use it?", "That's lovely, {me}. A good mood makes starting easier. Anything small you'd like to get going on?", "Nice. Let's make the most of it with one small thing."],
  share: ["Thanks for telling me. How's your energy right now?", "I like hearing about your day. Is there anything you've been putting off?", "Got it. Sounds like a regular kind of day. How are you feeling about it?", "Thanks for sharing that. Want to do one small thing while you're here?"],
  want_to_talk: ["I'm here and I'm listening. What happened today?", "Of course. Tell me about it, as much or as little as you like.", "Yes, let's talk. What's on your mind?", "I'm all ears. Where would you like to begin?"],
  vent: ["That sounds really frustrating.", "I can hear how annoying that was.", "Ugh, that sounds like a lot to deal with."],
  complain: ["You're right, that wasn't helpful. I'm a small model and I get things wrong. Tell me in a few words what's going on and I'll try again.", "Sorry about that. I didn't get it. Can you say it another way? Or pick what's closest below.", "Fair. I missed it. Let me try again: what is the hardest part right now?"],
};
const JOKES = ["Why did the rabbit start the task? It was tired of just hopping around it.", "What do you call a rabbit that finishes homework early? A hare ahead of the class.", "Why don't procrastinators ever get lost? They never leave.", "I told my to-do list a joke. It didn't finish it either.", "What's a rabbit's favorite exercise? Hip hop.", "Why did the student put the clock in the freezer? To save time."];
const fill = (s: string, st: TalkState) => s.replace(/\{model\}/g, big ? "about ten million numbers" : "about half a million numbers").replace(/\{pet\}/g, petNow().name).replace(/\{me\}/g, myName()).replace(/\{task\}/g, st.task ?? "it");
let nameCache = ""; export const setMyName = (n: string) => { nameCache = n.split(" ")[0] || ""; };
const myName = () => nameCache || "friend";

const TASK_WORDS = ["essay","report","assignment","homework","thesis","project","presentation","revision","cv","application","taxes","reading","notes","email","portfolio","dissertation","slides","budget","paper","form","brief","plan","exam","test","quiz","lab","coding","code","study","studying","chemistry","maths","math","history","biology","physics"];
/** Pull a task name out of a sentence like "I need to finish my chemistry report". */
export function extractTask(text: string): string | undefined {
  const t = text.toLowerCase().replace(/[.!?]+$/g, "");
  let m = t.match(/(?:need to|have to|should|want to|gotta|must|going to|avoiding|putting off|working on|postponing|haven't touched|haven t touched|keep avoiding|owe myself the)\s+(?:finish |start |write |do |work on |get |submit |sort out |handle |tackle |study for |reply to |email )?(?:my |the |a )?(.{3,40})$/);
  if (m) return clean(m[1]);
  m = t.match(/\b(?:my|the)\s+([a-z0-9 ]{3,30}?)(?:\s+(?:is|are|has|due|closes|deadline|tomorrow|today|tonight|on|in|for|this|next|by|at)\b|$)/);
  if (m && TASK_WORDS.some(w => m![1].includes(w))) return clean(m[1]);
  const w = TASK_WORDS.find(x => t.includes(x)); if (w) return w;
  return undefined;
}
const clean = (s: string) => s.replace(/\b(today|tomorrow|tonight|right now|please|lol)\b/g, "").replace(/\s+/g, " ").trim().slice(0, 40) || undefined as unknown as string;
function dueWord(text: string): string | undefined {
  const t = text.toLowerCase(); const m = t.match(/\b(tomorrow|tonight|today|this weekend|next week|on (?:mon|tues|wednes|thurs|fri|satur|sun)day|in (?:\d+|two|three|four|five|a few) days|(?:mon|tues|wednes|thurs|fri|satur|sun)day)\b/); return m?.[1];
}
const stepFor = (task?: string) => suggestSteps(task || "it")[0]?.text ?? "Open it and look at it for two minutes.";
const LABEL: Partial<Record<Act, string>> = { unclear: "I don't know where to start", big: "It feels too big", boring: "It's boring", scared: "I'm afraid of doing it badly", tired: "I'm tired", distract: "I keep getting distracted", overwhelm: "I'm overwhelmed", low: "I'm feeling low", ask_start: "Help me start", ask_plan: "Plan my day", motivate: "I need a push", joke: "Tell me a joke", progress: "How am I doing?", win: "I did something", chitchat: "Let's chat", who_help: "What can you do?", task_say: "I'm avoiding something", deadline: "I have a deadline", share: "I'll tell you about my day", good_mood: "I'm feeling good" };
/** The guided menu: shown when the conversation is lost, so it never ends at a dead end. */
const MENU: Chip[] = [{ label: "Too much to do", send: "I'm overwhelmed" }, { label: "Can't get started", send: "I don't know where to start" }, { label: "I'm tired", send: "I'm tired" }, { label: "Feeling low", send: "I'm feeling low" }, { label: "Just chatting", send: "Let's chat" }];
const dedupe = (cs: Chip[]) => { const seen = new Set<string>(); return cs.filter(c => (seen.has(c.label) ? false : (seen.add(c.label), true))); };

function weekStats() {
  const now = Date.now(); const S = loadLog().starts.filter(s => s.ts <= now); const wk = S.filter(s => now - s.ts < 7 * 864e5);
  return { total: S.length, week: wk.length, days: new Set(wk.map(s => dayKeyOf(s.ts))).size };
}
export interface Ctx { tasks: { title: string; step?: string }[]; streak: number }
export interface Turn { reply: string; chips: Chip[]; act: Act; conf: number; state: TalkState; sensitive?: boolean; unsure?: boolean }

// A short lexicon as a safety net for one-word replies, used only when the network is unsure.
const LEX: [RegExp, Act][] = [[/^(yes|yeah|yep|yup|sure|ok|okay|ya|yea|y)\b/, "yes"], [/^(no|nope|nah|n)\b/, "no"], [/^(hi|hey|hello|hiya|yo|hola)\b/, "greet"], [/^(thanks|thank you|thx|ty)\b/, "thanks"], [/^(bye|goodbye|cya|goodnight|good night)\b/, "bye"], [/^(idk|dunno|i dont know|not sure|no idea)\b/, "dont_know"], [/^(what|huh|why|how)\??$/, "clarify"]];
const lexicon = (t: string): Act | null => { const s = tok(t).join(" "); for (const [re, a] of LEX) if (re.test(s)) return a; return null; };

// Listening mode: when someone wants to talk about their day, the rabbit stops offering menus and listens: it reflects what it heard,
// names the feeling, and asks one open question at a time. After a few turns it offers, never pushes, one small thing to do.
const TOPICS: [RegExp, string][] = [[/\b(boss|manager|work|job|meeting|colleague|coworker|office|client)\b/, "work"], [/\b(school|class|teacher|exam|exams|homework|professor|university|college|classmate|classmates|lecture)\b/, "school"], [/\b(friend|friends)\b/, "your friend"], [/\b(mom|dad|mother|father|parents|sister|brother|family)\b/, "your family"], [/\b(money|rent|bills|salary|debt)\b/, "money"], [/\b(roommate|neighbour|neighbor)\b/, "home"]];
const OPENER: Partial<Record<Act, string[]>> = {
  vent: ["That sounds really frustrating.", "I can hear how annoying that was.", "Ugh, that sounds like a lot to deal with."],
  low: ["That sounds heavy. I'm glad you told me.", "I'm sorry. That sounds hard."],
  tired: ["That sounds draining."], overwhelm: ["That's a lot to carry."], scared: ["That sounds scary. It makes sense to feel that way."], big: ["That does sound like a lot."],
  good_mood: ["That's nice to hear.", "I'm glad."], win: ["That's something to be proud of."], share: ["Thanks for telling me.", "I see.", "Okay, I'm following."],
};
const FOLLOW = ["What part of it stayed with you the most?", "How did that leave you feeling?", "What would have made it a little better?", "What do you wish had gone differently?", "Is there anything about it you're still thinking about?", "What was the hardest moment?"];
const LISTEN_STAY: Act[] = ["share", "vent", "low", "good_mood", "tired", "overwhelm", "dont_know", "other", "big", "scared", "unclear", "boring", "distract", "chitchat", "yes", "no", "want_to_talk", "task_say", "win"];
/** A rough read of the feeling in a longer message, used when the network only knows it is "someone talking". */
function toneOf(text: string): Act | null {
  const t = text.toLowerCase();
  if (/\b(yell\w*|angry|annoy\w*|furious|mad at|unfair|rude|blam\w*|ignor\w*|frustrat\w*|irritat\w*|fight|argu\w*|hate|fed up|sick of)\b/.test(t)) return "vent";
  if (/\b(sad|lonely|empty|hopeless|cry\w*|hurt\w*|miserable|embarrass\w*|ashamed|awful|terrible|worthless)\b/.test(t)) return "low";
  if (/\b(tired|exhaust\w*|sleepy|drained)\b/.test(t)) return "tired";
  if (/\b(overwhelm\w*|too much|swamped|stress\w*)\b/.test(t)) return "overwhelm";
  if (/\b(happy|excited|proud|glad|great day|good news|fun)\b/.test(t)) return "good_mood";
  return null;
}
function listenReply(act: Act, text: string, st: TalkState, done: (t: Omit<Turn, "state">) => Turn, conf: number, fresh: boolean): Turn {
  if ((act === "want_to_talk" || act === "other" || act === "clarify" || act === "complain" || act === "dont_know") && tok(text).length >= 5) { const tone = toneOf(text); if (tone) act = tone; else if (act === "want_to_talk" || act === "clarify" || act === "complain") act = "share"; }
  st.mode = "listen"; st.awaiting = null; st.listenTurns = fresh ? 1 : (st.listenTurns ?? 0) + 1; st.last = act; const n = st.listenTurns;
  const topic = TOPICS.find(([re]) => re.test(text.toLowerCase()))?.[1];
  if (act === "low") st.lowRun += 1;
  let reply: string; const chips: Chip[] = [];
  if (n >= 5) { st.listenTurns = 1; reply = "Thank you for telling me all of that. Would it help to turn any of it into one small thing, or would you rather keep talking?"; chips.push({ label: "One small thing", send: "Help me start" }, { label: "Keep talking", send: "I want to keep talking" }, { label: "That's enough for now", send: "that's enough for now" }); }
  else if (act === "dont_know") reply = "That's okay. We can start anywhere. What was the first thing that happened today?";
  else if (act === "yes") reply = "Go on, I'm listening.";
  else if (act === "no") reply = "Okay. What would you like to say instead?";
  else if (act === "other" || !OPENER[act]) reply = vary(st, "lsh", ["I'm with you. Tell me a bit more.", "Mm. Keep going, I'm listening.", "Take your time. What else?"]);
  else {
    const open = vary(st, "lo_" + act, OPENER[act]!); const mirror = topic && ["vent", "low", "tired", "overwhelm", "scared"].includes(act) ? " It sounds like " + topic + " took a lot out of you." : "";
    reply = open + mirror + " " + FOLLOW[(n - 1) % FOLLOW.length];
  }
  if (act === "low" && st.lowRun >= 2) reply += " If it keeps feeling this heavy, talking to someone you trust can help. findahelpline.com lists free lines by country.";
  return done({ reply, chips, act, conf, sensitive: true });
}

/** One turn of conversation. Pure apart from reading the start log. */
export async function respond(text: string, prevState: TalkState, ctx: Ctx): Promise<Turn> {
  const st: TalkState = { ...prevState, used: { ...prevState.used }, turns: prevState.turns + 1, prev2: prevState.last };
  const done = (t: Omit<Turn, "state">): Turn => { if (st.mode === "listen" || prevState.mode === "listen") t = { ...t, sensitive: true }; st.lastReply = t.reply; const sc = t.chips.find(c => c.act === "start"); if (sc) st.lastStep = sc.step; return { ...t, chips: dedupe(t.chips), state: st }; };
  if (looksUnsafe(text) || analyze(text).crisis) { st.last = "low"; st.awaiting = null; st.unsureRun = 0; return done({ reply: SAFETY_TEXT, chips: [{ label: "Talk to a friend", act: "circle" }], act: "low", conf: 1, sensitive: true }); }
  let rd = await readAct(text, prevState.last, prevState.prev2 ?? ""); let act = rd.top[0].act; let conf = rd.top[0].p;
  // "I don't know, I need to talk about today": if the whole message reads as a filler, trust the clause that carries the content
  const FILLER: Act[] = ["dont_know", "yes", "no", "thanks", "greet", "other", "clarify"];
  if (FILLER.includes(act) || !rd.confident) {
    const clauses = text.split(/[,.;!?]| but | and | so | - /i).map(c => c.trim()).filter(c => tok(c).length >= 2);
    if (clauses.length > 1) { let best: { act: Act; p: number } | null = null; for (const c of clauses) { const r = await readAct(c, prevState.last, prevState.prev2 ?? ""); const t = r.top[0]; if (!FILLER.includes(t.act) && t.p >= 0.5 && (!best || t.p > best.p)) best = t; } if (best) { act = best.act; conf = best.p; rd = { top: [{ act, p: conf }, ...rd.top.filter(x => x.act !== act)].slice(0, 3), confident: true }; } }
  }
  const listening = prevState.mode === "listen";
  // after we asked "which thing is it?", a short answer is the task
  if (prevState.awaiting && text.trim().length <= 70 && !(rd.confident && ["greet", "bye", "no", "thanks", "low", "dont_know", "complain", "clarify"].includes(act))) {
    const task = extractTask(text) ?? text.trim().replace(/[.!?]+$/g, "").slice(0, 40); st.task = task; const a = prevState.awaiting; st.awaiting = null; st.unsureRun = 0;
    if (a === "task_say") { const step = stepFor(task); st.last = "task_say"; st.pending = "start"; return done({ reply: `Got it: ${task}. A tiny first step: ${step}`, chips: [{ label: "Start 2 min", act: "start", task, step }, { label: "Make it smaller", act: "coach", task }], act: "task_say", conf }); }
    return coach(a, st, conf, done);
  }
  if (/^(that'?s|thats) enough|enough for now|i('m| am) done (talking|for now)/i.test(text.trim())) { st.mode = null; st.listenTurns = 0; st.last = "bye"; st.unsureRun = 0; return done({ reply: "Thank you for sharing with me. I'm here whenever you want to talk again.", chips: [{ label: "Help me start", send: "Help me start" }, { label: "Plan my day", act: "plan" }], act: "bye", conf: 1, sensitive: true }); }
  if (listening) {
    const nw = tok(text).length; const longStay: Act[] = ["clarify", "complain", "deadline", "motivate", "howru"]; // inside a story these are just part of it
    const leaves = rd.confident && !LISTEN_STAY.includes(act) && !(nw >= 5 && longStay.includes(act));
    if (!leaves) { st.unsureRun = 0; return listenReply(rd.confident ? act : "other", text, st, done, conf, false); }
    st.mode = null; st.listenTurns = 0;
  }
  const words = tok(text).length;
  // not sure: ask once, then offer the guided menu, and never leave a dead end
  if (!rd.confident || (act === "other" && (conf < 0.6 || words <= 2))) {
    const lx = lexicon(text);
    if (lx && words <= 3) { act = lx; conf = Math.max(conf, 0.55); }
    else {
      st.unsureRun += 1; st.last = "other"; st.awaiting = null;
      if (st.unsureRun === 1 && words <= 2) return done({ reply: vary(st, "nudge", ["I'm here. What's on your mind?", "Hey, I'm listening. What's up?", "Take your time. What would you like to talk about?"]), chips: [{ label: "Help me start", send: "Help me start" }, { label: "I'm stuck", send: "I don't know where to start" }, { label: "Let's chat", send: "Let's chat" }], act: "other", conf, unsure: true });
      const opts = rd.top.map(t => t.act).filter(a => LABEL[a]).slice(0, 2) as Act[];
      if (st.unsureRun === 1) return done({ reply: vary(st, "unsure", ["I want to make sure I follow. Can you tell me a bit more?", "Say a little more? I want to understand.", "I'm not sure I got that. What do you mean?"]), chips: [], act: "other", conf, unsure: true });
      return done({ reply: vary(st, "menu", ["No worries, we don't have to name it. What feels closest right now?", "That's okay. Let's find it together. Pick whatever is nearest.", "I may be missing it. Here are a few common ones. Tap the closest, or tell me more in your own words."]), chips: MENU, act: "other", conf, unsure: true });
    }
  }
  st.unsureRun = 0;
  if (act !== "low") st.lowRun = 0;
  if (["unclear", "big", "boring", "scared"].includes(act)) { const t = extractTask(text); if (t) st.task = t; if (!st.task) { st.awaiting = act; st.last = act; return done({ reply: fill(vary(st, act, REPLY[act]), st) + " Which thing is it?", chips: ctx.tasks.slice(0, 2).map(t => ({ label: t.title, send: t.title })), act, conf }); } return coach(act, st, conf, done); }
  if (["tired", "distract", "overwhelm"].includes(act)) { const t = extractTask(text); if (t) st.task = t; return coach(act, st, conf, done); }
  st.awaiting = null;
  const chips: Chip[] = []; let reply = "";
  switch (act) {
    case "low": { st.lowRun += 1; reply = fill(vary(st, "low", REPLY.low), st) + (st.lowRun >= 2 ? " If it keeps feeling this heavy, talking to someone you trust can help. findahelpline.com lists free lines by country." : " Do you want to talk about it, or just sit for a minute?"); chips.push({ label: "Talk to a friend", act: "circle" }, { label: "Just sit for a minute", send: "I just want to sit for a minute" }); st.last = act; return done({ reply, chips, act, conf, sensitive: true }); }
    case "dont_know": {
      const prev = prevState.last;
      if (prev === "ask_start" || prev === "task_say" || prev === "deadline") reply = vary(st, "dk1", ["That's okay, you don't need to know yet. Is it more that you can't get going, or that it feels like too much?", "No problem. Let's narrow it down. What feels hardest about starting?"]);
      else if (prev === "low") { reply = "That's okay. You don't have to explain it. I'm here. We can just sit for a bit, or I can help with one tiny thing."; chips.push({ label: "Just sit for a minute", send: "I just want to sit for a minute" }, { label: "Talk to a friend", act: "circle" }); }
      else reply = vary(st, "dk2", ["That's okay, not knowing is a fine place to start. Let's find it together. What feels closest?", "No pressure. We can figure it out as we go. Which of these feels nearest?"]);
      if (!chips.length) chips.push(...MENU);
      break;
    }
    case "clarify": {
      if (st.lastStep) reply = `Sorry, let me say it simply. I'm suggesting one tiny step for two minutes: ${st.lastStep} Nothing more than that.`;
      else if (prevState.last === "other" || prevState.last === "") reply = "Sorry, I wasn't clear. I help you get started on things: I can break a task into a tiny first step, help you plan your day, or just keep you company. What would help?";
      else reply = "Let me say that more simply: we make the first move so small that it's easy to begin. Which part is unclear?";
      chips.push({ label: "Help me start", send: "Help me start" }, { label: "I'm stuck", send: "I don't know where to start" }); break;
    }
    case "complain": reply = fill(vary(st, "complain", REPLY.complain), st); chips.push(...MENU.slice(0, 3), { label: "Just chat", send: "Let's chat" }); break;
    case "want_to_talk": st.mode = "listen"; st.listenTurns = 0; reply = words <= 4 ? vary(st, "wtt_short", ["Yes? I'm listening.", "Go on, I'm all ears.", "What is it?", "I'm here. Tell me."]) : fill(vary(st, "want_to_talk", REPLY.want_to_talk), st); break;
    case "vent": return listenReply("vent", text, st, done, conf, true);
    case "share": if (words >= 6) return listenReply("share", text, st, done, conf, true); reply = fill(vary(st, "share", REPLY.share), st); chips.push({ label: "Good", send: "I'm feeling good" }, { label: "Tired", send: "I'm tired" }, { label: "Stressed", send: "I'm overwhelmed" }); break;
    case "good_mood": reply = fill(vary(st, "good_mood", REPLY.good_mood), st); chips.push({ label: "Help me start", send: "Help me start" }, { label: "Plan my day", act: "plan" }); break;
    case "win": reply = fill(vary(st, "win", REPLY.win), st); chips.push({ label: "Start another small one", send: "Help me start" }, { label: "Plan my day", act: "plan" }); break;
    case "ask_start": { const tm = directorOn() ? tomorrowStep() : null; const t = tm?.task ?? ctx.tasks[0]?.title ?? st.task; if (t) { st.task = t; const step = tm ? tm.step ?? stepFor(t) : ctx.tasks[0]?.step ?? stepFor(t); reply = `${fill(vary(st, "ask_start", REPLY.ask_start), st)} How about "${t}"? First step: ${step}`; chips.push({ label: "Start 2 min", act: "start", task: t, step }, { label: "Something else", send: "Something else" }); st.pending = "start"; } else { st.awaiting = "task_say"; reply = fill(vary(st, "ask_start", REPLY.ask_start), st) + " What's one thing you've been putting off?"; chips.push({ label: "Reply to an email", send: "I need to reply to an email" }, { label: "Tidy my desk", send: "I need to tidy my desk" }, { label: "Start my essay", send: "I need to start my essay" }); } break; }
    case "ask_plan": reply = fill(vary(st, "ask_plan", REPLY.ask_plan), st); chips.push({ label: "Open the calendar", act: "plan" }); st.pending = "plan"; break;
    case "ask_break": reply = fill(vary(st, "ask_break", REPLY.ask_break), st); chips.push({ label: "I'm ready, start small", send: "Help me start" }); break;
    case "motivate": { const w = weekStats(); reply = fill(vary(st, "motivate", REPLY.motivate), st) + (w.total > 0 ? ` You've started ${w.total} ${w.total === 1 ? "time" : "times"} so far.` : ""); chips.push({ label: "Start 2 min", send: "Help me start" }); break; }
    case "joke": reply = vary(st, "joke", JOKES); chips.push({ label: "Another", send: "another one" }); break;
    case "chitchat": reply = fill(vary(st, "chitchat", REPLY.chitchat), st); break;
    case "progress": { const w = weekStats(); reply = w.total === 0 ? "No starts yet, and that's fine. Your first one is a two-minute thing." : `This week you started ${w.week} ${w.week === 1 ? "time" : "times"} on ${w.days} ${w.days === 1 ? "day" : "days"}. ${ctx.streak > 1 ? `${ctx.streak} days in a row. ` : ""}${w.week >= 3 ? "That's a real rhythm." : "Every start counts."}`; break; }
    case "task_say": { const t = extractTask(text); if (t) { st.task = t; reply = `Got it: ${t}. Want a two-minute first step?`; chips.push({ label: "Yes, start", act: "start", task: t, step: stepFor(t) }, { label: "Make it smaller", act: "coach", task: t }); st.pending = "start"; } else { st.awaiting = "task_say"; reply = "What's the thing? A few words is enough."; } break; }
    case "deadline": { const t = extractTask(text); if (t) st.task = t; const when = dueWord(text); const step = stepFor(st.task); reply = `${when ? `That's ${when}. ` : ""}Short and steady beats one big push. ${st.task ? `For ${st.task}, a` : "A"} tiny first step: ${step}`; chips.push({ label: "Start 2 min", act: "start", task: st.task ?? "My deadline", step }, { label: "Plan it", act: "plan" }); break; }
    case "yes": if (prevState.pending === "start" && st.task) { reply = "Great. Starting a two-minute timer."; chips.push({ label: "Start 2 min", act: "start", task: st.task, step: stepFor(st.task) }); } else if (prevState.pending === "plan") { reply = "Opening your plan."; chips.push({ label: "Open the calendar", act: "plan" }); } else { reply = "Good. What would you like to start?"; chips.push({ label: "Help me start", send: "Help me start" }, { label: "Plan my day", act: "plan" }); } st.pending = null; break;
    case "no": reply = fill(vary(st, "no", REPLY.no), st); st.pending = null; break;
    case "other": reply = fill(vary(st, "other", REPLY.other), st); chips.push({ label: "Help me start", send: "Help me start" }, { label: "I'm stuck", send: "I don't know where to start" }, { label: "Tell me a joke", send: "Tell me a joke" }); break;
    default: reply = fill(vary(st, act, REPLY[act] ?? REPLY.other), st); if (act === "greet") chips.push({ label: "Help me start", send: "Help me start" }, { label: "I'm stuck", send: "I don't know where to start" }, { label: "Plan my day", act: "plan" });
  }
  st.last = act; return done({ reply, chips, act, conf });
}

/** Replies for the "this is hard" acts, with a concrete first step and a way to act on it. */
function coach(act: Act, st: TalkState, conf: number, done: (t: Omit<Turn, "state">) => Turn): Turn {
  const step = stepFor(st.task); const base = fill(vary(st, act, REPLY[act]), st);
  const extra = act === "tired" ? " If you can, keep it to two minutes." : act === "distract" ? " Put your phone in another room first." : act === "overwhelm" ? " Pick just one thing." : "";
  const reply = `${base}${extra} ${st.task ? `For ${st.task}, a` : "A"} tiny first step: ${step}`;
  st.last = act; st.pending = "start";
  const chips: Chip[] = [{ label: "Start 2 min", act: "start", task: st.task ?? "Something small", step }, { label: "Get unstuck", act: "coach", task: st.task }];
  if (act === "tired") chips.push({ label: "I need a rest", send: "Can I take a break?" });
  return done({ reply, chips, act, conf });
}

export const STORE = "lagomo.talk.v1";
export function loadChat(): { msgs: Msg[]; state: TalkState } { try { const j = JSON.parse(localStorage.getItem(STORE) || "null"); if (j && Array.isArray(j.msgs)) return { msgs: j.msgs.slice(-120), state: { ...emptyState(), ...j.state } }; } catch { /* fall through */ } return { msgs: [], state: emptyState() }; }
export function saveChat(msgs: Msg[], state: TalkState) { try { localStorage.setItem(STORE, JSON.stringify({ msgs: msgs.slice(-120), state })); } catch { /* storage full */ } }
