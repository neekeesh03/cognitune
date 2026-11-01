// Helping train the rabbit. On by default, with a clear notice, and one switch in Me > Settings to turn it off.
// What is sent: only the words of a chat message (with names, emails, links, handles and long numbers removed), what the
// model thought it meant, and whether you typed it or tapped a suggestion. Never your account, never anything from a
// message that looks like a crisis or a low mood, and nothing at all once you switch it off.
import { api, getToken } from "@/lib/api";

const K = "lagomo.talkshare.v1";   // "off" when the person has opted out; missing means on
const N = "lagomo.talknotice.v1";  // the notice has been shown
export const sharingOn = () => { try { return localStorage.getItem(K) !== "off"; } catch { return false; } };
export function setSharing(on: boolean) { try { on ? localStorage.removeItem(K) : localStorage.setItem(K, "off"); } catch { /* ignore */ } if (!on) queue.length = 0; window.dispatchEvent(new Event("lagomo:talkshare")); }
export const noticeSeen = () => { try { return !!localStorage.getItem(N); } catch { return true; } };
export const markNotice = () => { try { localStorage.setItem(N, "1"); } catch { /* ignore */ } };

/** Remove anything that could identify a person from a message. */
export function anonymise(text: string, names: string[] = []): string {
  let t = text.replace(/https?:\/\/\S+|www\.\S+/gi, "<link>").replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "<email>").replace(/@\w{2,}/g, "<handle>").replace(/\+?\d[\d\s().-]{6,}\d/g, "<number>").replace(/\b\d{4,}\b/g, "<number>");
  for (const n of names) { const w = n.trim(); if (w.length >= 2) t = t.replace(new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi"), "<name>"); }
  return t.trim().slice(0, 200);
}

// Anything about mood, mental health, health or abuse is never shared, even if the model did not flag it.
const SENSITIVE = /\b(sad|depress\w*|lonely|hopeless|worthless|useless|anxi\w*|panic\w*|cry\w*|empty|numb|hate myself|failure|suicid\w*|self.?harm|hurt\w*|abus\w*|therap\w*|medic\w*|diagnos\w*|pregnan\w*|die|dead|kill\w*|miserable|down|low)\b/i;
export interface Sample { x: string; prev: string; act: string; conf: number; via: "typed" | "chip"; unsure?: boolean }
const queue: Sample[] = []; let timer: ReturnType<typeof setTimeout> | null = null;
async function flush() { timer = null; if (!queue.length || !getToken() || !sharingOn()) { queue.length = 0; return; } const items = queue.splice(0, 20); try { await api("talk-log", { body: { items } }); } catch { /* try again with the next turn */ } if (queue.length) timer = setTimeout(flush, 5000); }
/** Queue one chat turn. Does nothing if sharing is off, there is no account, or the turn is sensitive. */
export function shareTurn(s: Sample, opts: { sensitive?: boolean; names?: string[] } = {}) {
  if (!sharingOn() || !getToken() || opts.sensitive || SENSITIVE.test(s.x)) return;
  const x = anonymise(s.x, opts.names); if (x.length < 2) return;
  queue.push({ ...s, x }); if (!timer) timer = setTimeout(flush, 4000);
}
