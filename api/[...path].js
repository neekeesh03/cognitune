// Cognitune backend: accounts, friends, messages and attachments.
// Runs as a Vercel serverless function. Data lives in Upstash Redis (connected through Vercel Storage).
import crypto from "node:crypto";

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const SECRET = process.env.SESSION_SECRET || TOKEN || "dev-only-secret";
const IS_PROD = !!process.env.VERCEL;

// ---------- storage (Redis REST, or in-memory for local testing only) ----------
const mem = globalThis.__cogMem || (globalThis.__cogMem = { kv: new Map(), exp: new Map() });
function memRun([cmd, ...a]) {
  const { kv, exp } = mem; cmd = cmd.toUpperCase();
  const alive = k => { const e = exp.get(k); if (e && e < Date.now()) { kv.delete(k); exp.delete(k); } return kv.has(k); };
  switch (cmd) {
    case "GET": return alive(a[0]) ? kv.get(a[0]) : null;
    case "SET": kv.set(a[0], String(a[1])); if (a[2] === "EX") exp.set(a[0], Date.now() + a[3] * 1000); if (a[2] === "NX") { /* handled below */ } return "OK";
    case "SETNX": if (alive(a[0])) return 0; kv.set(a[0], String(a[1])); return 1;
    case "DEL": return a.reduce((n, k) => n + (kv.delete(k) ? 1 : 0), 0);
    case "SADD": { const s = alive(a[0]) ? kv.get(a[0]) : new Set(); a.slice(1).forEach(x => s.add(x)); kv.set(a[0], s); return 1; }
    case "SREM": { const s = alive(a[0]) ? kv.get(a[0]) : null; if (s) a.slice(1).forEach(x => s.delete(x)); return 1; }
    case "SMEMBERS": return alive(a[0]) ? [...kv.get(a[0])] : [];
    case "SISMEMBER": return alive(a[0]) && kv.get(a[0]).has(a[1]) ? 1 : 0;
    case "RPUSH": { const l = alive(a[0]) ? kv.get(a[0]) : []; l.push(a[1]); kv.set(a[0], l); return l.length; }
    case "LRANGE": { const l = alive(a[0]) ? kv.get(a[0]) : []; const s = +a[1] < 0 ? l.length + +a[1] : +a[1], e = +a[2] < 0 ? l.length + +a[2] : +a[2]; return l.slice(Math.max(0, s), e + 1); }
    case "LTRIM": { const l = alive(a[0]) ? kv.get(a[0]) : []; const s = +a[1] < 0 ? l.length + +a[1] : +a[1]; kv.set(a[0], l.slice(Math.max(0, s))); return "OK"; }
    case "INCR": { const v = (alive(a[0]) ? +kv.get(a[0]) : 0) + 1; kv.set(a[0], String(v)); return v; }
    case "EXPIRE": exp.set(a[0], Date.now() + a[1] * 1000); return 1;
    case "ZADD": { const z = alive(a[0]) ? kv.get(a[0]) : new Set(); z.add(a[2]); kv.set(a[0], z); return 1; }
    case "ZREM": { const z = alive(a[0]) ? kv.get(a[0]) : null; if (z) z.delete(a[1]); return 1; }
    case "ZRANGEBYLEX": { const z = alive(a[0]) ? [...kv.get(a[0])].sort() : []; const lo = a[1].slice(1), hi = a[2].slice(1); return z.filter(x => x >= lo && x <= hi).slice(0, 8); }
    default: throw new Error("mem: unsupported " + cmd);
  }
}
async function rd(...cmd) {
  if (!URL_) { if (IS_PROD) throw Object.assign(new Error("storage"), { status: 503 }); return memRun(cmd); }
  const r = await fetch(URL_, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json(); if (j.error) throw new Error(j.error); return j.result;
}
async function rdp(cmds) {
  if (!URL_) return cmds.map(memRun);
  const r = await fetch(URL_ + "/pipeline", { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(cmds) });
  const j = await r.json(); return j.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}
const getJ = async k => { const v = await rd("GET", k); return v ? JSON.parse(v) : null; };
const setJ = (k, v, ...rest) => rd("SET", k, JSON.stringify(v), ...rest);

// ---------- helpers ----------
const b64u = b => Buffer.from(b).toString("base64url");
const sign = (p) => { const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" })), b = b64u(JSON.stringify(p)); return `${h}.${b}.${crypto.createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url")}`; };
function verify(t) { try { const [h, b, s] = t.split("."); const ok = crypto.createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url"); if (s.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(ok))) return null; const p = JSON.parse(Buffer.from(b, "base64url")); return p.exp > Date.now() / 1000 ? p : null; } catch { return null; } }
const hashPw = (pw, salt = crypto.randomBytes(16).toString("hex")) => `${salt}:${crypto.scryptSync(pw, salt, 64).toString("hex")}`;
const checkPw = (pw, stored) => { const [salt, h] = stored.split(":"); const x = crypto.scryptSync(pw, salt, 64).toString("hex"); return crypto.timingSafeEqual(Buffer.from(x), Buffer.from(h)); };
const AV = { s: 10, p: 8, e: 6, m: 5, a: 8, c: 4 };
const avKey = a => `${a.s}-${a.p}-${a.e}-${a.m}-${a.a}-${a.c}`;
const avValid = a => a && Object.keys(AV).every(k => Number.isInteger(a[k]) && a[k] >= 0 && a[k] < AV[k]);
const avRandom = () => Object.fromEntries(Object.entries(AV).map(([k, n]) => [k, Math.floor(Math.random() * n)]));
const pub = u => ({ id: u.id, username: u.username, name: u.name, avatar: u.avatar });
const err = (status, message) => Object.assign(new Error(message), { status });
const cleanName = s => String(s || "").replace(/[<>]/g, "").trim().slice(0, 30);
const convoKey = (a, b) => `c:${[a, b].sort().join(":")}`;
const MAX_FILE_B64 = 1_000_000; // about 750 KB of file data

async function claimAvatar(userId, av) {
  const k = "av:" + avKey(av); const ok = await rd("SETNX", k, userId); if (ok) return true;
  return (await rd("GET", k)) === userId;
}

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
      await setJ("user:" + id, user); await rd("ZADD", "users:z", 0, username);
      return res.json({ token: sign({ sub: id, exp: Math.floor(Date.now() / 1000) + 30 * 864e5 }), user: pub(user) });
    }
    if (path === "login" && method === "POST") {
      const rl = await rd("INCR", `rl:login:${ip}:${Math.floor(Date.now() / 6e4)}`); if (rl > 15) throw err(429, "Too many tries. Wait a minute.");
      const username = String(body.username || "").toLowerCase().trim(); const id = await rd("GET", "u:" + username); const user = id && await getJ("user:" + id);
      if (!user || !checkPw(String(body.password || ""), user.pw)) throw err(401, "Wrong username or password.");
      return res.json({ token: sign({ sub: id, exp: Math.floor(Date.now() / 1000) + 30 * 864e5 }), user: pub(user) });
    }

    // ----- everything below needs a signed-in user -----
    const auth = String(req.headers.authorization || "").replace(/^Bearer /, ""); const claims = verify(auth);
    if (!claims) throw err(401, "Please sign in.");
    const me = await getJ("user:" + claims.sub); if (!me) throw err(401, "Please sign in.");
    await rd("SET", "seen:" + me.id, "1", "EX", 45);

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
      return res.json({ user: pub(me), friends, incoming: inIds.filter(i => byId[i]).map(i => pub(byId[i])), outgoing: outIds.filter(i => byId[i]).map(i => pub(byId[i])), blocked: blocked.length });
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
    if (path === "friends/request" && method === "POST") {
      const rl = await rd("INCR", `rl:fr:${me.id}:${Math.floor(Date.now() / 36e5)}`); if (rl > 30) throw err(429, "Slow down a little.");
      const uname = String(body.username || "").toLowerCase().trim(); const tid = await rd("GET", "u:" + uname);
      if (!tid) throw err(404, "No one with that username."); if (tid === me.id) throw err(400, "That is you!");
      if (await rd("SISMEMBER", "blk:" + tid, me.id)) throw err(404, "No one with that username.");
      if (await rd("SISMEMBER", "f:" + me.id, tid)) return res.json({ ok: true, status: "friends" });
      if (await rd("SISMEMBER", "fout:" + tid, me.id)) { await rdp([["SADD", "f:" + me.id, tid], ["SADD", "f:" + tid, me.id], ["SREM", "fout:" + tid, me.id], ["SREM", "fin:" + me.id, tid]]); return res.json({ ok: true, status: "friends" }); }
      await rdp([["SADD", "fout:" + me.id, tid], ["SADD", "fin:" + tid, me.id]]); return res.json({ ok: true, status: "sent" });
    }
    if (path === "friends/respond" && method === "POST") {
      const id = String(body.id || ""); if (!(await rd("SISMEMBER", "fin:" + me.id, id))) throw err(404, "No such request.");
      const cmds = [["SREM", "fin:" + me.id, id], ["SREM", "fout:" + id, me.id]]; if (body.accept) cmds.push(["SADD", "f:" + me.id, id], ["SADD", "f:" + id, me.id]);
      await rdp(cmds); return res.json({ ok: true });
    }
    if (path === "friends/remove" && method === "POST") {
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
      return res.json({ message: msg });
    }
    if (path === "typing" && method === "POST") { await rd("SET", `typ:${me.id}:${String(body.to || "")}`, "1", "EX", 4); return res.json({ ok: true }); }
    if (path === "read" && method === "POST") { await rd("SET", `rd:${me.id}:${String(body.with || "")}`, String(Date.now())); return res.json({ ok: true }); }
    if (path === "file" && method === "GET") {
      const f = await getJ("file:" + String(query.id || "")); if (!f || (f.to !== me.id && f.from !== me.id)) throw err(404, "File not found.");
      res.setHeader("Content-Type", f.type); res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(f.name)}"`); return res.send(Buffer.from(f.data, "base64"));
    }
    if (path === "account" && method === "DELETE") {
      if (!checkPw(String(body.password || ""), me.pw)) throw err(401, "Wrong password.");
      const fr = await rd("SMEMBERS", "f:" + me.id); const cmds = [["DEL", "u:" + me.username], ["ZREM", "users:z", me.username], ["DEL", "user:" + me.id], ["DEL", "av:" + avKey(me.avatar)], ["DEL", "f:" + me.id], ["DEL", "fin:" + me.id], ["DEL", "fout:" + me.id], ["DEL", "blk:" + me.id]];
      fr.forEach(f => cmds.push(["SREM", "f:" + f, me.id], ["DEL", convoKey(me.id, f)])); await rdp(cmds); return res.json({ ok: true });
    }
    throw err(404, "Not found");
  } catch (e) {
    const status = e.status || 500; if (status === 500) console.error(e);
    res.status(status).json({ error: status === 503 ? "The server is not set up yet." : e.message || "Something went wrong." });
  }
}
