/** Results of the Mind games, stored on this device only. a/b/c meaning depends on the game. */
export type Game = "focus" | "hold" | "recall" | "heart" | "heartp" | "heartf" | "hand" | "cursor" | "eyes" | "type" | "stroop" | "switch" | "trace";
export interface GameRun { ts: number; a: number; b: number; c: number; x?: Record<string, number | null> }
const KEY = "lagomo.games.v1";
const all = (): Record<string, GameRun[]> => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
export function gameStore(g: Game): GameRun[] {
  if (g === "focus") { try { return (JSON.parse(localStorage.getItem("lagomo.reflex.v1") || "[]") as { ts: number; med: number; lapses: number; early: number; tau?: number; cv?: number; ent?: number }[]).map(r => ({ ts: r.ts, a: r.med, b: r.lapses, c: r.early, x: { tau: r.tau ?? null, cv: r.cv ?? null, ent: r.ent ?? null } })); } catch { return []; } }
  return all()[g] ?? [];
}
export function saveGame(g: Exclude<Game, "focus">, r: GameRun) { const a = all(); a[g] = [...(a[g] ?? []), r].slice(-60); try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* ignore */ } }
/** What Today should offer now, or null. Camera and sensor tools are only offered after you have used them once, so no surprise permission prompts. */
export type Offer = "focustap" | "holdback" | "recall" | "heart" | "eyes" | "hand" | "typeflow" | "stroop" | "switch" | "trace";
export function nextGame(now = new Date()): Offer | null {
  const today = now.toDateString(), h = now.getHours(); const last = (g: Game) => gameStore(g).slice(-1)[0]?.ts ?? 0; const used = (g: Game) => gameStore(g).length > 0;
  if ((["focus", "hold", "recall", "heart", "heartp", "heartf", "hand", "cursor", "eyes", "type", "stroop", "switch", "trace"] as Game[]).some(g => last(g) && new Date(last(g)).toDateString() === today)) return null;
  const c: [Offer, number][] = [["focustap", last("focus")], ["holdback", last("hold")], ["recall", last("recall")]];
  if ((used("heart") || used("heartf")) && h < 11) c.push(["heart", Math.min(last("heart") || Infinity, last("heartp") || Infinity, last("heartf") || Infinity) - 3 * 864e5]); // morning is the steadiest time to take it
  if (used("eyes") && h >= 13 && h < 20) c.push(["eyes", last("eyes") - 2 * 864e5]);
  const touch = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0; if (!touch) c.push(["typeflow", last("type")]); if (used("stroop")) c.push(["stroop", last("stroop")]); if (used("switch")) c.push(["switch", last("switch")]); if (used("trace")) c.push(["trace", last("trace")]);
  if (used("hand") || used("cursor")) c.push(["hand", Math.max(last("hand"), last("cursor")) - 864e5]);
  return c.sort((a, b) => a[1] - b[1])[0][0];
}
