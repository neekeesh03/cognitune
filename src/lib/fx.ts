// Tiny event bus for celebratory effects (confetti + toast). No dependencies.
import { feel } from "@/lib/feel";
export const lowStim = () => { try { return localStorage.getItem("lagomo.lowstim") === "1"; } catch { return false; } };
export const setLowStim = (on: boolean) => { try { localStorage.setItem("lagomo.lowstim", on ? "1" : "0"); } catch { /* ignore */ } document.documentElement.classList.toggle("lowstim", on); };
export const burst = () => { if (lowStim()) return; feel("done"); window.dispatchEvent(new CustomEvent("lagomo:burst")); };
export const toast = (title: string, sub?: string, action?: { label: string; url: string }) => window.dispatchEvent(new CustomEvent("lagomo:toast", { detail: { title, sub, action } }));
/** Asks the app to open an in-app link such as "/?start=BLOCK_ID". */
export const openLink = (url: string) => window.dispatchEvent(new CustomEvent("lagomo:open", { detail: { url } }));
