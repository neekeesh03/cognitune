import { VAR_KEYS, VarKey } from "./model";
import { analyze, TextSignals } from "./text";
import type { Profile } from "./profile";
import { QUESTIONS } from "./prompts";

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
const pick = <T,>(arr: T[], seed: string) => arr[hash(seed) % arr.length];

const ACK: Record<VarKey, { hi: string[]; lo: string[] }> = {
  Primode: { hi: ["You actually got going. That is the hard part, and you did it.", "Starting is where most people get stuck, and you started."], lo: ["That stuck feeling at the starting line is real. It is usually not willpower, the gate just has not opened yet.", "Putting things off is not laziness. Something is blocking the start."] },
  CAP: { hi: ["This clearly matters to you.", "There is real pull behind this one."], lo: ["It sounds like the pull is just not there right now.", "When nothing feels like it matters, that is worth noticing, not fighting."] },
  Flexion: { hi: ["That sounds like a workable fit.", "Good, that sounds like the right size for you."], lo: ["It sounds like the task and your current state do not match right now.", "Maybe the task is too big for today's energy. That can be fixed by resizing it."] },
  Anchory: { hi: ["You sound locked in.", "Nice, that sounds like real focus."], lo: ["Your attention sounds scattered.", "Focus sounds hard to hold today."] },
  Grain: { hi: ["That sounds heavy.", "I hear how much that is weighing on you."], lo: ["You sound lighter today.", "That sounds easier to carry."] },
  Slip: { hi: ["Your mind sounds like it is bouncing around.", "Sounds like things are slipping a bit."], lo: ["Steady is good. Hold on to that.", "That sounds consistent."] },
};

export function crisisReply(): string[] {
  return ["I am really glad you told me. I am not able to help with this the way a person can, and you deserve that support right now.", "Please contact your local emergency number or a crisis line now, or reach someone you trust and stay with them. findahelpline.com lists free lines by country. I will be here after."];
}

export function greeting(name: string, profile: Profile, now = new Date()): string {
  const h = now.getHours(), part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const hi = name ? `${part}, ${name}.` : `${part}.`;
  const loop = profile.openLoops.find(l => now.getTime() - l.ts > 6 * 36e5);
  if (loop) return `${hi} Earlier you said: "${loop.text}" How did that go?`;
  if (profile.wins[0]) return `${hi} I remember this win: "${profile.wins[0].text}" Want to build on it?`;
  return `${hi} How are you arriving today?`;
}

export function reply(text: string, profile: Profile, seed = text): { messages: string[]; signals: TextSignals } {
  const s = analyze(text);
  if (s.crisis) return { messages: crisisReply(), signals: s };
  const out: string[] = [];
  const strongest = (Object.entries(s.hits) as [VarKey, { hi: number; lo: number }][]).sort((a, b) => Math.abs(b[1].hi - b[1].lo) - Math.abs(a[1].hi - a[1].lo))[0];
  let followForce: VarKey | null = null;
  if (strongest) {
    const [k, h] = strongest; const dir = h.hi >= h.lo ? "hi" : "lo";
    out.push(pick(ACK[k][dir], seed + k));
    if ((k === "Primode" || k === "Grain" || k === "Slip") && dir === (k === "Primode" ? "lo" : "hi")) followForce = k; else followForce = k;
  } else if (s.sentiment < -0.3) out.push("That sounds rough. I am glad you said it out loud.");
  else if (s.sentiment > 0.3) out.push("I like hearing that.");
  else out.push(s.words < 6 ? "Tell me a bit more?" : "Thanks for telling me.");
  const extras: string[] = [];
  if (s.wins.length) extras.push(`Noted: "${s.wins[0]}" That counts.`);
  if (s.openLoops.length) extras.push(`I will remember "${s.openLoops[0]}" and ask you about it later.`);
  const target = followForce ?? [...VAR_KEYS].sort((a, b) => profile.observed[a] - profile.observed[b])[0];
  out.push(...extras.slice(0, 1), pick(QUESTIONS[target], seed + "q"));
  return { messages: out, signals: s };
}

/** Tune's smart replies for a message someone sent you. Rule-based, private, on this device. */
export function suggestReplies(text: string, name: string): string[] {
  const s = analyze(text); const first = name.split(" ")[0];
  if (s.crisis) return [];
  const out: string[] = [];
  const h = s.hits;
  if (h.Primode?.lo || h.Grain?.hi) out.push(`That sounds hard, ${first}. Want to do just 10 minutes together?`, `You do not have to do all of it. What is the smallest first step?`);
  if (h.Anchory?.lo || h.Slip?.hi) out.push("Want to try a 25 minute focus session together? Phones away.");
  if (s.wins.length || h.Primode?.hi) out.push("That is great. Proud of you for starting!", "Nice work. What are you doing next?");
  if (s.sentiment < -0.3) out.push("I am here. Want to talk it through?");
  if (/\?/.test(text)) out.push("Good question. Let me think and get back to you.");
  out.push("Thanks for telling me.", "How can I help?");
  return [...new Set(out)].slice(0, 3);
}
const ROOM_PROMPTS = [
  (a: string, b: string) => `Tune here. ${a} and ${b}, what is one small thing each of you will start in the next hour?`,
  (a: string, b: string) => `Tune here. Quick check-in: ${a} and ${b}, rate your energy from 1 to 5 and say why.`,
  (a: string, b: string) => `Tune here. Want to work side by side for 25 minutes? Tap "Focus together".`,
  (a: string, b: string) => `Tune here. ${a} and ${b}, share one win from this week, however tiny.`,
  (a: string, b: string) => `Tune here. What is one thing that is making starting harder today? Say it out loud to each other.`,
];
export const tuneRoomPrompt = (me: string, other: string, seed: number) => ROOM_PROMPTS[seed % ROOM_PROMPTS.length](me || "you", other);
