// Local store for the measured Lagun's Law readings. Everything stays on this device unless "share for research" is switched on.
import { loadLog } from "@/lib/startlog";
import { loadMind } from "@/store/useMind";
import { gameStore } from "@/engine/games";
import { loadState } from "@/engine/insights";
import { hourWindowRate } from "@/engine/pattern";
import { read, settle, lagunProb, PROTOCOL, WINDOW, type Data, type GameKey, type Rec, type Reading } from "@/engine/lagun";
import { api } from "@/lib/api";
import type { Inputs } from "@/engine/model";

const K_ON = "lagomo.research.on", K_SHARE = "lagomo.research.share", K_RECS = "lagomo.research.recs.v1", K_PID = "lagomo.research.pid", K_SENT = "lagomo.research.sent";
const ls = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } }, del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } } };
export const researchOn = () => ls.get(K_ON) === "1";
export const shareOn = () => ls.get(K_SHARE) === "1";
export const setResearchOn = (v: boolean) => { if (v) ls.set(K_ON, "1"); else { ls.del(K_ON); ls.del(K_SHARE); } };
export const setShareOn = (v: boolean) => { if (v) ls.set(K_SHARE, "1"); else ls.del(K_SHARE); };
export const loadRecs = (): Rec[] => { try { return JSON.parse(ls.get(K_RECS) || "[]"); } catch { return []; } };
const saveRecs = (r: Rec[]) => ls.set(K_RECS, JSON.stringify(r.slice(-3000)));
export function pid(): string { let p = ls.get(K_PID); if (!p) { p = Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b.toString(36).padStart(2, "0")).join("").slice(0, 16); ls.set(K_PID, p); } return p; }
export const deleteResearch = () => { [K_RECS, K_SENT, K_PID, K_ON, K_SHARE].forEach(ls.del); };

const GK: GameKey[] = ["focus", "hold", "recall", "heart", "heartp", "heartf", "hand", "cursor", "eyes"];
export function gatherData(now = Date.now()): Data {
  const log = loadLog(); const mind = loadMind(); const starts = log.starts.map(s => ({ ts: s.ts, created: s.created }));
  const games = {} as Data["games"]; GK.forEach(k => { games[k] = gameStore(k as never) as never; });
  let deadline: number | null = null; try { const tasks = JSON.parse(ls.get("lagomo.tasks.v1") || "[]") as { due?: string; doneAt?: number }[]; let best: number | null = null; for (const t of tasks) { if (t.doneAt || !t.due) continue; const h = (new Date(t.due + "T23:59").getTime() - now) / 36e5; if (h > -24 && (best === null || h < best)) best = h; } if (best !== null) deadline = 1 / (1 + Math.exp(-(72 - best) / 12)); } catch { /* ignore */ }
  const load = (() => { try { return loadState(mind, starts.map(s => s.ts), now).state; } catch { return null; } })();
  return { now, starts, games, pulse: mind.pulse ?? [], load, deadline, pb: log.starts.length >= 3 ? hourWindowRate(log, now) : null };
}
/** Today's reading from measured signals. Null when too little has been measured to say anything. */
export function currentReading(now = Date.now()): Reading | null { const r = read(gatherData(now)); return r.measured.coverage >= 0.34 ? r : null; }
/** Inputs for the Drive equation when the person has not used the sliders. Needs at least half the forces measured. */
export function measuredInputs(): Inputs | null { try { const r = read(gatherData()); return r.measured.coverage >= 0.5 ? r.measured.inputs : null; } catch { return null; } }

/** Save a reading at most once per 3 hours while research mode is on, and settle old ones against what really happened. */
export function snapshot(now = Date.now()): Rec[] {
  if (!researchOn()) return loadRecs();
  const d = gatherData(now); let recs = settle(loadRecs(), d.starts, now); const last = recs[recs.length - 1];
  if (!last || now - last.t >= WINDOW) {
    const r = read(d); const pb = Math.min(0.95, Math.max(0.02, d.pb ?? 0.2)); const m = r.measured;
    if (m.coverage >= 0.34 && d.pb != null) recs = [...recs, { id: pid(), t: now, v: [m.inputs.Primode, m.inputs.CAP, m.inputs.Flexion, m.inputs.Anchory, m.inputs.Grain, m.inputs.Slip], raw: m.raw, cov: m.coverage, dp: r.drivePaper, dc: r.driveCore, pb, pl: lagunProb(pb, r.drivePaper), proto: PROTOCOL }];
  }
  saveRecs(recs); return recs;
}
export async function shareNow(): Promise<number> {
  if (!shareOn()) return 0; const sent = new Set<number>(JSON.parse(ls.get(K_SENT) || "[]")); const todo = loadRecs().filter(r => r.y !== undefined && !sent.has(r.t)).slice(0, 200); if (!todo.length) return 0;
  const out = await api<{ stored: number }>("research", { method: "POST", body: { pid: pid(), recs: todo } }); todo.forEach(r => sent.add(r.t)); ls.set(K_SENT, JSON.stringify([...sent].slice(-5000))); return out.stored;
}
