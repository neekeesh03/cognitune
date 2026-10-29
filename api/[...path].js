// Cognitune backend: accounts, friends, messages, calendar, feedback and the admin panel.
// Runs as one Vercel serverless function. Data lives in Upstash Redis. Helpers live in _core.js, _calendar.js and _admin.js.
import crypto from "node:crypto";
import { rd, rdp, getJ, setJ, err, URL_, IS_PROD, verify, tokenFor, hashPw, checkPw, claimAvatar, avKey, avValid, avRandom, pub, cleanName, convoKey, isAdmin, touchActive, bump, deleteAccount, randomId } from "./_core.js";
import { feedIcs, fetchIcs, eventsFromIcs } from "./_calendar.js";
import { adminRoute } from "./_admin.js";

const MAX_FILE_B64 = 1_000_000; // about 750 KB of file data
export { eventsFromIcs };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const u = new URL(req.url, "http://x"); const path = u.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
    const query = Object.fromEntries(u.searchParams);
    const method = req.method; const body = req.body && typeof req.body === "object" ? req.body : {};
    const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0].trim();

    if (path === "health") return res.json({ ok: true, storage: !!URL_ || !IS_PROD });

    // ----- public: register / login -----
    if (path === "register" && method === "POST") {
      const rl = await rd("INCR", `rl:reg:${ip}:${Math.floor(Date.now() / 36e5)}`); if (rl > 15) throw err(429, "Too many sign-ups from here. Try again later.");
      const username = String(body.username || "").toLowerCase().trim(); const pw = String(body.password || ""); const name = cleanName(body.name) || username;
      if (!/^[a-z0-9_]{3,20}$/.test(username)) throw err(400, "Usernames use 3 to 20 letters, numbers or underscores.");
      if (pw.length < 8) throw err(400, "Password needs at least 8 characters.");
      const id = crypto.randomUUID();
      if (!(await rd("SETNX", "u:" + username, id))) throw err(409, "That username is taken. Try another.");
      let av = avValid(body.avatar) ? body.avatar : avRandom(); let tries = 0;
      while (!(await claimAvatar(id, av))) { av = avRandom(); if (++tries > 40) throw err(500, "Could not pick an avatar."); }
      const user = { id, username, name, avatar: av, pw: hashPw(pw), created: Date.now() };
      await setJ("user:" + id, user); await rd("ZADD", "users:z", 0, username); bump("signups");
      return res.json({ token: tokenFor(user), user: pub(user) });
    }
    if (path === "login" && method === "POST") {
      const rl = await rd("INCR", `rl:login:${ip}:${Math.floor(Date.now() / 6e4)}`); if (rl > 15) throw err(429, "Too many tries. Wait a minute.");
      const username = String(body.username || "").toLowerCase().trim(); const id = await rd("GET", "u:" + username); const user = id && await getJ("user:" + id);
      if (!user || !checkPw(String(body.password || ""), user.pw)) throw err(401, "Wrong username or password.");
      if (user.suspended) throw err(403, "This account is paused. Please contact the Cognitune team.");
      return res.json({ token: tokenFor(user), user: pub(user) });
    }

    if (path === "cal-feed" && method === "GET") {
      const tok = String(query.t || ""); const uid = tok ? await rd("GET", "calt:" + tok) : null; if (!uid) throw err(404, "Not found");
      const blocks = (await getJ("cal:" + uid)) || []; res.setHeader("Content-Type", "text/calendar; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); return res.send(feedIcs(blocks));
    }

    // ----- everything below needs a signed-in user -----
    const auth = String(req.headers.authorization || "").replace(/^Bearer /, ""); const claims = verify(auth);
    if (!claims) throw err(401, "Please sign in.");
    const me = await getJ("user:" + claims.sub); if (!me || (claims.v || 0) !== (me.pwv || 0)) throw err(401, "Please sign in.");
    if (me.suspended) throw err(403, "This account is paused. Please contact the Cognitune team.");
    await rd("SET", "seen:" + me.id, "1", "EX", 45); touchActive(me.id).catch(() => {});

    if (path === "me" && method === "GET") {
      const [friendIds, inIds, outIds, blocked] = await rdp([["SMEMBERS", "f:" + me.id], ["SMEMBERS", "fin:" + me.id], ["SMEMBERS", "fout:" + me.id], ["SMEMBERS", "blk:" + me.id]]);
      const ids = [...new Set([...friendIds, ...inIds, ...outIds])];
      const users = ids.length ? (await rdp(ids.map(i => ["GET", "user:" + i]))).map(v => v && JSON.parse(v)).filter(Boolean) : [];
      const seen = ids.length ? await rdp(ids.map(i => ["GET", "seen:" + i])) : [];
      const online = Object.fromEntries(ids.map((i, n) => [i, !!seen[n]]));
      const byId = Object.fromEntries(users.map(u => [u.id, u]));
      const reads = friendIds.length ? await rdp(friendIds.map(f => ["GET", `rd:${me.id}:${f}`])) : [];
      const lasts = friendIds.length ? await rdp(friendIds.map(f => ["LRANGE", convoKey(me.id, f), -40, -1])) : [];
      const friends = friendIds.filter(i => byId[i]).map((i, n) => {
        const msgs = (lasts[n] || []).map(m => JSON.parse(m)); const lr = +(reads[n] || 0);
        const last = msgs[msgs.length - 1];
        return { ...pub(byId[i]), online: online[i], unread: msgs.filter(m => m.from === i && m.ts > lr).length, last: last ? { text: last.kind === "file" ? "Sent a file" : last.kind === "session" ? "Focus invite" : last.text, ts: last.ts, mine: last.from === me.id } : null };
      });
      const feedTok = await rd("GET", "calu:" + me.id); return res.json({ user: pub(me), admin: await isAdmin(me), announce: await getJ("announce"), calFeed: !!feedTok, friends, incoming: inIds.filter(i => byId[i]).map(i => pub(byId[i])), outgoing: outIds.filter(i => byId[i]).map(i => pub(byId[i])), blocked: blocked.length });
    }
    if (path === "profile" && method === "POST") {
      if (body.name != null) me.name = cleanName(body.name) || me.name;
      if (body.avatar) {
        if (!avValid(body.avatar)) throw err(400, "Bad avatar.");
        if (avKey(body.avatar) !== avKey(me.avatar)) { if (!(await claimAvatar(me.id, body.avatar))) throw err(409, "Someone already has that exact avatar. Try another."); await rd("DEL", "av:" + avKey(me.avatar)); me.avatar = body.avatar; }
      }
      await setJ("user:" + me.id, me); return res.json({ user: pub(me) });
    }
    if (path === "search" && method === "GET") {
      const q = String(query.q || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20); if (q.length < 2) return res.json({ users: [] });
      const names = await rd("ZRANGEBYLEX", "users:z", "[" + q, "[" + q + "\xff", "LIMIT", 0, 8);
      const ids = (await rdp(names.map(n => ["GET", "u:" + n]))).filter(Boolean);
      const us = (await rdp(ids.map(i => ["GET", "user:" + i]))).map(v => v && JSON.parse(v)).filter(u => u && u.id !== me.id);
      return res.json({ users: us.map(pub) });
    }
    if (path === "friend-request" && method === "POST") {
      const rl = await rd("INCR", `rl:fr:${me.id}:${Math.floor(Date.now() / 36e5)}`); if (rl > 30) throw err(429, "Slow down a little.");
      const uname = String(body.username || "").toLowerCase().trim(); const tid = await rd("GET", "u:" + uname);
      if (!tid) throw err(404, "No one with that username."); if (tid === me.id) throw err(400, "That is you!");
      if (await rd("SISMEMBER", "blk:" + tid, me.id)) throw err(404, "No one with that username.");
      if (await rd("SISMEMBER", "f:" + me.id, tid)) return res.json({ ok: true, status: "friends" });
      if (await rd("SISMEMBER", "fout:" + tid, me.id)) { await rdp([["SADD", "f:" + me.id, tid], ["SADD", "f:" + tid, me.id], ["SREM", "fout:" + tid, me.id], ["SREM", "fin:" + me.id, tid]]); return res.json({ ok: true, status: "friends" }); }
      await rdp([["SADD", "fout:" + me.id, tid], ["SADD", "fin:" + tid, me.id]]); return res.json({ ok: true, status: "sent" });
    }
    if (path === "friend-respond" && method === "POST") {
      const id = String(body.id || ""); if (!(await rd("SISMEMBER", "fin:" + me.id, id))) throw err(404, "No such request.");
      const cmds = [["SREM", "fin:" + me.id, id], ["SREM", "fout:" + id, me.id]]; if (body.accept) cmds.push(["SADD", "f:" + me.id, id], ["SADD", "f:" + id, me.id]);
      await rdp(cmds); return res.json({ ok: true });
    }
    if (path === "friend-remove" && method === "POST") {
      const id = String(body.id || ""); const cmds = [["SREM", "f:" + me.id, id], ["SREM", "f:" + id, me.id], ["SREM", "fout:" + me.id, id], ["SREM", "fin:" + me.id, id]];
      if (body.block) cmds.push(["SADD", "blk:" + me.id, id]); await rdp(cmds); return res.json({ ok: true });
    }
    if (path === "messages" && method === "GET") {
      const w = String(query.with || ""); if (!(await rd("SISMEMBER", "f:" + me.id, w))) throw err(403, "Not friends yet.");
      const since = +query.since || 0; const raw = await rd("LRANGE", convoKey(me.id, w), -150, -1);
      const msgs = raw.map(m => JSON.parse(m)).filter(m => m.ts > since);
      const seen = await rd("GET", "seen:" + w); const typing = await rd("GET", `typ:${w}:${me.id}`);
      return res.json({ messages: msgs, online: !!seen, typing: !!typing });
    }
    if (path === "messages" && method === "POST") {
      const to = String(body.to || ""); if (!(await rd("SISMEMBER", "f:" + me.id, to))) throw err(403, "Not friends yet.");
      if (await rd("SISMEMBER", "blk:" + to, me.id)) throw err(403, "Could not send.");
      const rl = await rd("INCR", `rl:msg:${me.id}:${Math.floor(Date.now() / 6e4)}`); if (rl > 60) throw err(429, "Slow down a little.");
      const kind = ["text", "file", "session", "session_join", "tune"].includes(body.kind) ? body.kind : "text";
      const msg = { id: crypto.randomUUID(), ts: Date.now(), from: me.id, kind, text: String(body.text || "").slice(0, 2000) };
      if (kind === "tune") msg.tune = true;
      if (kind === "session" || kind === "session_join") { const d = +body.session?.dur; msg.session = { id: String(body.session?.id || "").slice(0, 60), dur: [15, 25, 45].includes(d) ? d : 25 }; }
      if (kind === "file") {
        const f = body.file; if (!f || typeof f.data !== "string" || f.data.length > MAX_FILE_B64) throw err(413, "That file is too big. Photos are shrunk automatically; other files can be up to about 700 KB.");
        const fid = crypto.randomUUID(); await setJ("file:" + fid, { name: String(f.name || "file").slice(0, 120), type: String(f.type || "application/octet-stream").slice(0, 80), data: f.data, to, from: me.id }, "EX", 60 * 864e3);
        msg.file = { id: fid, name: String(f.name || "file").slice(0, 120), type: String(f.type || "application/octet-stream").slice(0, 80), size: Math.floor(f.data.length * 0.75) };
      }
      const ck = convoKey(me.id, to); await rdp([["RPUSH", ck, JSON.stringify(msg)], ["LTRIM", ck, -300, -1]]);
      bump("msgs"); return res.json({ message: msg });
    }
    if (path === "typing" && method === "POST") { await rd("SET", `typ:${me.id}:${String(body.to || "")}`, "1", "EX", 4); return res.json({ ok: true }); }
    if (path === "read" && method === "POST") { await rd("SET", `rd:${me.id}:${String(body.with || "")}`, String(Date.now())); return res.json({ ok: true }); }
    if (path === "file" && method === "GET") {
      const f = await getJ("file:" + String(query.id || "")); if (!f || (f.to !== me.id && f.from !== me.id)) throw err(404, "File not found.");
      res.setHeader("Content-Type", f.type); res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(f.name)}"`); return res.send(Buffer.from(f.data, "base64"));
    }
    if (path === "cal-feed-on" && method === "POST") {
      let tok = await rd("GET", "calu:" + me.id); if (!tok) { tok = crypto.randomBytes(18).toString("base64url"); await rdp([["SET", "calu:" + me.id, tok], ["SET", "calt:" + tok, me.id]]); }
      return res.json({ token: tok });
    }
    if (path === "cal-feed-off" && method === "POST") { const tok = await rd("GET", "calu:" + me.id); if (tok) await rdp([["DEL", "calt:" + tok], ["DEL", "calu:" + me.id], ["DEL", "cal:" + me.id]]); return res.json({ ok: true }); }
    if (path === "cal-feed-token" && method === "GET") { const tok = await rd("GET", "calu:" + me.id); return res.json({ token: tok || null }); }
    if (path === "cal-sync" && method === "POST") {
      const tok = await rd("GET", "calu:" + me.id); if (!tok) throw err(400, "Calendar feed is off.");
      const blocks = (Array.isArray(body.blocks) ? body.blocks : []).slice(0, 400).filter(b => b && /^\d{4}-\d{2}-\d{2}$/.test(String(b.day)) && Number.isFinite(+b.start) && Number.isFinite(+b.dur)).map(b => ({ id: String(b.id).slice(0, 60), title: String(b.title || "Block").slice(0, 120), day: String(b.day), start: Math.max(0, Math.min(1439, +b.start)), dur: Math.max(5, Math.min(600, +b.dur)), done: !!b.done }));
      await setJ("cal:" + me.id, blocks); return res.json({ ok: true, count: blocks.length });
    }
    if (path === "cal-import" && method === "POST") {
      const rl = await rd("INCR", `rl:cal:${me.id}:${Math.floor(Date.now() / 6e4)}`); if (rl > 10) throw err(429, "Slow down a little.");
      const text = await fetchIcs(body.url); return res.json({ events: eventsFromIcs(text) });
    }
    if (path === "feedback" && method === "POST") {
      if (!body.consent) throw err(400, "Sharing is off.");
      const rl = await rd("INCR", `rl:fb:${me.id}:${Math.floor(Date.now() / 36e5)}`); if (rl > 120) throw err(429, "Slow down a little.");
      const c = (v, n = 500) => String(v == null ? "" : v).replace(/[<>]/g, "").slice(0, n);
      const item = { ts: Date.now(), rating: body.rating === "up" ? "up" : "down", reason: c(body.reason, 40), flow: c(body.flow, 30), step: c(body.step, 30), prev: c(body.prev), user: c(body.user), reply: c(body.reply) };
      await rdp([["RPUSH", "fb", JSON.stringify(item)], ["LTRIM", "fb", -20000, -1]]); bump("fb"); return res.json({ ok: true });
    }
    if (path === "report" && method === "POST") {
      const rl = await rd("INCR", `rl:rep:${me.id}:${Math.floor(Date.now() / 36e5)}`); if (rl > 10) throw err(429, "Slow down a little.");
      const against = String(body.id || ""); if (against === me.id || !(await getJ("user:" + against))) throw err(404, "No such person.");
      const c = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").slice(0, n); const id = randomId();
      await setJ("rep:" + id, { id, from: me.id, against, reason: c(body.reason, 40) || "Other", text: c(body.text, 500), ts: Date.now(), status: "open" }); await rd("RPUSH", "reps", id); return res.json({ ok: true });
    }
    if (path === "password" && method === "POST") {
      if (!checkPw(String(body.password || ""), me.pw)) throw err(401, "Wrong password.");
      const np = String(body.newPassword || ""); if (np.length < 8) throw err(400, "New password needs at least 8 characters.");
      me.pw = hashPw(np); me.pwv = (me.pwv || 0) + 1; await setJ("user:" + me.id, me); return res.json({ token: tokenFor(me) });
    }
    if (await adminRoute(path, method, { me, body, query, res })) return;
    if (path === "account" && method === "DELETE") {
      if (!checkPw(String(body.password || ""), me.pw)) throw err(401, "Wrong password.");
      await deleteAccount(me); return res.json({ ok: true });
    }
    throw err(404, "Not found");
  } catch (e) {
    const status = e.status || 500; if (status === 500) console.error(e);
    res.status(status).json({ error: status === 503 ? "The server is not set up yet." : e.message || "Something went wrong." });
  }
}
