// Live "wake-up" signals through Supabase Realtime (free plan). No message content ever goes through it: just a tiny
// "something new for you" ping on a private-by-obscurity channel, so phones and laptops stop checking every few seconds.
// Off until SUPABASE_URL and SUPABASE_KEY (the public publishable key) are set in Vercel.
import crypto from "node:crypto";

const URL_ = () => (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY = () => process.env.SUPABASE_KEY || "";
const SECRET = () => process.env.SESSION_SECRET || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "dev-only-secret";
export const rtOn = () => !!(URL_() && KEY());
/** Each person listens on a channel name nobody else can work out. */
export const chanFor = id => "u" + crypto.createHmac("sha256", SECRET()).update("rt:" + id).digest("base64url").slice(0, 26);
export const rtInfo = id => (rtOn() ? { url: URL_(), key: KEY(), ch: chanFor(id) } : null);

/** Tell someone "check now". Never throws and never waits more than 1.5 seconds. */
export async function wake(userId, kind = "m") {
  if (!rtOn() || !userId) return;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 1500);
  try {
    await fetch(URL_() + "/realtime/v1/api/broadcast", { method: "POST", signal: ctl.signal, headers: { apikey: KEY(), Authorization: "Bearer " + KEY(), "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ topic: chanFor(userId), event: "w", payload: { k: kind }, private: false }] }) });
  } catch { /* the slow check still catches it */ } finally { clearTimeout(t); }
}
