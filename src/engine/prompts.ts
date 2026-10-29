import { VAR_KEYS, VarKey } from "./model";
import type { Profile } from "./profile";

export interface Prompt { id: string; text: string; force?: VarKey; slot: "morning" | "evening" | "any" }
const P = (id: string, text: string, force?: VarKey, slot: Prompt["slot"] = "any"): Prompt => ({ id, text, force, slot });
export const PROMPTS: Prompt[] = [
  P("m1", "What is the one thing that would make today feel worthwhile? Describe the very first move.", "Primode", "morning"),
  P("m2", "How does your body and mind feel right now, before the day starts?", "Grain", "morning"),
  P("m3", "What are you putting off, and what is the smallest honest version of starting it?", "Primode", "morning"),
  P("m4", "Which task today feels like a good fit for your energy, and which does not?", "Flexion", "morning"),
  P("m5", "What is likely to pull your attention away today, and how will you handle it?", "Anchory", "morning"),
  P("m6", "Write down everything circling in your head. Do not organise it.", "Slip", "morning"),
  P("e1", "What did you actually start today, however small?", "Primode", "evening"),
  P("e2", "When did you feel most focused today? What was around you?", "Anchory", "evening"),
  P("e3", "What felt heavy today, and what made it heavy?", "Grain", "evening"),
  P("e4", "What is still open in your mind that you could close tomorrow?", "Slip", "evening"),
  P("e5", "What went better than you expected?", undefined, "evening"),
  P("e6", "Who or what helped you today? Say thanks in a sentence.", undefined, "evening"),
  P("i1", "What did you start today, and what got in the way of starting the rest?", "Primode"),
  P("i2", "Why does the task you are avoiding matter to you? Be specific.", "CAP"),
  P("i3", "What would you do if the deadline were tonight?", "CAP"),
  P("i4", "Who benefits if you finish the thing you care about most?", "CAP"),
  P("i5", "What would make your current task smaller or clearer?", "Flexion"),
  P("i6", "Where did you feel out of your depth recently? What would help?", "Flexion"),
  P("i7", "Describe a time you felt locked in. What conditions made it possible?", "Anchory"),
  P("i8", "What do you reach for when you lose focus? What is it giving you?", "Anchory"),
  P("i9", "What is the stickiest part of the thing you are avoiding?", "Grain"),
  P("i10", "What emotion shows up right before you put something off?", "Grain"),
  P("i11", "Where did your mind wander today, and was it running from something?", "Slip"),
  P("i12", "What did you forget or lose track of this week? What does that tell you?", "Slip"),
  P("i13", "What is one small thing you are proud of this week?", undefined),
  P("i14", "Finish the sentence: I would start more easily if...", "Primode"),
  P("i15", "What do you expect of yourself that might be unfair right now?", "Grain"),
  P("i16", "What is one thing you can stop carrying around today?", "Grain"),
];
const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Daily prompt: time of day picks morning/evening set; midday targets the force the person has shared least about. */
export function promptFor(profile: Profile, shuffle = 0, now = new Date()): Prompt {
  const h = now.getHours(), slot = h < 11 ? "morning" : h >= 18 ? "evening" : "any";
  const weakest = [...VAR_KEYS].sort((a, b) => profile.observed[a] - profile.observed[b])[0];
  const pool = slot === "any"
    ? PROMPTS.filter(p => p.slot === "any" && (!p.force || p.force === weakest || shuffle > 0))
    : PROMPTS.filter(p => p.slot === slot);
  const list = pool.length ? pool : PROMPTS;
  return list[(hash(dayKey(now)) + shuffle) % list.length];
}
export const QUESTIONS: Record<VarKey, string[]> = {
  Primode: ["What would the first 30 seconds of it look like?", "If you had to begin in two minutes, what would you open first?"],
  CAP: ["Why does this one matter to you?", "What happens if it stays untouched this week?"],
  Flexion: ["Does it feel like the right size for you today?", "What part of it feels like a mismatch?"],
  Anchory: ["What keeps pulling you away from it?", "When did you last stay with something for a full stretch?"],
  Grain: ["What part of it feels stickiest?", "How heavy is it, honestly?"],
  Slip: ["Where does your mind go when it drifts?", "What is circling around in your head right now?"],
};
