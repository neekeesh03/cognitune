/** Results of the Mind games, stored on this device only. a/b/c meaning depends on the game. */
export type Game = "focus" | "hold" | "recall";
export interface GameRun { ts: number; a: number; b: number; c: number }
const KEY = "lagomo.games.v1";
const all = (): Record<string, GameRun[]> => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
export function gameStore(g: Game): GameRun[] {
  if (g === "focus") { try { return (JSON.parse(localStorage.getItem("lagomo.reflex.v1") || "[]") as { ts: number; med: number; lapses: number; early: number }[]).map(r => ({ ts: r.ts, a: r.med, b: r.lapses, c: r.early })); } catch { return []; } }
  return all()[g] ?? [];
}
export function saveGame(g: "hold" | "recall", r: GameRun) { const a = all(); a[g] = [...(a[g] ?? []), r].slice(-60); try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* ignore */ } }
/** The game played least recently, or null if one was played today. */
export function nextGame(): "focustap" | "holdback" | "recall" | null {
  const today = new Date().toDateString(); const last = (g: Game) => gameStore(g).slice(-1)[0]?.ts ?? 0;
  if ((["focus", "hold", "recall"] as Game[]).some(g => last(g) && new Date(last(g)).toDateString() === today)) return null;
  const order = [["focustap", last("focus")], ["holdback", last("hold")], ["recall", last("recall")]] as const;
  return [...order].sort((a, b) => a[1] - b[1])[0][0];
}
