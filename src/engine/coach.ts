// The Start Coach: why a start feels hard, and the one small move that fits that reason.
// Each tactic names the idea behind it in plain words and how strong the evidence is.
import { suggestSteps } from "@/engine/plan";

export type Friction = "unclear" | "big" | "boring" | "scared" | "tired" | "distract" | "meh";
export interface Tactic {
  id: Friction; label: string; name: string;
  idea: string; strength: "Established" | "Exploratory";
  /** What we ask the person, if anything. */
  ask?: { q: string; ph: string; chips?: string[] };
  reset?: boolean;
  /** Turns the answer into one tiny first step, plus a line to show. */
  build: (title: string, answer: string) => { step: string; line: string };
}
const first = (t: string) => suggestSteps(t)[0]?.text ?? "Open it and look at it";
export const TACTICS: Tactic[] = [
  { id: "unclear", label: "I do not know where to start", name: "Name the first move", strength: "Established",
    idea: "A vague goal stays stuck. Deciding the exact first action turns \"I should\" into a plan, and plans like this helped across about 94 studies.",
    ask: { q: "What would your hands do first?", ph: "e.g. open the file and type the title" },
    build: (t, a) => ({ step: a.trim() || first(t), line: "Clear first move. The rest can wait." }) },
  { id: "big", label: "It feels too big", name: "Shrink it", strength: "Established",
    idea: "How unpleasant a task feels is one of the strongest known reasons people put things off. A smaller piece feels smaller, so it is easier to begin.",
    ask: { q: "Pick the smallest piece, or make it even smaller.", ph: "", chips: ["Just open it", "Write one messy line", "Set a 2-minute timer and look at it"] },
    build: (t, a) => ({ step: a.trim() || first(t), line: "A small piece is still a start." }) },
  { id: "boring", label: "It is boring", name: "Pair it with a treat", strength: "Exploratory",
    idea: "Pairing a task with something you enjoy raised follow-through in studies, but the effect faded over time. So switch the treat now and then.",
    ask: { q: "What would make the first two minutes nicer?", ph: "", chips: ["My favourite music", "A tea or coffee", "A nicer spot", "A friend nearby"] },
    build: (t, a) => ({ step: `${first(t)}${a.trim() ? ", with " + a.trim().toLowerCase().replace(/^my /, "your ") : ""}`, line: "Something nice for the hard part." }) },
  { id: "scared", label: "I am afraid I will do it badly", name: "Allow a bad first draft", strength: "Exploratory",
    idea: "Being kind to yourself, rather than harsh, goes with less putting off. A first draft is allowed to be bad. That is its whole job.",
    build: (t) => ({ step: `Make it bad on purpose for two minutes. ${first(t)}`, line: "Good enough to start is good enough." }) },
  { id: "tired", label: "I am too tired", name: "Reset, then the smallest version", strength: "Established",
    idea: "Poor sleep is the best-supported thing that hurts focus. If you are truly wrecked, rest counts. If you are only low, a slow minute of breathing and a tiny start can help.",
    reset: true,
    build: (t) => ({ step: `Smallest version: ${first(t).toLowerCase()}`, line: "Tired and still started. That is real." }) },
  { id: "distract", label: "I keep wanting to do something else", name: "Park the other thing", strength: "Exploratory",
    idea: "Writing down what pulls at you tells your mind it will not be forgotten, so it lets go a bit. Then you can give two minutes to this.",
    ask: { q: "What do you want to do instead? Write it, do it after.", ph: "e.g. check messages" },
    build: (t, a) => ({ step: `${a.trim() ? "Parked: " + a.trim() + ". " : ""}Phone away, then ${first(t).toLowerCase()}`, line: "It is parked. It will still be there." }) },
  { id: "meh", label: "I do not see why it matters", name: "Find one reason that is yours", strength: "Established",
    idea: "People start more easily when the reason is their own, not someone else's. One honest reason is enough.",
    ask: { q: "One reason this matters to you.", ph: "e.g. so I can stop thinking about it" },
    build: (t, a) => ({ step: first(t), line: a.trim() ? `Because: ${a.trim()}` : "Your reason, not theirs." }) },
];
export const tacticFor = (f: Friction) => TACTICS.find(t => t.id === f)!;
export const CUES = ["I sit at my desk", "I finish this drink", "I open my laptop", "Now"];

// ---------- storage (this device only) ----------
export interface CoachEvent { ts: number; task: string; friction: Friction; cue: string }
export interface Parked { task: string; note: string; ts: number }
interface Store { events: CoachEvent[]; parked: Parked[]; plan: { task: string; cue: string; step: string; ts: number } | null }
const KEY = "lagomo.coach.v1", EV = "lagomo:coach";
export const loadCoach = (): Store => { try { return { events: [], parked: [], plan: null, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { events: [], parked: [], plan: null }; } };
const save = (s: Store) => { localStorage.setItem(KEY, JSON.stringify({ ...s, events: s.events.slice(-300), parked: s.parked.slice(-30) })); window.dispatchEvent(new Event(EV)); };
export function logCoach(e: CoachEvent, step: string) { const s = loadCoach(); s.events.push(e); s.plan = { task: e.task, cue: e.cue, step, ts: e.ts }; save(s); }
export function parkNote(task: string, note: string) { if (!note.trim()) return; const s = loadCoach(); s.parked = [...s.parked.filter(p => p.task !== task), { task, note: note.trim().slice(0, 160), ts: Date.now() }]; save(s); }
export function clearParked(task: string) { const s = loadCoach(); s.parked = s.parked.filter(p => p.task !== task); save(s); }
export const coachEvent = EV;

// ---------- feelings: name it, then a one-minute reset ----------
export type Mood = "anxious" | "flat" | "frustrated" | "restless" | "sad";
export const MOODS: { id: Mood; label: string; idea: string; steps: { at: number; text: string }[] }[] = [
  { id: "anxious", label: "Anxious or worried", idea: "Slow breathing with a longer breath out can settle the body a little. It will not fix the worry, it just takes the edge off.", steps: [{ at: 0, text: "Breathe in for 4, then out slowly for 6." }] },
  { id: "flat", label: "Flat or numb", idea: "A little movement and a sip of water can nudge a flat mood. It is small, and small is the point.", steps: [{ at: 0, text: "Stand up if you can. Roll your shoulders slowly." }, { at: 15, text: "Take a few sips of water." }, { at: 30, text: "Look out of a window, or at something far away." }, { at: 45, text: "Say one thing you can see, out loud." }] },
  { id: "frustrated", label: "Frustrated or irritated", idea: "Putting a feeling into words is linked with calmer reactions. Say it, then breathe out long.", steps: [{ at: 0, text: "Shake out your hands for ten seconds." }, { at: 12, text: "Say it out loud: \"I feel frustrated.\"" }, { at: 30, text: "Breathe out long, like fogging a mirror. Three times." }, { at: 48, text: "Unclench your jaw and drop your shoulders." }] },
  { id: "restless", label: "Restless", idea: "If your body is buzzing, let it move first. Settling is easier after a little movement.", steps: [{ at: 0, text: "Stand and stretch up high." }, { at: 15, text: "Do ten slow squats or toe raises." }, { at: 35, text: "Roll your neck gently each way." }, { at: 50, text: "Sit down. Feet flat on the floor." }] },
  { id: "sad", label: "Sad or low", idea: "Being kind to yourself, not harsh, goes with less putting off. You do not have to feel better to begin something small.", steps: [{ at: 0, text: "Put a hand on your chest." }, { at: 12, text: "Tell yourself: \"This is hard, and I can still start small.\"" }, { at: 32, text: "Breathe in for 4, out for 6, slowly." }, { at: 50, text: "You are allowed to go gently today." }] },
];
