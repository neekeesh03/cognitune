import { api } from "@/lib/api";

const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, c => c.charCodeAt(0)); };
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export type AlertState = "unsupported" | "blocked" | "off" | "on";

/** Is this device set up for alerts right now? */
export async function alertState(): Promise<AlertState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  try { const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription(); return sub ? "on" : "off"; } catch { return "off"; }
}
/** Asks permission (must be called from a tap), then registers this device with the server. */
export async function turnOnAlerts(): Promise<AlertState> {
  if (!pushSupported()) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "blocked" : "off";
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const { key } = await api<{ key: string }>("push-key");
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
  await api("push-sub", { body: { sub: sub.toJSON() } });
  return "on";
}
export async function turnOffAlerts(): Promise<AlertState> {
  try { const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription(); if (sub) { await api("push-sub", { method: "DELETE", body: { endpoint: sub.endpoint } }); await sub.unsubscribe(); } } catch { /* ignore */ }
  return "off";
}
