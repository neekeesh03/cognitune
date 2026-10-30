const K = "lagomo.guestStart";
/** Anonymous counters only (no account, no task text). */
export function guestHit(kind: "guest_start" | "guest_done" | "guest_save") { fetch("/api/hit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) }).catch(() => undefined); }
/** A start made before signing up. Kept on this device for a day so it can be credited after sign-up. */
export function rememberGuestStart() { try { localStorage.setItem(K, JSON.stringify({ ts: Date.now() })); } catch { /* ignore */ } }
export function takeGuestStart(): boolean {
  try { const v = JSON.parse(localStorage.getItem(K) || "null"); localStorage.removeItem(K); return !!v && Date.now() - v.ts < 864e5; } catch { return false; }
}
export const hasGuestStart = () => { try { return !!localStorage.getItem(K); } catch { return false; } };
