// Passive attention log: how often the tab is left while Lagomo is open (tab-switch entropy, LTA Table 12). Only times are kept, never page names.
import { tabStats, type TabEv } from "@/engine/signals";
const KEY = "lagomo.tabs.v1"; let on = false;
const load = (): TabEv[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
export function startAttentionLog() {
  if (on || typeof document === "undefined") return; on = true;
  const push = (hidden: boolean) => { try { const ev = load().filter(e => Date.now() - e.ts < 3 * 864e5).slice(-400); ev.push({ ts: Date.now(), hidden }); localStorage.setItem(KEY, JSON.stringify(ev)); } catch { /* ignore */ } };
  document.addEventListener("visibilitychange", () => push(document.visibilityState === "hidden"));
}
export const attention = (now = Date.now()) => tabStats(load(), now);
export const attentionLoad = () => load();
