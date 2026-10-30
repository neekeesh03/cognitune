// Web push: lets a friend's message, hop or cheer reach your phone or computer even when the app is closed.
// Message text is end-to-end encrypted, so notifications only ever say who, never what.
import webpush from "web-push";
import { rd, rdp, getJ, setJ, err } from "./_core.js";

const SUBJECT = "mailto:thecelestialteens@gmail.com";
let cached = null;
async function keys() {
  if (cached) return cached;
  let k = await getJ("vapid");
  if (!k) { k = webpush.generateVAPIDKeys(); await setJ("vapid", k); k = (await getJ("vapid")) || k; }
  cached = k; return k;
}
export const pushPublicKey = async () => (await keys()).publicKey;

const okSub = s => s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 600 && s.keys && typeof s.keys.p256dh === "string" && typeof s.keys.auth === "string" && s.keys.p256dh.length < 200 && s.keys.auth.length < 100;
export async function saveSub(me, sub) {
  if (!okSub(sub)) throw err(400, "That alert setup is not valid.");
  const key = "ps:" + me.id; const cur = (await rd("SMEMBERS", key)) || [];
  const keep = cur.filter(x => { try { return JSON.parse(x).endpoint !== sub.endpoint; } catch { return false; } }).slice(-4);
  await rdp([["DEL", key], ...[...keep, JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } })].map(v => ["SADD", key, v]), ["EXPIRE", key, 90 * 864e3]]);
}
export async function dropSub(me, endpoint) {
  const cur = (await rd("SMEMBERS", "ps:" + me.id)) || [];
  for (const x of cur) { try { if (JSON.parse(x).endpoint === endpoint) await rd("SREM", "ps:" + me.id, x); } catch { /* skip */ } }
}
export const hasSub = async id => ((await rd("SCARD", "ps:" + id)) || 0) > 0;

/** Sends one notification to every device a person turned alerts on for. Skips people who are looking at the app right now. */
export async function pushTo(userId, payload, { ifAway = true, limitKey = "", limit = 0 } = {}) {
  try {
    if (ifAway) { const seen = await rd("GET", "seen:" + userId); if (seen && Date.now() - (+seen || 0) < 50000) return 0; }
    if (limitKey && limit) { const n = await rd("INCR", limitKey); await rd("EXPIRE", limitKey, 90000); if (n > limit) return 0; }
    const subs = (await rd("SMEMBERS", "ps:" + userId)) || []; if (!subs.length) return 0;
    const k = await keys(); const send = globalThis.__pushSend || ((s, p, o) => webpush.sendNotification(s, p, o));
    let sent = 0;
    await Promise.all(subs.map(async raw => {
      let sub; try { sub = JSON.parse(raw); } catch { return; }
      try { await Promise.race([send(sub, JSON.stringify(payload), { TTL: 3600, urgency: "normal", vapidDetails: { subject: SUBJECT, publicKey: k.publicKey, privateKey: k.privateKey } }), new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("slow"), { statusCode: 0 })), 2500))]); sent++; }
      catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await rd("SREM", "ps:" + userId, raw).catch(() => {}); }
    }));
    return sent;
  } catch { return 0; }
}
