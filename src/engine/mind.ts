// Mind: validated self-checks and evidence-based exercises. Pure logic only (scoring, bands, advice). Not a diagnosis tool.
// Sources and licences are listed in the "Mind plan" and in each instrument's `credit` line.

export interface Option { v: number; label: string }
export type InstId = "who5" | "phq9" | "gad7" | "asrs6" | "k6" | "cbi" | "lone3" | "rses" | "ipipc";
export interface Instrument { id: InstId; title: string; blurb: string; window: string; items: string[]; options: Option[]; credit: string; adult?: boolean; max: number }

const FREQ4: Option[] = [{ v: 0, label: "Not at all" }, { v: 1, label: "Several days" }, { v: 2, label: "More than half the days" }, { v: 3, label: "Nearly every day" }];
export const INSTRUMENTS: Record<InstId, Instrument> = {
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
  k6: {
    id: "k6", title: "Stress and distress (K6)", blurb: "Six quick questions about the past month.", window: "During the past 30 days, about how often did you feel:",
    items: ["Nervous", "Hopeless", "Restless or fidgety", "So depressed that nothing could cheer you up", "That everything was an effort", "Worthless"],
    options: [{ v: 0, label: "None of the time" }, { v: 1, label: "A little of the time" }, { v: 2, label: "Some of the time" }, { v: 3, label: "Most of the time" }, { v: 4, label: "All of the time" }],
    credit: "Kessler K6 (Kessler et al., 2002). Free to use without permission, with attribution.", adult: true, max: 24,
  },
  cbi: {
    id: "cbi", title: "Tiredness and burnout (CBI)", blurb: "Six questions on how worn out you feel.", window: "Thinking about the past few weeks:",
    items: ["How often do you feel tired?", "How often are you physically exhausted?", "How often are you emotionally exhausted?", "How often do you think: \"I can't take it anymore\"?", "How often do you feel worn out?", "How often do you feel weak and susceptible to illness?"],
    options: [{ v: 100, label: "Always" }, { v: 75, label: "Often" }, { v: 50, label: "Sometimes" }, { v: 25, label: "Seldom" }, { v: 0, label: "Never or almost never" }],
    credit: "Copenhagen Burnout Inventory, personal burnout scale (Kristensen et al., 2005). Free to use with the source cited.", adult: true, max: 100,
  },
  lone3: {
    id: "lone3", title: "Connection (3 questions)", blurb: "Three questions about feeling connected to people.", window: "",
    items: ["How often do you feel that you lack companionship?", "How often do you feel left out?", "How often do you feel isolated from others?"],
    options: [{ v: 1, label: "Hardly ever" }, { v: 2, label: "Some of the time" }, { v: 3, label: "Often" }], credit: "Three-Item Loneliness Scale (Hughes et al., 2004). Not a copyrighted scale.", max: 9,
  },
  rses: {
    id: "rses", title: "Self-worth (Rosenberg)", blurb: "Ten statements about how you see yourself.", window: "How much do you agree?",
    items: ["On the whole, I am satisfied with myself.", "At times, I think I am no good at all.", "I feel that I have a number of good qualities.", "I am able to do things as well as most other people.", "I feel I do not have much to be proud of.", "I certainly feel useless at times.", "I feel that I'm a person of worth, at least on an equal plane with others.", "I wish I could have more respect for myself.", "All in all, I am inclined to feel that I am a failure.", "I take a positive attitude toward myself."],
    options: [{ v: 3, label: "Strongly agree" }, { v: 2, label: "Agree" }, { v: 1, label: "Disagree" }, { v: 0, label: "Strongly disagree" }],
    credit: "Rosenberg Self-Esteem Scale (Rosenberg, 1965). In the public domain.", max: 30,
  },
  ipipc: {
    id: "ipipc", title: "Your start style (organisation)", blurb: "Ten statements about how you organise and follow through. No right answers.", window: "Describe yourself as you generally are now:",
    items: ["I am always prepared.", "I leave my belongings around.", "I pay attention to details.", "I make a mess of things.", "I get chores done right away.", "I often forget to put things back in their proper place.", "I like order.", "I shirk my duties.", "I follow a schedule.", "I am exacting in my work."],
    options: [{ v: 5, label: "Very accurate" }, { v: 4, label: "Moderately accurate" }, { v: 3, label: "Neither" }, { v: 2, label: "Moderately inaccurate" }, { v: 1, label: "Very inaccurate" }],
    credit: "Conscientiousness items from the International Personality Item Pool (ipip.ori.org), public domain.", max: 50,
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
export function scoreK6(a: number[]): Result {
  const s = a.reduce((x, y) => x + y, 0);
  return s >= 13 ? { score: s, band: "High", tone: "care", line: "A score of 13 or more is the usual flag for serious psychological distress. This is a screen, not a diagnosis. " + TALK, care: true, urgent: s >= 19 }
    : s >= 8 ? { score: s, band: "Raised", tone: "watch", line: "Some distress over the past month. The breathing, Wind-down and Pleasure and mastery tools are good places to start.", care: false }
    : { score: s, band: "Low", tone: "good", line: "Little distress over the past month.", care: false };
}
export function scoreCbi(a: number[]): Result {
  const s = Math.round(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length));
  return s >= 75 ? { score: s, band: "Very tired", tone: "care", line: "You are running very low. Rest is not a reward here, it is the task. Protect sleep, drop one thing this week, and tell someone. " + TALK, care: true }
    : s >= 50 ? { score: s, band: "Worn down", tone: "watch", line: "You are carrying a lot of tiredness. Check the Sleep diary and Task load tools, and plan one real break.", care: false }
    : { score: s, band: "Okay", tone: "good", line: "Tiredness looks manageable right now. There is no official cut-off, so watch the trend over time.", care: false };
}
export function scoreLone3(a: number[]): Result {
  const s = a.reduce((x, y) => x + y, 0);
  return s >= 6 ? { score: s, band: "Often lonely", tone: "watch", line: "You often feel disconnected. That is common and it can change. One small reach-out helps more than you expect: people underestimate how much others value hearing from them. Try starting something with a friend.", care: false }
    : { score: s, band: "Mostly connected", tone: "good", line: "You mostly feel connected. Keep the people you care about in your week.", care: false };
}
const RSES_REV = [1, 4, 5, 7, 8];
export function scoreRses(a: number[]): Result {
  const s = a.reduce((x, v, i) => x + (RSES_REV.includes(i) ? 3 - v : v), 0);
  return { score: s, band: s >= 15 ? "Steady" : "Tender", tone: s >= 15 ? "ok" : "watch", line: "Scores run from 0 to 30 and there are no official cut-offs, so the useful comparison is with your own earlier score. " + (s < 15 ? "Being hard on yourself makes starting harder. The Kind reset and Thought unhooker are built for this. If it feels heavy most days, " + TALK : "Notice what supports this and keep it."), care: false };
}
const IPIP_REV = [1, 3, 5, 7];
export function scoreIpipc(a: number[]): Result {
  const s = a.reduce((x, v, i) => x + (IPIP_REV.includes(i) ? 6 - v : v), 0);
  const band = s >= 36 ? "Planner" : s >= 25 ? "Mixed" : "Flexible";
  const line = s >= 36 ? "You like order and plans. Strengths: reliability. Watch for: waiting until it is perfect before starting. The Good-enough test and 2-minute starts help." : s >= 25 ? "You mix structure with flexibility. Use structure where it matters (deadlines) and stay loose elsewhere." : "You run on flexibility and the moment. Strengths: adaptability. Watch for: things slipping. External structure helps you: Park my place, WOOP and the Wind-down list do the remembering so your head does not have to.";
  return { score: s, band, tone: "ok", line: line + " This describes a style, not a ranking: there is no right score.", care: false };
}
export function scoreOf(id: InstId, a: number[]): Result { return id === "who5" ? scoreWho5(a) : id === "phq9" ? scorePhq9(a) : id === "gad7" ? scoreGad7(a) : id === "asrs6" ? scoreAsrs(a) : id === "k6" ? scoreK6(a) : id === "cbi" ? scoreCbi(a) : id === "lone3" ? scoreLone3(a) : id === "rses" ? scoreRses(a) : scoreIpipc(a); }
/** How a result is written on a card. */
export const fmtScore = (id: InstId, r: Result) => (id === "who5" ? `${r.score}%` : id === "asrs6" ? `${r.score} of 6` : id === "cbi" ? `${r.score}/100` : `${r.score} of ${INSTRUMENTS[id].max}`);
/** The point on a trend line (WHO-5 is stored as its raw 0 to 25 score). */
export const trendValue = (id: InstId, stored: number) => (id === "who5" ? stored * 4 : stored);
/** Instruments where a lower score is better (for the colour of the trend line). */
export const lowerIsBetter = (id: InstId) => id !== "who5" && id !== "rses" && id !== "ipipc";
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
export type MindView = "home" | "wheel" | "checks" | "tlx" | "woop" | "thoughts" | "pm" | "wind" | "breathe" | "kind" | "report" | "sleep" | "compass" | "exp" | "ladder" | "why" | "bundle" | "good" | "urge" | "review" | "pulse" | "data" | "skills" | "anger" | "phone" | "anchor" | "ledger" | "reach" | "kindness" | "letter" | "window" | "insights" | "deck" | "guess" | "feel" | "worry" | "loop" | "enough" | "exam" | "brk" | "park" | "trial" | "moodmap" | "focustap" | "holdback" | "recall" | "quiet" | "heart" | "hand" | "eyes";
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
export function pickMindAll(m: Mind, starts: number[], now = Date.now()): Pick[] {
  const out: Pick[] = [];
  const slot = slotOf(new Date(now)); const last = <T extends { ts: number }>(a: T[]) => a[a.length - 1];
  const lastStart = starts.length ? Math.max(...starts) : 0; const tl = last(m.tlx);
  if (lastStart && now - lastStart < 4 * 36e5 && now - lastStart > 5 * 60e3 && (!tl || tl.ts < lastStart)) out.push({ view: "tlx", title: "How heavy was that?", line: "Rate it in 30 seconds. The heaviest part tells you what would make the next start easier.", cta: "Rate it", why: "NASA Task Load Index" });
  const who = last(m.checks.filter(c => c.id === "who5"));
  if (slot === "morning" && !(m.sleep ?? []).some(s => same(s.ts, now))) out.push({ view: "sleep", title: "Log last night's sleep", line: "Thirty seconds. After a week you will see what your sleep really looks like, and one thing to change.", cta: "Log sleep", why: "Sleep diary (core of CBT for insomnia)" });
  if (slot === "morning" && !m.woop.some(w => same(w.ts, now))) out.push({ view: "woop", title: "Plan around the obstacle", line: "One minute: name a wish, the thing most likely to get in the way, and your if-then answer.", cta: "WOOP it", why: "Mental contrasting with if-then plans" });
  if (slot === "night" && m.wind.some(w => same(w.ts, now)) && !(m.good ?? []).some(g => same(g.ts, now))) out.push({ view: "good", title: "Three good things", line: "Name three things that went okay today, and why. A small, steady way to lift mood.", cta: "Name them", why: "Positive psychology (modest, steady effect)" });
  const dueN = (m.deck ?? []).filter(c => c.seen > 0 && c.due <= now).length + Math.min(5, (m.deck ?? []).filter(c => c.seen === 0).length); if (dueN > 0 && slot !== "night" && !(m.deckLog ?? []).some(d => same(d.ts, now))) out.push({ view: "deck", title: `${Math.min(dueN, 12)} card${dueN > 1 ? "s" : ""} to recall`, line: "Two minutes of self-testing. This is the study method with the strongest evidence.", cta: "Recall", why: "Spaced retrieval practice (g = 0.74)" });
  if ((slot === "evening" || slot === "night") && !m.wind.some(w => same(w.ts, now))) out.push({ view: "wind", title: "Empty your head for tomorrow", line: "Five minutes writing a specific list helps you fall asleep faster, and sets your first step for tomorrow.", cta: "Wind down", why: "Bedtime to-do list study (Scullin, 2018)" });
  const rv = last(m.reviews ?? []); if (new Date(now).getDay() === 0 && (!rv || now - rv.ts > 5 * 864e5)) out.push({ view: "review", title: "Weekly review", line: "Three minutes: what worked, what was hard, and one focus for next week.", cta: "Review", why: "Reflection and planning" });
  if (slot === "day" && !(m.pulse ?? []).some(p => now - p.ts < 4 * 36e5) && (m.pulse ?? []).length < 60) out.push({ view: "moodmap", title: "Mood map", line: "One tap on a picture, no questions. It builds your own energy map by time of day.", cta: "Tap in", why: "Experience sampling" });
  if (!who || now - who.ts > 14 * 864e5) out.push({ view: "checks", title: "Two-minute wellbeing check", line: who ? "It has been two weeks. A quick look at the trend." : "Five questions that show how you have really been. Your baseline starts here.", cta: "Check in", why: "WHO-5 Well-Being Index" });
  if (!m.pm.some(e => same(e.ts, now)) && slot !== "morning") out.push({ view: "pm", title: "One thing that lifts you", line: "Log something small you did. Over time you will see which activities actually raise your mood.", cta: "Log one", why: "Behavioural activation" });
  const w = last(m.wheel); if (!w || now - w.ts > 7 * 864e5) out.push({ view: "wheel", title: "Weekly wellbeing wheel", line: "Eight areas, thirty seconds. See which one needs attention.", cta: "Rate the week", why: "Broad check across life areas" });
  return out;
}
export const pickMind = (m: Mind, starts: number[], now = Date.now()): Pick | null => pickMindAll(m, starts, now)[0] ?? null;

// ---- Sleep diary (CBT-I basics) ----
export interface SleepNight { ts: number; day: string; bed: number; latency: number; awake: number; wake: number; up: number; q: number }
const span = (a: number, b: number) => (b - a + 1440) % 1440;
export const clock = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(Math.round(min) % 60).padStart(2, "0")}`;
export const parseClock = (s: string) => { const [h, mm] = s.split(":").map(Number); return (h || 0) * 60 + (mm || 0); };
/** Time in bed, time asleep and efficiency from one night's diary (all minutes). */
export function sleepNight(n: SleepNight) {
  const tib = span(n.bed, n.up); const tst = Math.max(0, span(n.bed, n.wake) - n.latency - n.awake); const se = tib > 0 ? Math.min(100, Math.round((tst / tib) * 100)) : 0; return { tib, tst, se };
}
export function sleepSummary(ns: SleepNight[]) {
  const l = ns.slice(-7); if (!l.length) return null; const st = l.map(sleepNight); const wakes = l.map(n => n.wake);
  const ref = wakes[0]; const dev = wakes.map(w => ((w - ref + 720 + 1440) % 1440) - 720); const mean = dev.reduce((a, b) => a + b, 0) / dev.length; const sd = Math.round(Math.sqrt(dev.reduce((a, b) => a + (b - mean) ** 2, 0) / dev.length));
  return { n: l.length, tst: avg(st.map(s => s.tst / 60)), se: Math.round(st.reduce((a, s) => a + s.se, 0) / st.length), wakeSd: sd, latency: Math.round(l.reduce((a, n) => a + n.latency, 0) / l.length), q: avg(l.map(n => n.q)) };
}
export function sleepAdvice(s: NonNullable<ReturnType<typeof sleepSummary>>): string[] {
  const out: string[] = [];
  if (s.n < 3) return ["Log a few more nights. Patterns show up after about a week."];
  if (s.wakeSd > 45) out.push("Your wake-up time varies by about " + s.wakeSd + " minutes. Pick one wake-up time and keep it every day, including weekends. It is the strongest single lever for body-clock rhythm.");
  if (s.se < 85) out.push("You spend a lot of bed time awake (efficiency " + s.se + "%). Go to bed only when sleepy. If you are awake for what feels like 20 minutes, get up, do something quiet in dim light, and return when sleepy. Keep the bed for sleep.");
  if (s.latency > 30) out.push("It takes you about " + s.latency + " minutes to fall asleep. Try the Wind-down list earlier in the evening and slow breathing in bed.");
  if (s.tst < 6) out.push("You average " + s.tst + " hours of sleep. Protect a longer window, and keep naps short and before mid-afternoon.");
  if (!out.length) out.push("Your diary looks steady. Keep the same wake-up time and notice what helps.");
  out.push("If poor sleep has lasted more than about three months, or it is hurting your days, please see a doctor. Do not restrict your sleep on your own without guidance.");
  return out;
}

// ---- Why am I avoiding it? (Temporal Motivation Theory, Steel and Koenig 2006) ----
export interface Tmt { e: number; v: number; d: number; i: number }
/** Motivation share: (expectancy x value) against (impulsiveness x delay). 50 means the pulls are even. A framework, not a validated test. */
export const tmtIndex = (t: Tmt) => { const up = Math.max(0.5, t.e) * Math.max(0.5, t.v), down = Math.max(0.5, t.i) * Math.max(0.5, t.d); return Math.round((100 * up) / (up + down)); };
export const TMT_LEVERS = {
  e: { name: "Confidence", fix: "Make the first step so small it is almost silly (2 minutes, or just open the file). Ask for one hint or a worked example.", tool: "woop" as MindView, label: "Plan the first step (WOOP)" },
  v: { name: "Meaning", fix: "Attach a reason you actually care about: who benefits, which value it serves, what it unlocks. Write one sentence.", tool: "compass" as MindView, label: "Connect it to a value" },
  d: { name: "A closer payoff", fix: "Pull the finish line closer: a mini-deadline today, tell a friend what you will finish by when, or give yourself a small reward right after.", tool: "bundle" as MindView, label: "Add a reward now" },
  i: { name: "Taming distraction", fix: "Make distraction harder than the task: phone in another room, one tab, headphones on. When the urge hits, ride it for 90 seconds.", tool: "urge" as MindView, label: "Ride the urge" },
};
export function tmtAdvice(t: Tmt) {
  const base = tmtIndex(t); const opts = ([["e", { ...t, e: Math.min(10, t.e + 3) }], ["v", { ...t, v: Math.min(10, t.v + 3) }], ["d", { ...t, d: Math.max(0, t.d - 3) }], ["i", { ...t, i: Math.max(0, t.i - 3) }]] as const)
    .map(([k, x]) => ({ k, gain: tmtIndex(x) - base })).sort((a, b) => b.gain - a.gain);
  return { base, top: opts.slice(0, 2).map(o => ({ ...TMT_LEVERS[o.k], gain: o.gain, key: o.k })) };
}

// ---- Quick pulse (10-second energy and mood taps) and your own energy map ----
export interface Pulse { ts: number; e: number; m: number }
export function energyMap(ps: Pulse[]) {
  const blocks = [{ n: "Early (5-9)", a: 5, b: 9 }, { n: "Morning (9-12)", a: 9, b: 12 }, { n: "Midday (12-15)", a: 12, b: 15 }, { n: "Afternoon (15-18)", a: 15, b: 18 }, { n: "Evening (18-22)", a: 18, b: 22 }];
  return blocks.map(b => { const xs = ps.filter(p => { const h = new Date(p.ts).getHours(); return h >= b.a && h < b.b; }); return { ...b, n: b.n, count: xs.length, e: xs.length ? avg(xs.map(x => x.e)) : null, m: xs.length ? avg(xs.map(x => x.m)) : null }; });
}
export const BUNDLE_IDEAS = { wants: ["A favourite playlist", "A podcast episode", "A coffee or tea", "A snack I like", "A comfy spot", "A show episode afterwards", "A walk outside afterwards", "A message to a friend afterwards"], };
