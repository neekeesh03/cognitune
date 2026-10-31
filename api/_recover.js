// Account recovery by email. Off until RESEND_API_KEY (and MAIL_FROM) are set in Vercel.
// People add and confirm a recovery email in Me > Profile. Only confirmed emails can be used to reset a password.
import crypto from "node:crypto";
import { rd, rdp, getJ, setJ, err, hashPw, checkPw, randomToken } from "./_core.js";

export const mailOn = () => !!process.env.RESEND_API_KEY;
const sha = s => crypto.createHash("sha256").update(String(s)).digest("hex");
const okEmail = e => typeof e === "string" && e.length <= 120 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(e);
export const maskEmail = e => { const [a, b] = String(e).split("@"); return (a.length <= 2 ? a[0] + "*" : a[0] + "***" + a.slice(-1)) + "@" + b; };

async function sendMail(to, subject, text) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM || "Lagomo <onboarding@resend.dev>", to: [to], subject, text }),
  });
  if (!r.ok) throw err(502, "We could not send the email right now. Please try again in a little while.");
}

const base = req => process.env.PUBLIC_URL || `https://${req.headers.host}`;

// Recovery code: free, no email needed. Shown once, only a hash is kept. 16 letters and numbers (80 bits).
const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => { const b = crypto.randomBytes(16); let c = ""; for (let i = 0; i < 16; i++) c += ABC[b[i] % 32]; return c.match(/.{4}/g).join("-"); };
const normCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Routes anyone can call (no sign-in). Returns true when it handled the request. */
export async function recoverPublic(path, method, { body, res, req, ip }) {
  if (path === "reset-code" && method === "POST") {
    const hr = Math.floor(Date.now() / 36e5);
    if ((await rd("INCR", `rl:rk:${ip}:${hr}`)) > 20) throw err(429, "Too many tries. Try again in an hour.");
    const username = String(body.username || "").toLowerCase().trim(); const pw = String(body.password || "");
    if (pw.length < 8) throw err(400, "Password needs at least 8 characters.");
    const bad = () => err(400, "That username and recovery code do not match.");
    const id = username ? await rd("GET", "u:" + username) : null; if (!id) throw bad();
    if ((await rd("INCR", `rl:ru2:${id}:${hr}`)) > 6) throw err(429, "Too many tries for this account. Try again in an hour.");
    const user = await getJ("user:" + id); const code = normCode(body.code);
    if (!user || !user.pw || !user.rc || code.length !== 16 || sha(code) !== user.rc) throw bad();
    user.pw = hashPw(pw); user.pwv = (user.pwv || 0) + 1; delete user.pk; delete user.wk; delete user.rc; // the code works once
    await setJ("user:" + user.id, user);
    return res.json({ ok: true }), true;
  }
  if (path === "reset-request" && method === "POST") {
    if (!mailOn()) throw err(503, "Password reset is not turned on yet.");
    const hr = Math.floor(Date.now() / 36e5);
    if ((await rd("INCR", `rl:rr:${ip}:${hr}`)) > 10) throw err(429, "Too many requests. Try again in an hour.");
    const who = String(body.who || "").toLowerCase().trim().slice(0, 120);
    const id = who.includes("@") ? await rd("GET", "em:" + sha(who)) : who ? await rd("GET", "u:" + who) : null;
    const user = id ? await getJ("user:" + id) : null;
    if (user && user.email && user.pw && !user.suspended && (await rd("INCR", `rl:ru:${user.id}:${hr}`)) <= 3) {
      const token = randomToken(32);
      await rd("SET", "rst:" + sha(token), user.id, "EX", 1800);
      try { await sendMail(user.email, "Reset your Lagomo password", `Hi ${user.name},\n\nSomeone asked to reset the password for @${user.username}. If it was you, open this link within 30 minutes:\n\n${base(req)}/?reset=${token}\n\nA heads up: after a reset, your old private messages can no longer be opened, because they are locked with your old password. New messages work as normal.\n\nIf it was not you, ignore this email. Nothing changes.\n\nLagomo`); }
      catch (e) { if (e.status) throw e; }
    }
    return res.json({ ok: true }), true; // same answer whether or not the account exists
  }
  if (path === "reset-confirm" && method === "POST") {
    const hr = Math.floor(Date.now() / 36e5);
    if ((await rd("INCR", `rl:rc:${ip}:${hr}`)) > 20) throw err(429, "Too many tries. Try again later.");
    const pw = String(body.password || ""); if (pw.length < 8) throw err(400, "Password needs at least 8 characters.");
    const key = "rst:" + sha(String(body.token || "")); const id = await rd("GET", key);
    if (!id) throw err(400, "This link has expired or was already used. Ask for a new one.");
    const user = await getJ("user:" + id); if (!user || !user.pw) throw err(400, "This link has expired or was already used. Ask for a new one.");
    await rd("DEL", key);
    user.pw = hashPw(pw); user.pwv = (user.pwv || 0) + 1; delete user.pk; delete user.wk; // new password means new chat keys
    await setJ("user:" + user.id, user);
    return res.json({ ok: true }), true;
  }
  return false;
}

/** Routes for a signed-in person. */
export async function recoverAuthed(path, method, { me, body, res }) {
  if (path === "rcode-status" && method === "GET") return res.json({ has: !!me.rc, google: !me.pw }), true;
  if (path === "rcode-new" && method === "POST") {
    if (!me.pw) throw err(400, "This account signs in with Google, so it has no password to reset.");
    if (!checkPw(String(body.password || ""), me.pw)) throw err(401, "Wrong password.");
    const code = newCode(); me.rc = sha(normCode(code)); await setJ("user:" + me.id, me);
    return res.json({ code }), true;
  }
  if (path === "email-status" && method === "GET") return res.json({ enabled: mailOn(), email: me.email ? maskEmail(me.email) : null, google: !me.pw }), true;
  if (path === "email-set" && method === "POST") {
    if (!mailOn()) throw err(503, "Recovery email is not turned on yet.");
    if (!me.pw) throw err(400, "This account signs in with Google, so it has no password to reset.");
    const email = String(body.email || "").toLowerCase().trim(); if (!okEmail(email)) throw err(400, "That email does not look right.");
    const taken = await rd("GET", "em:" + sha(email)); if (taken && taken !== me.id) throw err(409, "That email is already used by another account.");
    if ((await rd("INCR", `rl:es:${me.id}:${Math.floor(Date.now() / 36e5)}`)) > 5) throw err(429, "Too many codes. Try again in an hour.");
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    await rd("SET", "emc:" + me.id, JSON.stringify({ h: sha(code + me.id), email, tries: 0 }), "EX", 900);
    await sendMail(email, "Your Lagomo code", `Your Lagomo code is ${code}. It works for 15 minutes.\n\nIf you did not ask for this, ignore this email.`);
    return res.json({ ok: true }), true;
  }
  if (path === "email-verify" && method === "POST") {
    const p = await getJ("emc:" + me.id); if (!p) throw err(400, "That code has expired. Ask for a new one.");
    if (p.tries >= 5) { await rd("DEL", "emc:" + me.id); throw err(429, "Too many wrong codes. Ask for a new one."); }
    if (sha(String(body.code || "").trim() + me.id) !== p.h) { p.tries++; await setJ("emc:" + me.id, p, "EX", 900); throw err(400, "That code is not right."); }
    if (me.email && me.email !== p.email) await rd("DEL", "em:" + sha(me.email));
    me.email = p.email; await rdp([["SET", "em:" + sha(p.email), me.id], ["DEL", "emc:" + me.id]]); await setJ("user:" + me.id, me);
    return res.json({ ok: true, email: maskEmail(me.email) }), true;
  }
  if (path === "email-remove" && method === "POST") {
    if (me.email) { await rd("DEL", "em:" + sha(me.email)); delete me.email; await setJ("user:" + me.id, me); }
    return res.json({ ok: true }), true;
  }
  return false;
}
// mail is on when RESEND_API_KEY is set
