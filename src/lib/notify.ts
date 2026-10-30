import { toast } from "@/lib/fx";
import { tr } from "@/i18n";

const shown = new Map<string, number>();
/** One place for every "something happened" ping. Same event never shows twice, and the same friend never stacks up. */
export async function notify(o0: { id: string; tag: string; title: string; body?: string; windowMs?: number }) {
  const o = { ...o0, title: tr(o0.title), body: o0.body ? tr(o0.body) : o0.body };
  const now = Date.now(); const last = shown.get(o.id);
  if (last && now - last < (o.windowMs ?? 60000)) return; shown.set(o.id, now);
  const away = document.hidden || !document.hasFocus();
  if (away && "Notification" in window && Notification.permission === "granted") {
    try { const reg = await navigator.serviceWorker?.getRegistration(); if (reg) { await reg.showNotification(o.title, { body: o.body, tag: o.tag, icon: "/icon.svg", badge: "/icon.svg" }); return; } } catch { /* fall back to the in-app toast */ }
  }
  toast(o.title, o.body);
}
/** "Active 5 min ago" style text from a time stamp. */
export function lastSeenText(ts?: number | null): string {
  if (!ts) return "Away";
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `Active ${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `Active ${h} h ago`;
  const d = Math.round(h / 24); return d === 1 ? "Active yesterday" : `Active ${d} days ago`;
}
