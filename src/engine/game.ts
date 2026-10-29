// Rewards, levels, badges and a forgiving streak. Plain-language by design.
export type EventKind = "checkin" | "started" | "journal" | "chat" | "step" | "task" | "block" | "timer" | "nudge" | "buddy" | "box";
export const SPARKS: Record<EventKind, { n: number; label: string }> = {
  checkin: { n: 5, label: "Checked in" }, started: { n: 15, label: "You started!" }, journal: { n: 8, label: "Wrote it down" },
  chat: { n: 2, label: "Talked it out" }, step: { n: 3, label: "Tiny step done" }, task: { n: 10, label: "Task finished" },
  block: { n: 10, label: "Time block done" }, timer: { n: 10, label: "Focus session done" }, nudge: { n: 4, label: "Reached out" },
  buddy: { n: 12, label: "Focused together" }, box: { n: 0, label: "Spark box" },
};
/** Events that count as "you showed up today" for the streak. */
export const STREAK_EVENTS: EventKind[] = ["started", "journal", "step", "task", "block", "timer", "buddy"];

export const LEVELS = ["Seed", "Sprout", "Seedling", "Sapling", "Young tree", "Blossom", "Grove", "Orchard", "Forest"];
export const levelFor = (lifetime: number) => {
  let lvl = 0, need = 40, left = lifetime;
  while (left >= need && lvl < LEVELS.length - 1) { left -= need; lvl++; need = Math.round(need * 1.5); }
  return { level: lvl, name: LEVELS[lvl], into: left, need, pct: lvl >= LEVELS.length - 1 ? 1 : left / need };
};

export interface Badge { id: string; name: string; how: string }
export const BADGES: Badge[] = [
  { id: "first_start", name: "First spark", how: "Start something for the first time" },
  { id: "streak3", name: "Three in a row", how: "Show up 3 days in a row" },
  { id: "streak7", name: "Full week", how: "Show up 7 days in a row" },
  { id: "steps10", name: "Tiny step collector", how: "Finish 10 tiny steps" },
  { id: "steps50", name: "Step by step", how: "Finish 50 tiny steps" },
  { id: "journal5", name: "Open book", how: "Write 5 journal entries" },
  { id: "friend1", name: "Not alone", how: "Add your first person" },
  { id: "buddy1", name: "Better together", how: "Do a focus session with someone" },
  { id: "early", name: "Early bird", how: "Start something before 9am" },
  { id: "plan5", name: "Planner", how: "Finish 5 time blocks" },
  { id: "level4", name: "Growing strong", how: "Reach Young tree" },
];

export interface Reward { id: string; name: string; cost: number }
export const DEFAULT_REWARDS: Reward[] = [
  { id: "r1", name: "A tea or coffee break", cost: 40 }, { id: "r2", name: "30 minutes of a show", cost: 80 }, { id: "r3", name: "A treat you like", cost: 150 }, { id: "r4", name: "A guilt-free free evening", cost: 300 },
];
export interface GameState {
  sparks: number; lifetime: number;
  streak: { current: number; best: number; lastDay: string; freezes: number; usedFreeze: boolean };
  badges: string[]; counts: Record<string, number>;
  rewards: Reward[]; claimed: { id: string; name: string; ts: number }[]; boxDay: string; today: string; todayActive: boolean;
}
export const emptyGame = (): GameState => ({ sparks: 0, lifetime: 0, streak: { current: 0, best: 0, lastDay: "", freezes: 1, usedFreeze: false }, badges: [], counts: {}, rewards: DEFAULT_REWARDS, claimed: [], boxDay: "", today: "", todayActive: false });

export const dkey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayDiff = (a: string, b: string) => Math.round((new Date(b + "T12:00").getTime() - new Date(a + "T12:00").getTime()) / 864e5);

/** Forgiving streak: a missed day uses a freeze if you have one; otherwise the streak restarts and your best is kept. Earn a freeze every 7 days (max 2). */
export function bumpStreak(g: GameState, day = dkey()): { g: GameState; msg?: string } {
  const s = { ...g.streak }; let msg: string | undefined;
  if (s.lastDay === day) return { g };
  if (!s.lastDay) s.current = 1;
  else {
    const gap = dayDiff(s.lastDay, day);
    if (gap === 1) s.current += 1;
    else if (gap > 1) {
      const missed = gap - 1;
      if (s.freezes >= missed) { s.freezes -= missed; s.current += 1; msg = `A rest day covered ${missed === 1 ? "yesterday" : `${missed} days`}. Your showing-up days are safe.`; }
      else { s.current = 1; msg = "Fresh start. Your best run is kept."; }
    }
  }
  if (s.current > 0 && s.current % 7 === 0 && s.freezes < 2) { s.freezes += 1; msg = (msg ? msg + " " : "") + "You earned a rest day."; }
  s.best = Math.max(s.best, s.current); s.lastDay = day;
  return { g: { ...g, streak: s }, msg };
}
export const BOX_LINES = ["A little extra for showing up.", "Found these for you.", "Small things add up.", "You earned this one.", "Look at you go."];
