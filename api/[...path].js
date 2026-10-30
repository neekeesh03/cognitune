// Lagomo backend: accounts, friends, messages, calendar and the admin panel.
// Runs as one Vercel serverless function. Data lives in Upstash Redis. Helpers live in _core.js, _calendar.js and _admin.js.
import crypto from "node:crypto";
import { T as TT, LANGS as LANG_CODES } from "./_i18n.js";
import { pushPublicKey, saveSub, dropSub, pushTo } from "./_push.js";
import { dayStr, lastDays, rd, rdp, getJ, setJ, err, URL_, IS_PROD, verify, tokenFor, hashPw, checkPw, claimAvatar, okPk, okWk, okSealed, avKey, avValid, avRandom, pub, selfPub, cleanName, convoKey, isAdmin, touchActive, bump, deleteAccount, randomId } from "./_core.js";
import { feedIcs, fetchIcs, eventsFromIcs } from "./_calendar.js";
import { adminRoute } from "./_admin.js";
import { track, pulseEligible, pulseAnswer, landingHit, joinWaitlist } from "./_exp.js";
import { verifyGoogleToken, cleanUsernameFrom } from "./_google.js";
const GOOGLE_ID = () => process.env.GOOGLE_CLIENT_ID || "";

const MAX_FILE_B64 = 1_100_000; // about 750 KB of file data
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
      if (okPk(body.pk) && okWk(body.wk)) { user.pk = body.pk; user.wk = body.wk; }
      await setJ("user:" + id, user); await rd("ZADD", "users:z", 0, username); bump("signups");
      return res.json({ token: tokenFor(user), user: pub(user) });
    }
    if (path === "login" && method === "POST") {
      const rl = await rd("INCR", `rl:login:${ip}:${Math.floor(Date.now() / 6e4)}`); if (rl > 15) throw err(429, "Too many tries. Wait a minute.");
      const username = String(body.username || "").toLowerCase().trim(); const id = await rd("GET", "u:" + username); const user = id && await getJ("user:" + id);
      if (!user || !user.pw || !checkPw(String(body.password || ""), user.pw)) throw err(401, "Wrong username or password.");
      if (user.suspended) throw err(403, "This account is paused. Please contact the Lagomo team.");
      return res.json({ token: tokenFor(user), user: selfPub(user), keys: user.pk && user.wk ? { pk: user.pk, wk: user.wk } : null });
    }

    if (path === "hit" && method === "POST") { await landingHit(ip, body); return res.json({ ok: true }); }
    if (path === "waitlist" && method === "POST") { await joinWaitlist(ip, body); return res.json({ ok: true }); }
    if (path === "config" && method === "GET") return res.json({ googleClientId: GOOGLE_ID() || null });
    if (path === "google" && method === "POST") {
      if (!GOOGLE_ID()) throw err(503, "Google sign-in is not set up yet.");
      const rl = await rd("INCR", `rl:g:${ip}:${Math.floor(Date.now() / 6e4)}`); if (rl > 20) throw err(429, "Too many tries. Wait a minute.");
      const g = await verifyGoogleToken(body.credential, GOOGLE_ID()); if (!g) throw err(401, "Google could not confirm who you are. Please try again.");
      let id = await rd("GET", "g:" + g.sub), user = id && await getJ("user:" + id), isNew = false;
      if (!user) {
        isNew = true; id = crypto.randomUUID(); const base = cleanUsernameFrom(g.email, g.name); let username = base, n = 0;
        while (!(await rd("SETNX", "u:" + username, id))) { username = base + String(Math.floor(100 + Math.random() * 900)); if (++n > 30) throw err(500, "Could not pick a username."); }
        let av = avRandom(), tries = 0; while (!(await claimAvatar(id, av))) { av = avRandom(); if (++tries > 40) throw err(500, "Could not pick an avatar."); }
        user = { id, username, name: cleanName(g.given_name || g.name) || username, avatar: av, pw: null, gsub: g.sub, created: Date.now() };
        await setJ("user:" + id, user); await rdp([["SET", "g:" + g.sub, id], ["ZADD", "users:z", 0, username]]); bump("signups");
      }
      if (user.suspended) throw err(403, "This account is paused. Please contact the Lagomo team.");
      return res.json({ token: tokenFor(user), user: selfPub(user), isNew, keys: user.pk && user.wk ? { pk: user.pk, wk: user.wk } : null });
    }

    if (path === "cal-feed" && method === "GET") {
      const tok = String(query.t || ""); const uid = tok ? await rd("GET", "calt:" + tok) : null; if (!uid) throw err(404, "Not found");
      const blocks = (await getJ("cal:" + uid)) || []; res.setHeader("Content-Type", "text/calendar; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); return res.send(feedIcs(blocks));
    }

    // Daily nudge sender. Called every 10 minutes by a free GitHub Actions schedule. Safe to call by anyone: it only
    // sends what is due, at most one per person per day, and does nothing for people who already started or are in the app.
    if (path === "cron-remind") {
      const nowMin = new Date().getUTCHours() * 60 + new Date().getUTCMinutes(); const cur = Math.floor(nowMin / 10); const day = dayStr();
      const buckets = [cur, (cur + 143) % 144, (cur + 142) % 144]; const lists = await rdp(buckets.map(b => ["SMEMBERS", "remb:" + b]));
      const ids = [...new Set(lists.flat())].slice(0, 300); let sent = 0, skipped = 0;
      for (const id of ids) {
        if (!(await rd("SETNX", `remd:${id}:${day}`, "1"))) { skipped++; continue; } await rd("EXPIRE", `remd:${id}:${day}`, 172800);
        if (await rd("SISMEMBER", "sd:" + id, day)) { skipped++; continue; }
        const u = await getJ("user:" + id); if (!u || u.suspended) { skipped++; continue; }
        const fids = ((await rd("SMEMBERS", "f:" + id)) || []).slice(0, 8); let who = "";
        for (const f of fids) { if (await rd("SISMEMBER", "sd:" + f, day)) { const fu = await getJ("user:" + f); if (fu) { who = fu.name.split(" ")[0]; break; } } }
        const dk = "daily" + (new Date().getUTCDate() % 3);
        const n = await pushTo(id, l => ({ title: "Lagomo", body: who ? TT(l, "friendHop", who) : TT(l, dk), tag: "daily", url: "/" }), {}); if (n) sent++; else skipped++;
      }
      return res.json({ ok: true, due: ids.length, sent, skipped });
    }

    // ----- everything below needs a signed-in user -----
    const auth = String(req.headers.authorization || "").replace(/^Bearer /, ""); const claims = verify(auth);
    if (!claims) throw err(401, "Please sign in.");
    const me = await getJ("user:" + claims.sub); if (!me || (claims.v || 0) !== (me.pwv || 0)) throw err(401, "Please sign in.");
    if (me.suspended) throw err(403, "This account is paused. Please contact the Lagomo team.");
    const nowTs = String(Date.now()); await rdp([["SET", "seen:" + me.id, nowTs, "EX", 120], ["SET", "ls:" + me.id, nowTs, "EX", 7 * 864e3]]); touchActive(me.id).catch(() => {});
    const isOn = v => !!v && (v === "1" || Date.now() - (+v || 0) < 50000);

    if (path === "me" && method === "GET") {
      const [friendIds, inIds, outIds, blocked] = await rdp([["SMEMBERS", "f:" + me.id], ["SMEMBERS", "fin:" + me.id], ["SMEMBERS", "fout:" + me.id], ["SMEMBERS", "blk:" + me.id]]);
      const ids = [...new Set([...friendIds, ...inIds, ...outIds])];
      const users = ids.length ? (await rdp(ids.map(i => ["GET", "user:" + i]))).map(v => v && JSON.parse(v)).filter(Boolean) : [];
      const seen = ids.length ? await rdp(ids.map(i => ["GET", "seen:" + i])) : [];
      const online = Object.fromEntries(ids.map((i, n) => [i, isOn(seen[n])]));
      const lasts2 = ids.length ? await rdp(ids.map(i => ["GET", "ls:" + i])) : []; const lastSeen = Object.fromEntries(ids.map((i, n) => [i, +(lasts2[n] || 0) || null]));
      const byId = Object.fromEntries(users.map(u => [u.id, u]));
      const reads = friendIds.length ? await rdp(friendIds.map(f => ["GET", `rd:${me.id}:${f}`])) : [];
      const lasts = friendIds.length ? await rdp(friendIds.map(f => ["LRANGE", convoKey(me.id, f), -40, -1])) : [];
      const friends = friendIds.filter(i => byId[i]).map((i, n) => {
        const msgs = (lasts[n] || []).map(m => JSON.parse(m)); const lr = +(reads[n] || 0);
        const shown = msgs.filter(m => m.kind !== "react"); const last = shown[shown.length - 1];
        return { ...pub(byId[i]), online: online[i], lastSeen: lastSeen[i], unread: shown.filter(m => m.from === i && m.ts > lr).length, last: last ? { enc: last.enc || null, text: last.enc ? "" : last.kind === "file" ? "Sent a file" : last.kind === "session" ? "Focus invite" : last.text, ts: last.ts, mine: last.from === me.id } : null };
      });
      const feedTok = await rd("GET", "calu:" + me.id); return res.json({ user: selfPub(me), admin: await isAdmin(me), announce: await getJ("announce"), calFeed: !!feedTok, friends, incoming: inIds.filter(i => byId[i]).map(i => pub(byId[i])), outgoing: outIds.filter(i => byId[i]).map(i => pub(byId[i])), blocked: blocked.length });
    }
    if (path === "ev" && method === "POST") { const rl = await rd("INCR", `rl:ev:${me.id}:${Math.floor(Date.now() / 6e4)}`); if (rl > 120) return res.json({ ok: true }); await track(me, String(body.name || ""), body.props || {}); return res.json({ ok: true }); }
    if (path === "session-ping" && method === "POST") {
      const sid = String(body.sid || "").slice(0, 60), w = String(body.w || ""), st = ["waiting", "working", "done", "left"].includes(body.state) ? body.state : "waiting";
      if (!sid || !(await rd("SISMEMBER", "f:" + me.id, w))) throw err(403, "Not friends yet.");
      await rd("SET", `sp:${sid}:${me.id}`, JSON.stringify({ state: st, ts: Date.now() }), "EX", 40); return res.json({ ok: true });
    }
    if (path === "session-state" && method === "GET") {
      const sid = String(query.sid || "").slice(0, 60), w = String(query.w || "");
      if (!sid || !(await rd("SISMEMBER", "f:" + me.id, w))) throw err(403, "Not friends yet.");
      const v = await getJ(`sp:${sid}:${w}`); return res.json({ state: v && Date.now() - v.ts < 30000 ? v.state : "none" });
    }
    if (path === "reminder" && method === "GET") return res.json({ reminder: (await getJ("rem:" + me.id)) || null });
    if (path === "reminder" && method === "POST") {
      const m = /^(\d{2}):(\d{2})$/.exec(String(body.time || "")); const tz = Math.round(+body.tz);
      if (!m || +m[1] > 23 || +m[2] > 59 || !Number.isFinite(tz) || Math.abs(tz) > 840) throw err(400, "Pick a time like 08:30.");
      const utc = (((+m[1] * 60 + +m[2] + tz) % 1440) + 1440) % 1440; const bucket = Math.floor(utc / 10);
      const old = await getJ("rem:" + me.id); if (old && old.bucket !== bucket) await rd("SREM", "remb:" + old.bucket, me.id);
      await rd("SADD", "remb:" + bucket, me.id); await setJ("rem:" + me.id, { time: body.time, tz, bucket }); return res.json({ ok: true });
    }
    if (path === "reminder" && method === "DELETE") { const old = await getJ("rem:" + me.id); if (old) await rd("SREM", "remb:" + old.bucket, me.id); await rd("DEL", "rem:" + me.id); return res.json({ ok: true }); }
    if (path === "lang" && method === "POST") { const l = String(body.lang || ""); if (!LANG_CODES.includes(l)) throw err(400, "Unknown language."); await rd("SET", "lang:" + me.id, l); return res.json({ ok: true }); }
    if (path === "ping" && method === "POST") return res.json({ ok: true });
    if (path === "push-key" && method === "GET") return res.json({ key: await pushPublicKey() });
    if (path === "push-sub" && method === "POST") { await saveSub(me, body.sub); return res.json({ ok: true }); }
    if (path === "push-sub" && method === "DELETE") { await dropSub(me, String(body.endpoint || "")); return res.json({ ok: true }); }
    if (path === "burrow" && method === "GET") {
      const days = lastDays(7); const fids = (await rd("SMEMBERS", "f:" + me.id)) || [];
      const mine = new Set((await rd("SMEMBERS", "sd:" + me.id)) || []);
      const theirs = fids.length ? await rdp(fids.map(f => ["SMEMBERS", "sd:" + f])) : [];
      const pairs = {};
      fids.forEach((f, i) => { const t = new Set(theirs[i] || []); pairs[f] = { both: days.filter(d => mine.has(d) && t.has(d)).length, either: days.filter(d => mine.has(d) || t.has(d)).length, mine: days.filter(d => mine.has(d)).length }; });
      return res.json({ pairs, starters: (await rd("SCARD", "hd:" + dayStr())) || 0 });
    }
    // "Hopped in": a private, text-free signal that you started today. Friends only.
    if (path === "hop" && method === "POST") {
      const n = await rd("INCR", `rl:hop:${me.id}:${dayStr()}`); await rd("EXPIRE", `rl:hop:${me.id}:${dayStr()}`, 172800);
      if (n > 40) return res.json({ ok: true });
      await rd("SET", "hop:" + me.id, JSON.stringify({ ts: Date.now() }), "EX", 129600);
      await bump("hop");
      await rdp([["SADD", "sd:" + me.id, dayStr()], ["EXPIRE", "sd:" + me.id, 45 * 86400], ["SADD", "hd:" + dayStr(), me.id], ["EXPIRE", "hd:" + dayStr(), 3 * 86400]]);
      if (await rd("SETNX", `hopp:${me.id}:${dayStr()}`, "1")) { await rd("EXPIRE", `hopp:${me.id}:${dayStr()}`, 172800); const fids = (await rd("SMEMBERS", "f:" + me.id)) || []; await Promise.all(fids.map(f => pushTo(f, l => ({ title: TT(l, "hopped", me.name), body: TT(l, "hopBody"), tag: "hop:" + me.id }), { limitKey: `rl:hoppush:${f}:${dayStr()}`, limit: 4 }))); }
      return res.json({ ok: true });
    }
    if (path === "hops" && method === "GET") {
      const fids = await rd("SMEMBERS", "f:" + me.id); const ids = Array.isArray(fids) ? fids : [];
      const vals = ids.length ? await rdp(ids.map(i => ["GET", "hop:" + i])) : [];
      const hops = {}; ids.forEach((i, k) => { if (vals[k]) { const v = JSON.parse(vals[k]); if (Date.now() - v.ts < 12 * 36e5) hops[i] = { ts: v.ts }; } });
      const raw = await rd("LRANGE", "cheer:" + me.id, 0, 19); const cheers = (Array.isArray(raw) ? raw : []).map(x => JSON.parse(x)).filter(c => Date.now() - c.ts < 12 * 36e5);
      return res.json({ hops, cheers });
    }
    if (path === "cheer" && method === "POST") {
      const to = String(body.to || ""); if (!(await rd("SISMEMBER", "f:" + me.id, to))) throw err(403, "Not friends yet.");
      const n = await rd("INCR", `rl:cheer:${me.id}:${dayStr()}`); await rd("EXPIRE", `rl:cheer:${me.id}:${dayStr()}`, 172800); if (n > 80) return res.json({ ok: true });
      await rdp([["LPUSH", "cheer:" + to, JSON.stringify({ from: me.id, ts: Date.now() })], ["LTRIM", "cheer:" + to, 0, 19], ["EXPIRE", "cheer:" + to, 172800]]);
      await bump("cheer"); await pushTo(to, l => ({ title: TT(l, "cheered", me.name), body: TT(l, "cheerBody"), tag: "cheer:" + me.id }), { limitKey: `rl:cheerpush:${to}:${dayStr()}`, limit: 10 }); return res.json({ ok: true });
    }
    if (path === "room-create" && method === "POST") {
      const sid = String(body.sid || "").slice(0, 60), inv = [...new Set((Array.isArray(body.inv) ? body.inv : []).map(String))].slice(0, 5);
      if (!sid || !inv.length) throw err(400, "Pick at least one friend.");
      if (await rd("SCARD", "rm:" + sid)) throw err(409, "That room already exists.");
      for (const f of inv) if (!(await rd("SISMEMBER", "f:" + me.id, f))) throw err(403, "You can only invite friends.");
      await rd("SADD", "rm:" + sid, me.id, ...inv); await rd("EXPIRE", "rm:" + sid, 21600); return res.json({ ok: true });
    }
    if (path === "room-ping" && method === "POST") {
      const sid = String(body.sid || "").slice(0, 60), st = ["waiting", "working", "done", "left"].includes(body.state) ? body.state : "waiting";
      if (!sid || !(await rd("SISMEMBER", "rm:" + sid, me.id))) throw err(403, "You are not in this room.");
      await rd("SET", `sp:${sid}:${me.id}`, JSON.stringify({ state: st, ts: Date.now() }), "EX", 40);
      const ids = ((await rd("SMEMBERS", "rm:" + sid)) || []).filter(i => i !== me.id);
      const us = ids.length ? (await rdp(ids.map(i => ["GET", "user:" + i]))).map(v => v && JSON.parse(v)) : [];
      const sts = ids.length ? await rdp(ids.map(i => ["GET", `sp:${sid}:${i}`])) : [];
      return res.json({ members: ids.map((i, n) => { const u = us[n]; const v = sts[n] && JSON.parse(sts[n]); return u ? { id: i, name: u.name, avatar: u.avatar, state: v && Date.now() - v.ts < 30000 ? v.state : "none" } : null; }).filter(Boolean) });
    }
    if (path === "pulse-check" && method === "GET") return res.json({ eligible: await pulseEligible(me) });
    if (path === "pulse" && method === "POST") { if (!(await pulseEligible(me))) throw err(400, "Not right now."); await pulseAnswer(me, body); return res.json({ ok: true }); }
    if (path === "keys" && method === "GET") return res.json({ keys: me.pk && me.wk ? { pk: me.pk, wk: me.wk } : null });
    if (path === "keys" && method === "POST") {
      if (!okPk(body.pk) || !okWk(body.wk)) throw err(400, "Bad keys."); me.pk = body.pk; me.wk = body.wk; await setJ("user:" + me.id, me); return res.json({ ok: true });
    }
    if (path === "profile" && method === "POST") {
      if (body.name != null) me.name = cleanName(body.name) || me.name;
      if (body.avatar) {
        if (!avValid(body.avatar)) throw err(400, "Bad avatar.");
        if (avKey(body.avatar) !== avKey(me.avatar)) { if (!(await claimAvatar(me.id, body.avatar))) throw err(409, "Someone already has that exact avatar. Try another."); await rd("DEL", "av:" + avKey(me.avatar)); me.avatar = body.avatar; }
      }
      await setJ("user:" + me.id, me); return res.json({ user: selfPub(me) });
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
      await rdp([["SADD", "fout:" + me.id, tid], ["SADD", "fin:" + tid, me.id]]); await pushTo(tid, l => ({ title: TT(l, "frTitle"), body: TT(l, "frBody", me.name), tag: "fr:" + me.id }), { limitKey: `rl:frpush:${tid}:${dayStr()}`, limit: 10 }); return res.json({ ok: true, status: "sent" });
    }
    if (path === "friend-respond" && method === "POST") {
      const id = String(body.id || ""); if (!(await rd("SISMEMBER", "fin:" + me.id, id))) throw err(404, "No such request.");
      const cmds = [["SREM", "fin:" + me.id, id], ["SREM", "fout:" + id, me.id]]; if (body.accept) cmds.push(["SADD", "f:" + me.id, id], ["SADD", "f:" + id, me.id]);
      await rdp(cmds); if (body.accept) await pushTo(id, l => ({ title: TT(l, "frOkTitle", me.name), body: TT(l, "frOkBody"), tag: "fr:" + me.id }), { limitKey: `rl:frpush:${id}:${dayStr()}`, limit: 10 }); return res.json({ ok: true });
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
      return res.json({ messages: msgs, online: isOn(seen), typing: !!typing });
    }
    if (path === "messages" && method === "POST") {
      const to = String(body.to || ""); if (!(await rd("SISMEMBER", "f:" + me.id, to))) throw err(403, "Not friends yet.");
      if (await rd("SISMEMBER", "blk:" + to, me.id)) throw err(403, "Could not send.");
      const rl = await rd("INCR", `rl:msg:${me.id}:${Math.floor(Date.now() / 6e4)}`); if (rl > 60) throw err(429, "Slow down a little.");
      const kind = ["text", "file", "session", "session_join", "react"].includes(body.kind) ? body.kind : "text";
      if (!okSealed(body.enc)) throw err(400, "Please update the app: messages must be encrypted.");
      const msg = { id: crypto.randomUUID(), ts: Date.now(), from: me.id, kind, enc: body.enc };
      if (kind === "file") {
        const f = body.file; if (!f || typeof f.data !== "string" || f.data.length > MAX_FILE_B64 || !/^[\w+/=]+$/.test(f.data)) throw err(413, "That file is too big. Photos are shrunk automatically; other files can be up to about 700 KB.");
        const fid = crypto.randomUUID(); await setJ("file:" + fid, { data: f.data, to, from: me.id }, "EX", 60 * 864e3); msg.fileId = fid;
      }
      const ck = convoKey(me.id, to); await rdp([["RPUSH", ck, JSON.stringify(msg)], ["LTRIM", ck, -300, -1]]);
      bump("msgs");
      await pushTo(to, l => ({ title: me.name, body: kind === "file" ? TT(l, "msgFile") : kind === "react" ? TT(l, "msgReact") : kind.startsWith("session") ? TT(l, "msgSession") : TT(l, "msgText"), tag: "msg:" + me.id }), { limitKey: `rl:msgpush:${to}:${me.id}:${Math.floor(Date.now() / 3e5)}`, limit: 3 });
      return res.json({ message: msg });
    }
    if (path === "typing" && method === "POST") { await rd("SET", `typ:${me.id}:${String(body.to || "")}`, "1", "EX", 4); return res.json({ ok: true }); }
    if (path === "read" && method === "POST") { await rd("SET", `rd:${me.id}:${String(body.with || "")}`, String(Date.now())); return res.json({ ok: true }); }
    if (path === "file" && method === "GET") {
      const f = await getJ("file:" + String(query.id || "")); if (!f || (f.to !== me.id && f.from !== me.id)) throw err(404, "File not found.");
      res.setHeader("Content-Type", f.type || "application/octet-stream"); return res.send(Buffer.from(f.data, "base64"));
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
    if (path === "report" && method === "POST") {
      const rl = await rd("INCR", `rl:rep:${me.id}:${Math.floor(Date.now() / 36e5)}`); if (rl > 10) throw err(429, "Slow down a little.");
      const against = String(body.id || ""); if (against === me.id || !(await getJ("user:" + against))) throw err(404, "No such person.");
      const c = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").slice(0, n); const id = randomId();
      await setJ("rep:" + id, { id, from: me.id, against, reason: c(body.reason, 40) || "Other", text: c(body.text, 500), ts: Date.now(), status: "open" }); await rd("RPUSH", "reps", id); return res.json({ ok: true });
    }
    if (path === "password" && method === "POST") {
      if (!me.pw) throw err(400, "This account signs in with Google. It has no password.");
      if (!checkPw(String(body.password || ""), me.pw)) throw err(401, "Wrong password.");
      const np = String(body.newPassword || ""); if (np.length < 8) throw err(400, "New password needs at least 8 characters.");
      if (me.wk) { if (!okWk(body.wk)) throw err(400, "Missing key update."); me.wk = body.wk; }
      me.pw = hashPw(np); me.pwv = (me.pwv || 0) + 1; await setJ("user:" + me.id, me); return res.json({ token: tokenFor(me) });
    }
    if (await adminRoute(path, method, { me, body, query, res })) return;
    if (path === "account" && method === "DELETE") {
      if (me.pw) { if (!checkPw(String(body.password || ""), me.pw)) throw err(401, "Wrong password."); }
      else if (String(body.confirm || "").toLowerCase() !== me.username) throw err(401, "Type your username exactly to confirm.");
      await deleteAccount(me); return res.json({ ok: true });
    }
    throw err(404, "Not found");
  } catch (e) {
    const status = e.status || 500; if (status === 500) console.error(e);
    res.status(status).json({ error: status === 503 ? "The server is not set up yet." : e.message || "Something went wrong." });
  }
}
