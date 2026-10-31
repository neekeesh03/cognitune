/** Live wake-ups from Supabase Realtime (free). Carries no message content, only "check now". Falls back to slow checking when offline. */
export type Wake = "m" | "t" | "h" | "f";
export const WAKE_EVENT = "lagomo:wake";
let ws: WebSocket | null = null; let cur = ""; let hb = 0; let retry = 0; let reconnect = 0; let live = false;
/** True while the live connection is up, so other checks can slow down. */
export const rtLive = () => live;

function open(url: string, key: string, ch: string) {
  const wsUrl = url.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(key) + "&vsn=1.0.0";
  let s: WebSocket; try { s = new WebSocket(wsUrl); } catch { return; }
  ws = s; let ref = 1; const send = (topic: string, event: string, payload: unknown) => { if (s.readyState === 1) s.send(JSON.stringify({ topic, event, payload, ref: String(ref++) })); };
  s.onopen = () => { retry = 0; send("realtime:" + ch, "phx_join", { config: { broadcast: { self: false, ack: false }, presence: { enabled: false }, private: false } }); window.clearInterval(hb); hb = window.setInterval(() => send("phoenix", "heartbeat", {}), 25000); };
  s.onmessage = e => {
    try {
      const m = JSON.parse(e.data as string);
      if (m.event === "phx_reply" && m.topic === "realtime:" + ch) { live = m.payload?.status === "ok"; }
      if (m.event === "broadcast" && m.payload?.event === "w") window.dispatchEvent(new CustomEvent(WAKE_EVENT, { detail: m.payload?.payload?.k || "m" }));
    } catch { /* ignore */ }
  };
  const lost = () => { live = false; window.clearInterval(hb); if (ws !== s) return; ws = null; if (!cur) return; window.clearTimeout(reconnect); reconnect = window.setTimeout(() => { const [u, k, c] = cur.split("|"); if (cur) open(u, k, c); }, Math.min(30000, 1500 * 2 ** retry++)); };
  s.onclose = lost; s.onerror = () => { try { s.close(); } catch { /* ignore */ } };
}

/** Start (once) listening on this person's private channel. Safe to call on every refresh. */
export function startRealtime(rt: { url: string; key: string; ch: string } | null | undefined) {
  if (!rt) return; const id = [rt.url, rt.key, rt.ch].join("|"); if (id === cur && ws) return;
  stopRealtime(); cur = id; open(rt.url, rt.key, rt.ch);
}
export function stopRealtime() { cur = ""; live = false; window.clearInterval(hb); window.clearTimeout(reconnect); const s = ws; ws = null; if (s) { try { s.close(); } catch { /* ignore */ } } }
