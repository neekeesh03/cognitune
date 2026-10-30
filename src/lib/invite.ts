const K = "lagomo.invitedBy";
/** A friend's invite link looks like /?from=username. Remember it until this person has an account. */
export function captureInvite() {
  try { const f = (new URLSearchParams(location.search).get("from") || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20); if (f) { localStorage.setItem(K, f); history.replaceState(null, "", location.pathname); } } catch { /* ignore */ }
}
export const invitedBy = () => { try { return localStorage.getItem(K) || ""; } catch { return ""; } };
export const clearInvite = () => { try { localStorage.removeItem(K); } catch { /* ignore */ } };
export const inviteLink = (u: string) => `${location.origin}/?from=${u}`;
export const inviteText = (u: string) => `I'm doing something I've been avoiding. Want to start something at the same time? Lagomo shows me when you hop in, and nothing else. ${inviteLink(u)}`;
/** Share sheet first, copy as fallback. Returns what happened. */
export async function shareInvite(u: string): Promise<"shared" | "copied" | "failed"> {
  try { localStorage.setItem("lagomo.invited", "1"); } catch { /* ignore */ }
  if (navigator.share) { try { await navigator.share({ title: "Start something with me on Lagomo", text: inviteText(u) }); return "shared"; } catch { /* cancelled: fall through */ } }
  try { await navigator.clipboard.writeText(inviteText(u)); return "copied"; } catch { return "failed"; }
}
