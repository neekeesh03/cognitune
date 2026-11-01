// Talk: the rabbit's own conversation engine. No outside AI, no internet call.
// A 9,986-parameter neural network (tools/talk/train.mjs) reads each message together with what was said before and picks
// one of 26 conversation acts. A small dialogue manager then answers from written replies, fills in your task, and offers
// next steps. Below 50% sure it asks instead of guessing. Chats stay on this device.
import { analyze } from "@/engine/text";
import { SAFETY_TEXT, looksUnsafe } from "@/engine/coachNlu";
import { suggestSteps } from "@/engine/plan";
import { loadLog } from "@/lib/startlog";
import { dayKeyOf } from "@/engine/pattern";
import { petNow } from "@/lib/pet";
import { tomorrowStep } from "@/engine/director";
import { directorOn } from "@/lib/arm";

export type Act = "greet" | "thanks" | "bye" | "howru" | "who_help" | "unclear" | "big" | "boring" | "scared" | "tired" | "distract" | "overwhelm" | "low" | "win" | "ask_start" | "ask_plan" | "ask_break" | "motivate" | "joke" | "chitchat" | "yes" | "no" | "task_say" | "progress" | "deadline" | "other";
export interface Chip { label: string; send?: string; act?: "start" | "coach" | "plan" | "circle"; task?: string; step?: string }
export interface Msg { id: string; from: "me" | "pip"; text: string; ts: number; chips?: Chip[]; act?: Act; conf?: number }
export interface TalkState { last: Act | ""; task?: string; awaiting?: Act | null; pending?: "start" | "plan" | null; lowRun: number; used: Record<string, number>; turns: number }
export const emptyState = (): TalkState => ({ last: "", lowRun: 0, used: {}, turns: 0 });

interface Model { labels: Act[]; B: number; D: number; DC: number; H: number; K: number; E: number[]; C: number[]; W1: number[]; b1: number[]; W2: number[]; b2: number[]; threshold: number; params: number }
let cache: Promise<Model> | null = null;
const load = () => (cache ??= import("@/engine/talkModel.json").then(x => (x.default ?? x) as unknown as Model));
export const MODEL_PARAMS = 9986;

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const tok = (t: string) => t.toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
function feats(text: string, B: number): [number, number][] {
  const w = tok(text); const out: string[] = [];
  for (const x of w) { out.push("w:" + x); const p = "^" + x + "$"; for (let i = 0; i + 3 <= p.length; i++) out.push("c:" + p.slice(i, i + 3)); }
  for (let i = 0; i + 1 < w.length; i++) out.push("b:" + w[i] + "_" + w[i + 1]);
  for (let i = 0; i + 1 < w.length; i++) if (["not", "dont", "never", "cant", "no", "nothing"].includes(w[i])) out.push("n:" + w[i + 1]);
  return out.map(f => { const h = hash(f); return [h % B, ((h >>> 20) & 1) ? 1 : -1] as [number, number]; });
}
export interface Reading { top: { act: Act; p: number }[]; confident: boolean }
/** Run the network. `prev` is the act of the previous turn. */
export async function readAct(text: string, prev: Act | ""): Promise<Reading> {
  const m = await load(); const { B, D, DC, H, K } = m; const f = feats(text, B);
  const x = new Array(D).fill(0); for (const [b, s] of f) for (let d = 0; d < D; d++) x[d] += s * m.E[b * D + d];
  const sc = f.length ? 1 / Math.sqrt(f.length) : 0; const pi = prev === "" ? K : m.labels.indexOf(prev);
  const inp = [...x.map(v => v * sc), ...m.C.slice(pi * DC, pi * DC + DC)];
  const h = new Array(H).fill(0).map((_, j) => { let z = m.b1[j]; for (let i = 0; i < D + DC; i++) z += inp[i] * m.W1[i * H + j]; return Math.tanh(z); });
  const z = new Array(K).fill(0).map((_, k) => { let a = m.b2[k]; for (let j = 0; j < H; j++) a += h[j] * m.W2[j * K + k]; return a; });
  const mx = Math.max(...z); const e = z.map(v => Math.exp(v - mx)); const s = e.reduce((a, b) => a + b, 0);
  const top = e.map((v, i) => ({ act: m.labels[i], p: v / s })).sort((a, b) => b.p - a.p).slice(0, 3);
  return { top, confident: top[0].p >= m.threshold };
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
/** A variant not used recently for this act. */
function vary(st: TalkState, key: string, a: string[]): string {
  const last = st.used[key]; let i = Math.floor(Math.random() * a.length); if (a.length > 1 && i === last) i = (i + 1) % a.length; st.used[key] = i; return a[i];
}
const REPLY: Record<string, string[]> = {
  greet: ["Hi {me}! I'm {pet}. What's on your mind today?", "Hey {me}. Good to see you. Want to start something small, or just talk?", "Hello! {pet} here. What would help right now?"],
  thanks: ["Any time. You did the hard part by showing up.", "Happy to. Want to keep going, or take a breather?", "You're welcome. I'm glad it helped."],
  bye: ["Take care, {me}. I'll be here whenever you want to start something.", "See you soon. Rest well.", "Bye for now. One small start tomorrow is plenty."],
  howru: ["I'm doing well, thanks for asking. I'm an AI, so my day is mostly waiting for you. How are you?", "Cheerful. I'm a rabbit made of maths, and I like it when you drop by. How about you?"],
  who_help: ["I'm {pet}, a small AI that lives in this app. I can help you start things, break tasks down, plan your day, and keep you company. I run on your device and what you tell me stays here.", "I'm {pet}. I'm not a person. I'm a tiny model, about ten thousand numbers, trained to help you get started. Chats stay on this device."],
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
  other: ["I'm not sure I can help with that. I'm best at helping you start things and keeping you company. Want to try one of these?", "That one is outside what I know. I'm good at starting things, breaking tasks down and keeping you company. Want to try one?", "I can't help with that, but I can help you get going on something. Pick one?"],
};
const JOKES = ["Why did the rabbit start the task? It was tired of just hopping around it.", "What do you call a rabbit that finishes homework early? A hare of the dog... no, a hare ahead.", "Why don't procrastinators ever get lost? They never leave.", "I told my to-do list a joke. It didn't finish it either.", "What's a rabbit's favorite exercise? Hip hop.", "Why did the student put the clock in the freezer? To save time."];
const fill = (s: string, st: TalkState) => s.replace(/\{pet\}/g, petNow().name).replace(/\{me\}/g, myName()).replace(/\{task\}/g, st.task ?? "it");
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
const LABEL: Partial<Record<Act, string>> = { unclear: "I don't know where to start", big: "It feels too big", boring: "It's boring", scared: "I'm afraid of doing it badly", tired: "I'm tired", distract: "I keep getting distracted", overwhelm: "I'm overwhelmed", low: "I'm feeling low", ask_start: "Help me start", ask_plan: "Plan my day", motivate: "I need a push", joke: "Tell me a joke", progress: "How am I doing?", win: "I did something", chitchat: "Let's chat", who_help: "What can you do?", task_say: "I'm avoiding something", deadline: "I have a deadline" };

function weekStats() {
  const now = Date.now(); const S = loadLog().starts.filter(s => s.ts <= now); const wk = S.filter(s => now - s.ts < 7 * 864e5);
  return { total: S.length, week: wk.length, days: new Set(wk.map(s => dayKeyOf(s.ts))).size };
}
export interface Ctx { tasks: { title: string; step?: string }[]; streak: number }
export interface Turn { reply: string; chips: Chip[]; act: Act; conf: number; state: TalkState }

/** One turn of conversation. Pure apart from reading the start log. */
export async function respond(text: string, prevState: TalkState, ctx: Ctx): Promise<Turn> {
  const st: TalkState = { ...prevState, used: { ...prevState.used }, turns: prevState.turns + 1 };
  if (looksUnsafe(text) || analyze(text).crisis) { st.last = "low"; st.awaiting = null; return { reply: SAFETY_TEXT, chips: [{ label: "Talk to a friend", act: "circle" }], act: "low", conf: 1, state: st }; }
  const rd = await readAct(text, prevState.last); let act = rd.top[0].act; const conf = rd.top[0].p;
  // after we asked "which thing is it?", a short answer is the task
  if (prevState.awaiting && text.trim().length <= 70 && !(rd.confident && ["greet", "bye", "no", "thanks", "low"].includes(act))) {
    const task = extractTask(text) ?? text.trim().replace(/[.!?]+$/g, "").slice(0, 40); st.task = task; const a = prevState.awaiting; st.awaiting = null; return coach(a, st, text, conf);
  }
  if (!rd.confident && !(act === "yes" || act === "no")) {
    const [a, b] = rd.top; const opts = [a.act, b.act].filter(x => LABEL[x]) as Act[]; st.last = "other";
    if (opts.length && a.p >= 0.25) return { reply: vary(st, "unsure", ["I want to get this right. Which is closest?", "I'm not fully sure what you mean. Is it one of these?"]), chips: opts.slice(0, 2).map(o => ({ label: LABEL[o]!, send: LABEL[o]! })), act: "other", conf, state: st };
    act = "other";
  }
  if (act !== "low") st.lowRun = 0;
  if (["unclear", "big", "boring", "scared"].includes(act)) { const t = extractTask(text); if (t) st.task = t; if (!st.task) { st.awaiting = act; st.last = act; return { reply: fill(vary(st, act, REPLY[act]), st) + " Which thing is it?", chips: ctx.tasks.slice(0, 2).map(t => ({ label: t.title, send: t.title })), act, conf, state: st }; } return coach(act, st, text, conf); }
  if (["tired", "distract", "overwhelm"].includes(act)) { const t = extractTask(text); if (t) st.task = t; return coach(act, st, text, conf); }
  st.awaiting = null;
  const chips: Chip[] = []; let reply = "";
  switch (act) {
    case "low": { st.lowRun += 1; reply = fill(vary(st, "low", REPLY.low), st) + (st.lowRun >= 2 ? " If it keeps feeling this heavy, talking to someone you trust can help. findahelpline.com lists free lines by country." : " Do you want to talk about it, or just sit for a minute?"); chips.push({ label: "Talk to a friend", act: "circle" }, { label: "Just sit for a minute", send: "I just want to sit for a minute" }); break; }
    case "win": reply = fill(vary(st, "win", REPLY.win), st); chips.push({ label: "Start another small one", send: "Help me start" }, { label: "Plan my day", act: "plan" }); break;
    case "ask_start": { const tm = directorOn() ? tomorrowStep() : null; const t = tm?.task ?? ctx.tasks[0]?.title ?? st.task; if (t) { st.task = t; const step = tm ? tm.step ?? stepFor(t) : ctx.tasks[0]?.step ?? stepFor(t); reply = `${fill(vary(st, "ask_start", REPLY.ask_start), st)} How about "${t}"? First step: ${step}`; chips.push({ label: "Start 2 min", act: "start", task: t, step }, { label: "Something else", send: "Something else" }); st.pending = "start"; } else { st.awaiting = "task_say"; reply = fill(vary(st, "ask_start", REPLY.ask_start), st) + " What's one thing you've been putting off?"; } break; }
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
    case "other": reply = fill(vary(st, "other", REPLY.other), st); chips.push({ label: "Help me start", send: "Help me start" }, { label: "I'm stuck", send: "I'm stuck" }, { label: "Tell me a joke", send: "Tell me a joke" }); break;
    default: reply = fill(vary(st, act, REPLY[act] ?? REPLY.other), st); if (act === "greet") chips.push({ label: "Help me start", send: "Help me start" }, { label: "I'm stuck", send: "I'm stuck" }, { label: "Plan my day", act: "plan" });
  }
  st.last = act; return { reply, chips, act, conf, state: st };
}

/** Replies for the "this is hard" acts, with a concrete first step and a way to act on it. */
function coach(act: Act, st: TalkState, text: string, conf: number): Turn {
  const step = stepFor(st.task); const base = fill(vary(st, act, REPLY[act]), st);
  const extra = act === "tired" ? " If you can, keep it to two minutes." : act === "distract" ? " Put your phone in another room first." : act === "overwhelm" ? " Pick just one thing." : "";
  const reply = `${base}${extra} ${st.task ? `For ${st.task}, a` : "A"} tiny first step: ${step}`;
  st.last = act; st.pending = "start";
  const chips: Chip[] = [{ label: "Start 2 min", act: "start", task: st.task ?? "Something small", step }, { label: "Get unstuck", act: "coach", task: st.task }];
  if (act === "tired") chips.push({ label: "I need a rest", send: "Can I take a break?" });
  void text; return { reply, chips, act, conf, state: st };
}

export const STORE = "lagomo.talk.v1";
export function loadChat(): { msgs: Msg[]; state: TalkState } { try { const j = JSON.parse(localStorage.getItem(STORE) || "null"); if (j && Array.isArray(j.msgs)) return { msgs: j.msgs.slice(-120), state: { ...emptyState(), ...j.state } }; } catch { /* fall through */ } return { msgs: [], state: emptyState() }; }
export function saveChat(msgs: Msg[], state: TalkState) { try { localStorage.setItem(STORE, JSON.stringify({ msgs: msgs.slice(-120), state })); } catch { /* storage full */ } }
