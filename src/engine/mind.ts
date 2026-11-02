// Mind: validated self-checks and evidence-based exercises. Pure logic only (scoring, bands, advice). Not a diagnosis tool.
// Sources and licences are listed in the "Mind plan" and in each instrument's `credit` line.

export interface Option { v: number; label: string }
export interface Instrument { id: "who5" | "phq9" | "gad7" | "asrs6"; title: string; blurb: string; window: string; items: string[]; options: Option[]; credit: string; adult?: boolean; max: number }

const FREQ4: Option[] = [{ v: 0, label: "Not at all" }, { v: 1, label: "Several days" }, { v: 2, label: "More than half the days" }, { v: 3, label: "Nearly every day" }];
export const INSTRUMENTS: Record<Instrument["id"], Instrument> = {
  who5: {
    id: "who5", title: "Wellbeing (WHO-5)", blurb: "Five quick questions about how the last two weeks felt.", window: "Over the last two weeks",
    items: ["I have felt cheerful and in good spirits", "I have felt calm and relaxed", "I have felt active and vigorous", "I woke up feeling fresh and rested", "My daily life has been filled with things that interest me"],
    options: [{ v: 5, label: "All of the time" }, { v: 4, label: "Most of the time" }, { v: 3, label: "More than half of the time" }, { v: 2, label: "Less than half of the time" }, { v: 1, label: "Some of the time" }, { v: 0, label: "At no time" }],
    credit: "WHO-5 Well-Being Index, World Health Organization (CC BY-NC-SA 3.0 IGO).", max: 25,
  },
  phq9: {
    id: "phq9", title: "Mood (PHQ-9)", blurb: "Nine questions about low mood and energy. Widely used by doctors.", window: "Over the last two weeks, how often have you been bothered by:",
    items: ["Little interest or pleasure in doing things", "Feeling down, depressed, or hopeless", "Trouble falling or staying asleep, or sleeping too much", "Feeling tired or having little energy", "Poor appetite or overeating", "Feeling bad about yourself, or that you are a failure or have let yourself or your family down", "Trouble concentrating on things, such as reading or watching television", "Moving or speaking so slowly that other people could have noticed? Or the opposite: being so fidgety or restless that you have been moving around a lot more than usual", "Thoughts that you would be better off dead, or of hurting yourself in some way"],
    options: FREQ4, credit: "PHQ-9, Spitzer, Williams, Kroenke et al. Free to use without permission.", adult: true, max: 27,
  },
  gad7: {
    id: "gad7", title: "Worry (GAD-7)", blurb: "Seven questions about worry and feeling on edge.", window: "Over the last two weeks, how often have you been bothered by:",
    items: ["Feeling nervous, anxious or on edge", "Not being able to stop or control worrying", "Worrying too much about different things", "Trouble relaxing", "Being so restless that it is hard to sit still", "Becoming easily annoyed or irritable", "Feeling afraid, as if something awful might happen"],
    options: FREQ4, credit: "GAD-7, Spitzer, Kroenke, Williams, Löwe. Free to use without permission.", adult: true, max: 21,
  },
  asrs6: {
    id: "asrs6", title: "Focus and follow-through (ASRS)", blurb: "Six questions about starting, finishing and keeping track.", window: "Over the past 6 months",
    items: ["How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?", "How often do you have difficulty getting things in order when you have to do a task that requires organization?", "How often do you have problems remembering appointments or obligations?", "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?", "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?", "How often do you feel overly active and compelled to do things, like you were driven by a motor?"],
    options: [{ v: 0, label: "Never" }, { v: 1, label: "Rarely" }, { v: 2, label: "Sometimes" }, { v: 3, label: "Often" }, { v: 4, label: "Very often" }],
    credit: "Adult ADHD Self-Report Scale (ASRS-v1.1) Screener. Kessler RC et al., developed with the World Health Organization. Used with attribution, unmodified.", adult: true, max: 6,
  },
};

export interface Result { score: number; band: string; tone: "good" | "ok" | "watch" | "care"; line: string; care: boolean; urgent?: boolean }
const TALK = "If it has felt like this for a while, tell someone you trust, or a doctor or counsellor. A check like this cannot say what is going on, but it can help you start that talk.";

export function scoreWho5(answers: number[]): Result {
  const raw = answers.reduce((a, b) => a + b, 0); const pct = raw * 4;
  if (pct >= 70) return { score: pct, band: "Good", tone: "good", line: "Your last two weeks sound mostly good. Notice what is helping and keep it.", care: false };
  if (pct >= 50) return { score: pct, band: "Okay", tone: "ok", line: "Mixed, which is normal. One small thing that lifts you (try the Pleasure and mastery log) is a good next step.", care: false };
  return { score: pct, band: "Low", tone: "care", line: "Your wellbeing score is lower than the usual cut-off (50). " + TALK, care: true, urgent: pct <= 28 };
}
export function scorePhq9(answers: number[]): Result {
  const s = answers.reduce((a, b) => a + b, 0); const i9 = (answers[8] ?? 0) > 0;
  const [band, tone]: [string, Result["tone"]] = s <= 4 ? ["Minimal", "good"] : s <= 9 ? ["Mild", "ok"] : s <= 14 ? ["Moderate", "watch"] : s <= 19 ? ["Moderately severe", "care"] : ["Severe", "care"];
  const line = s <= 4 ? "Few signs of low mood right now." : s <= 9 ? "Some low mood. Small, planned activities (see Pleasure and mastery) are known to help." : s <= 14 ? "Noticeable low mood. Activity planning can help. " + TALK : "A lot of low mood. Please think about seeing a doctor or counsellor soon. " + TALK;
  return { score: s, band, tone, line, care: s >= 10, urgent: i9 || s >= 20 };
}
export function scoreGad7(answers: number[]): Result {
  const s = answers.reduce((a, b) => a + b, 0);
  const [band, tone]: [string, Result["tone"]] = s <= 4 ? ["Minimal", "good"] : s <= 9 ? ["Mild", "ok"] : s <= 14 ? ["Moderate", "watch"] : ["Severe", "care"];
  const line = s <= 4 ? "Few signs of worry right now." : s <= 9 ? "Some worry. Slow breathing and a scheduled worry time can help." : s <= 14 ? "Noticeable worry. Try the breathing and wind-down tools. " + TALK : "A lot of worry, and it is worth taking seriously. " + TALK;
  return { score: s, band, tone, line, care: s >= 10, urgent: s >= 15 };
}
/** ASRS-v1.1 Part A: items 1 to 3 count at "Sometimes" or more, items 4 to 6 at "Often" or more. 4 or more = worth discussing. */
export function scoreAsrs(answers: number[]): Result {
  const pos = answers.filter((v, i) => (i < 3 ? v >= 2 : v >= 3)).length;
  return pos >= 4
    ? { score: pos, band: "Worth discussing", tone: "watch", line: `${pos} of 6 answers are in the range that professionals look at. This is a screen, not a diagnosis: many things (sleep, stress, low mood) look the same. If these have been a struggle for years, a doctor can look properly. Meanwhile, the Start tools here are built for exactly this.`, care: false }
    : { score: pos, band: "Below the usual cut-off", tone: "ok", line: `${pos} of 6 answers are in the range that professionals look at (4 or more is the usual flag). Everyone struggles to start sometimes. That is what this app is for.`, care: false };
}
export function scoreOf(id: Instrument["id"], a: number[]): Result { return id === "who5" ? scoreWho5(a) : id === "phq9" ? scorePhq9(a) : id === "gad7" ? scoreGad7(a) : scoreAsrs(a); }
export const SUPPORT = "If you might hurt yourself or are in danger, please contact your local emergency number or someone near you right now. findahelpline.com lists free lines by country.";

// ---- NASA-TLX, raw scoring (Hart and Staveland). Six ratings, 0 to 100, averaged. ----
export const TLX_DIMS = [
  { id: "mental", label: "Mental demand", ask: "How much thinking, deciding and remembering did it take?", lo: "Easy", hi: "Heavy" },
  { id: "physical", label: "Physical demand", ask: "How physically demanding was it?", lo: "Light", hi: "Heavy" },
  { id: "temporal", label: "Time pressure", ask: "How hurried or rushed did it feel?", lo: "Relaxed", hi: "Rushed" },
  { id: "performance", label: "How well it went", ask: "How successful were you at what you set out to do?", lo: "Failed", hi: "Perfect" },
  { id: "effort", label: "Effort", ask: "How hard did you have to work to get there?", lo: "Easy", hi: "Very hard" },
  { id: "frustration", label: "Frustration", ask: "How insecure, discouraged, irritated or stressed did you feel?", lo: "Calm", hi: "Very" },
] as const;
export type TlxId = (typeof TLX_DIMS)[number]["id"];
/** Ratings are 0 to 100 on the slider. "How well it went" is flipped so that higher always means a heavier load. */
export function tlxLoads(v: number[]): number[] { return v.map((x, i) => (TLX_DIMS[i].id === "performance" ? 100 - x : x)); }
export const tlxRaw = (v: number[]) => Math.round(tlxLoads(v).reduce((a, b) => a + b, 0) / v.length);
export const tlxBand = (raw: number) => (raw < 35 ? "Light" : raw < 55 ? "Moderate" : raw < 75 ? "Heavy" : "Very heavy");
export interface Advice { id: TlxId; why: string; fix: string; tool: MindView; toolLabel: string }
export type MindView = "home" | "wheel" | "checks" | "tlx" | "woop" | "thoughts" | "pm" | "wind" | "breathe" | "kind" | "report";
const ADVICE: Record<TlxId, Advice> = {
  mental: { id: "mental", why: "It asked a lot of your thinking.", fix: "Get it out of your head: write the next action as one plain sentence and do only that. Park every other decision.", tool: "wind", toolLabel: "Empty your head (Wind-down)" },
  physical: { id: "physical", why: "Your body took the strain.", fix: "Stand, drink water, stretch your neck and hands for one minute before the next round.", tool: "breathe", toolLabel: "One minute of slow breathing" },
  temporal: { id: "temporal", why: "The clock felt like pressure.", fix: "Cut the window: 10 minutes, one piece, stop when the timer ends. Pressure shrinks when the finish line is near.", tool: "woop", toolLabel: "Plan around the obstacle (WOOP)" },
  performance: { id: "performance", why: "It did not feel like it went well.", fix: "Lower the bar on purpose. Aim for an ugly first version, then improve it. Done is a better teacher than perfect.", tool: "kind", toolLabel: "Kind reset" },
  effort: { id: "effort", why: "It took a lot of effort to push through.", fix: "Make starting cheaper: a tiny first step, music or a friend nearby, and a small reward after.", tool: "woop", toolLabel: "Plan around the obstacle (WOOP)" },
  frustration: { id: "frustration", why: "Frustration was the heaviest part.", fix: "Treat the feeling before the task: name the thought behind it, or take a slow minute. Then return.", tool: "thoughts", toolLabel: "Unhook from the thought" },
};
/** The two heaviest loads, with a fix each. */
export function tlxAdvice(v: number[]): Advice[] {
  const loads = tlxLoads(v); return TLX_DIMS.map((d, i) => ({ d: d.id, l: loads[i] })).filter(x => !(x.d === "physical" && x.l < 40)).sort((a, b) => b.l - a.l).slice(0, 2).filter(x => x.l >= 45).map(x => ADVICE[x.d]);
}

// ---- Thought unhooker ----
export const DISTORTIONS = [
  { id: "allnone", label: "All or nothing", hint: "If it is not perfect, it is a failure." },
  { id: "catastrophe", label: "Worst case", hint: "Jumping to the most terrible ending." },
  { id: "mindread", label: "Mind reading", hint: "Assuming you know what others think." },
  { id: "fortune", label: "Fortune telling", hint: "Predicting it will go badly." },
  { id: "should", label: "Should statements", hint: "Rules about how you must be." },
  { id: "label", label: "Labelling", hint: "'I am lazy' instead of 'I did not start'." },
  { id: "feelfact", label: "Feeling = fact", hint: "'I feel stupid, so I am'." },
  { id: "filter", label: "Ignoring the good", hint: "Only the bad parts count." },
  { id: "blame", label: "Taking all the blame", hint: "Everything is my fault." },
  { id: "always", label: "Always and never", hint: "One time becomes every time." },
];
export const DEFUSE = ["Say it with a prefix: \"I'm having the thought that ...\"", "Then: \"I notice I'm having the thought that ...\"", "Thank your mind: \"Thanks, mind, for trying to protect me.\"", "Say it slowly, in a silly voice, or sing it. Notice that it is words.", "Picture it on a cloud or a leaf floating down a stream."];
export const REFRAME_Q = ["What is the evidence for this thought?", "What is the evidence against it?", "What would I say to a friend who thought this?", "What is a fairer, more balanced way to say it?"];

// ---- Pleasure and mastery (behavioural activation) ----
export interface PmEntry { ts: number; what: string; p: number; m: number; before?: number; after?: number; value?: string }
export const VALUES = ["Learning", "Health", "Family", "Friends", "Creativity", "Work I am proud of", "Calm", "Helping others", "Adventure", "Fun", "Independence", "Faith or meaning"];
export function pmRank(es: PmEntry[]) {
  const by = new Map<string, PmEntry[]>(); for (const e of es) { const k = e.what.trim().toLowerCase(); if (k) by.set(k, [...(by.get(k) ?? []), e]); }
  return [...by.values()].map(a => ({ what: a[0].what, n: a.length, p: avg(a.map(x => x.p)), m: avg(a.map(x => x.m)), lift: a.some(x => x.before != null && x.after != null) ? avg(a.filter(x => x.before != null && x.after != null).map(x => x.after! - x.before!)) : null }))
    .sort((x, y) => (y.lift ?? 0) * 2 + y.p + y.m - ((x.lift ?? 0) * 2 + x.p + x.m));
}
export const avg = (a: number[]) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : 0);

// ---- Wellbeing wheel: eight life areas, our own wording (the idea of covering many areas at once, not a clinical measure) ----
export const WHEEL = [
  { id: "sleep", label: "Sleep", ask: "How rested do you feel?", tool: "wind" as MindView },
  { id: "energy", label: "Energy", ask: "How much energy do you have?", tool: "pm" as MindView },
  { id: "mood", label: "Mood", ask: "How good is your mood, mostly?", tool: "pm" as MindView },
  { id: "calm", label: "Calm", ask: "How calm do you feel (low worry)?", tool: "breathe" as MindView },
  { id: "focus", label: "Focus", ask: "How easy is it to concentrate and start?", tool: "woop" as MindView },
  { id: "body", label: "Body", ask: "How does your body feel (aches, movement, food)?", tool: "breathe" as MindView },
  { id: "people", label: "People", ask: "How connected do you feel to others?", tool: "report" as MindView },
  { id: "meaning", label: "Meaning", ask: "How much of your week feels worth it?", tool: "pm" as MindView },
];

// ---- Slow breathing ----
export const BREATHS = {
  sigh: { name: "Cyclic sighing", note: "Two breaths in through the nose (a big one, then a small top-up), then one long slow breath out through the mouth. In a 2023 trial, 5 minutes a day lifted mood more than mindfulness.", steps: [{ t: "In", s: 2 }, { t: "Top up", s: 1 }, { t: "Out slowly", s: 6 }] },
  box: { name: "Box breathing", note: "Equal four-count sides. Calming, and also studied, though the sighing pattern did slightly better.", steps: [{ t: "In", s: 4 }, { t: "Hold", s: 4 }, { t: "Out", s: 4 }, { t: "Hold", s: 4 }] },
} as const;
export const GROUND = ["5 things you can see", "4 things you can feel", "3 things you can hear", "2 things you can smell", "1 thing you can taste, or one slow breath"];

// ---- Daily loop ----
export type Slot = "morning" | "day" | "evening" | "night";
export const slotOf = (d = new Date()): Slot => { const h = d.getHours(); return h >= 5 && h < 11 ? "morning" : h < 17 ? "day" : h < 21 ? "evening" : "night"; };

// ---- What to suggest right now ----
import type { Mind } from "@/store/useMind";
const same = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
export interface Pick { view: MindView; title: string; line: string; cta: string; why: string }
/** One suggestion for this moment, using the time of day and what has (not) been done. `starts` are timestamps of real task starts. */
export function pickMind(m: Mind, starts: number[], now = Date.now()): Pick | null {
  const slot = slotOf(new Date(now)); const last = <T extends { ts: number }>(a: T[]) => a[a.length - 1];
  const lastStart = starts.length ? Math.max(...starts) : 0; const tl = last(m.tlx);
  if (lastStart && now - lastStart < 4 * 36e5 && now - lastStart > 5 * 60e3 && (!tl || tl.ts < lastStart)) return { view: "tlx", title: "How heavy was that?", line: "Rate it in 30 seconds. The heaviest part tells you what would make the next start easier.", cta: "Rate it", why: "NASA Task Load Index" };
  const who = last(m.checks.filter(c => c.id === "who5"));
  if (slot === "morning" && !m.woop.some(w => same(w.ts, now))) return { view: "woop", title: "Plan around the obstacle", line: "One minute: name a wish, the thing most likely to get in the way, and your if-then answer.", cta: "WOOP it", why: "Mental contrasting with if-then plans" };
  if ((slot === "evening" || slot === "night") && !m.wind.some(w => same(w.ts, now))) return { view: "wind", title: "Empty your head for tomorrow", line: "Five minutes writing a specific list helps you fall asleep faster, and sets your first step for tomorrow.", cta: "Wind down", why: "Bedtime to-do list study (Scullin, 2018)" };
  if (!who || now - who.ts > 14 * 864e5) return { view: "checks", title: "Two-minute wellbeing check", line: who ? "It has been two weeks. A quick look at the trend." : "Five questions that show how you have really been. Your baseline starts here.", cta: "Check in", why: "WHO-5 Well-Being Index" };
  if (!m.pm.some(e => same(e.ts, now)) && slot !== "morning") return { view: "pm", title: "One thing that lifts you", line: "Log something small you did. Over time you will see which activities actually raise your mood.", cta: "Log one", why: "Behavioural activation" };
  const w = last(m.wheel); if (!w || now - w.ts > 7 * 864e5) return { view: "wheel", title: "Weekly wellbeing wheel", line: "Eight areas, thirty seconds. See which one needs attention.", cta: "Rate the week", why: "Broad check across life areas" };
  return null;
}
