// Shared backend pieces: storage, auth, helpers. Files starting with "_" are not exposed as routes by Vercel.
import crypto from "node:crypto";

export const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
export const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const SECRET = process.env.SESSION_SECRET || TOKEN || "dev-only-secret";
export const IS_PROD = !!process.env.VERCEL;
export const err = (status, message) => Object.assign(new Error(message), { status });

// ---------- storage (Redis REST, or in-memory for local testing only) ----------
const mem = globalThis.__cogMem || (globalThis.__cogMem = { kv: new Map(), exp: new Map() });
const sliceIdx = (l, a, b) => { const s = +a < 0 ? Math.max(0, l.length + +a) : +a, e = +b < 0 ? l.length + +b : +b; return l.slice(s, e + 1); };
function memRun([cmd, ...a]) {
  const { kv, exp } = mem; cmd = cmd.toUpperCase();
  const alive = k => { const e = exp.get(k); if (e && e < Date.now()) { kv.delete(k); exp.delete(k); } return kv.has(k); };
  switch (cmd) {
    case "GET": return alive(a[0]) ? kv.get(a[0]) : null;
    case "MGET": return a.map(k => (alive(k) ? kv.get(k) : null));
    case "SET": kv.set(a[0], String(a[1])); if (a[2] === "EX") exp.set(a[0], Date.now() + a[3] * 1000); return "OK";
    case "SETNX": if (alive(a[0])) return 0; kv.set(a[0], String(a[1])); return 1;
    case "DEL": return a.reduce((n, k) => n + (kv.delete(k) ? 1 : 0), 0);
    case "EXISTS": return alive(a[0]) ? 1 : 0;
    case "SADD": { const s = alive(a[0]) ? kv.get(a[0]) : new Set(); a.slice(1).forEach(x => s.add(x)); kv.set(a[0], s); return 1; }
    case "SREM": { const s = alive(a[0]) ? kv.get(a[0]) : null; if (s) a.slice(1).forEach(x => s.delete(x)); return 1; }
    case "SMEMBERS": return alive(a[0]) ? [...kv.get(a[0])] : [];
    case "SISMEMBER": return alive(a[0]) && kv.get(a[0]).has(a[1]) ? 1 : 0;
    case "SCARD": return alive(a[0]) ? kv.get(a[0]).size : 0;
    case "RPUSH": { const l = alive(a[0]) ? kv.get(a[0]) : []; l.push(a[1]); kv.set(a[0], l); return l.length; }
    case "LRANGE": return sliceIdx(alive(a[0]) ? kv.get(a[0]) : [], a[1], a[2]);
    case "LLEN": return alive(a[0]) ? kv.get(a[0]).length : 0;
    case "LTRIM": { const l = alive(a[0]) ? kv.get(a[0]) : []; kv.set(a[0], sliceIdx(l, a[1], a[2])); return "OK"; }
    case "LREM": { const l = alive(a[0]) ? kv.get(a[0]) : []; kv.set(a[0], l.filter(x => x !== a[2])); return 1; }
    case "INCR": { const v = (alive(a[0]) ? +kv.get(a[0]) : 0) + 1; kv.set(a[0], String(v)); return v; }
    case "SCAN": { const re = new RegExp("^" + String(a[2]).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"); return ["0", [...kv.keys()].filter(k => re.test(k))]; }
    case "EXPIRE": exp.set(a[0], Date.now() + a[1] * 1000); return 1;
    case "ZADD": { const z = alive(a[0]) ? kv.get(a[0]) : new Set(); z.add(a[2]); kv.set(a[0], z); return 1; }
    case "ZREM": { const z = alive(a[0]) ? kv.get(a[0]) : null; if (z) z.delete(a[1]); return 1; }
    case "ZCARD": return alive(a[0]) ? kv.get(a[0]).size : 0;
    case "ZRANGE": return alive(a[0]) ? [...kv.get(a[0])].sort() : [];
    case "ZRANGEBYLEX": { const z = alive(a[0]) ? [...kv.get(a[0])].sort() : []; const lo = a[1].slice(1), hi = a[2].slice(1); return z.filter(x => x >= lo && x <= hi).slice(0, 8); }
    default: throw new Error("mem: unsupported " + cmd);
  }
}
export async function rd(...cmd) {
  if (!URL_) { if (IS_PROD) throw err(503, "storage"); return memRun(cmd); }
  const r = await fetch(URL_, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json(); if (j.error) throw new Error(j.error); return j.result;
}
export async function rdp(cmds) {
  if (!cmds.length) return []; // Upstash rejects an empty pipeline
  if (!URL_) return cmds.map(memRun);
  const r = await fetch(URL_ + "/pipeline", { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(cmds) });
  const j = await r.json(); if (!Array.isArray(j)) throw new Error(j.error || "pipeline failed");
  return j.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}
export const getJ = async k => { const v = await rd("GET", k); return v ? JSON.parse(v) : null; };
export const setJ = (k, v, ...rest) => rd("SET", k, JSON.stringify(v), ...rest);

// ---------- auth ----------
const b64u = b => Buffer.from(b).toString("base64url");
export const sign = p => { const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" })), b = b64u(JSON.stringify(p)); return `${h}.${b}.${crypto.createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url")}`; };
export function verify(t) { try { const [h, b, s] = t.split("."); const ok = crypto.createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url"); if (s.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(ok))) return null; const p = JSON.parse(Buffer.from(b, "base64url")); return p.exp > Date.now() / 1000 ? p : null; } catch { return null; } }
export const tokenFor = u => sign({ sub: u.id, v: u.pwv || 0, exp: Math.floor(Date.now() / 1000) + 30 * 864e5 });
export const hashPw = (pw, salt = crypto.randomBytes(16).toString("hex")) => `${salt}:${crypto.scryptSync(pw, salt, 64).toString("hex")}`;
export const checkPw = (pw, stored) => { const [salt, h] = stored.split(":"); const x = crypto.scryptSync(pw, salt, 64).toString("hex"); return crypto.timingSafeEqual(Buffer.from(x), Buffer.from(h)); };
export const randomId = () => crypto.randomUUID();
export const randomToken = n => crypto.randomBytes(n).toString("base64url");

// ---------- avatars ----------
export const AV = { s: 10, p: 8, e: 6, m: 5, a: 8, c: 4 };
export const avKey = a => `${a.s}-${a.p}-${a.e}-${a.m}-${a.a}-${a.c}`;
export const avValid = a => a && Object.keys(AV).every(k => Number.isInteger(a[k]) && a[k] >= 0 && a[k] < AV[k]);
export const avRandom = () => Object.fromEntries(Object.entries(AV).map(([k, n]) => [k, Math.floor(Math.random() * n)]));
export async function claimAvatar(userId, av) { const k = "av:" + avKey(av); const ok = await rd("SETNX", k, userId); if (ok) return true; return (await rd("GET", k)) === userId; }

// ---------- misc helpers ----------
export const pub = u => ({ id: u.id, username: u.username, name: u.name, avatar: u.avatar, pk: u.pk || null });
export const selfPub = u => ({ ...pub(u), g: !!u.gsub });
export const okPk = s => typeof s === "string" && s.length < 400 && /^\{"kty":"EC","crv":"P-256","x":"[\w-]{43}","y":"[\w-]{43}"\}$/.test(s);
export const okWk = w => w && typeof w === "object" && ["salt", "iv", "ct"].every(k => typeof w[k] === "string" && w[k].length < 3000 && /^[\w+/=]+$/.test(w[k]));
export const okSealed = s => typeof s === "string" && s.length < 12000 && /^1\.[\w+/=]+\.[\w+/=]+$/.test(s);
export const cleanName = s => String(s || "").replace(/[<>]/g, "").trim().slice(0, 30);
export const convoKey = (a, b) => `c:${[a, b].sort().join(":")}`;
export const dayStr = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
export const lastDays = n => Array.from({ length: n }, (_, i) => dayStr(Date.now() - (n - 1 - i) * 864e5));

// admins: usernames in the ADMIN_USERS env var (always admin) plus any added from the panel (stored in Redis)
const adminCache = globalThis.__cogAdmin || (globalThis.__cogAdmin = new Map());
export const rootAdmins = () => ((process.env.ADMIN_USERS || "") + "," + (process.env.ADMIN_EXTRA || "")).toLowerCase().split(",").map(x => x.trim()).filter(Boolean);
export async function isAdmin(u) {
  if (rootAdmins().includes(u.username)) return true;
  const c = adminCache.get(u.id); if (c && Date.now() - c.t < 60000) return c.v;
  const v = !!(await rd("SISMEMBER", "admins", u.id)); adminCache.set(u.id, { v, t: Date.now() }); return v;
}
export const forgetAdmin = id => adminCache.delete(id);

// lightweight activity tracking (once per user per 10 minutes per server instance)
const touched = globalThis.__cogTouch || (globalThis.__cogTouch = new Map());
export async function touchActive(id) {
  const t = touched.get(id); if (t && Date.now() - t < 10 * 60e3) return; touched.set(id, Date.now());
  await rdp([["SET", "la:" + id, String(Date.now())], ["SADD", "dau:" + dayStr(), id], ["EXPIRE", "dau:" + dayStr(), 40 * 86400]]);
}
export const bump = (name) => rdp([["INCR", `stat:${name}:${dayStr()}`], ["EXPIRE", `stat:${name}:${dayStr()}`, 400 * 86400]]).catch(() => {});

export async function deleteAccount(me) {
  const fr = await rd("SMEMBERS", "f:" + me.id); const cmds = [["DEL", "u:" + me.username], ["ZREM", "users:z", me.username], ["DEL", "user:" + me.id], ["DEL", "av:" + avKey(me.avatar)], ["DEL", "f:" + me.id], ["DEL", "fin:" + me.id], ["DEL", "fout:" + me.id], ["DEL", "blk:" + me.id], ["DEL", "cal:" + me.id], ["DEL", "la:" + me.id], ["SREM", "admins", me.id]];
  if (me.gsub) cmds.push(["DEL", "g:" + me.gsub]);
  const tk = await rd("GET", "calu:" + me.id); if (tk) cmds.push(["DEL", "calt:" + tk], ["DEL", "calu:" + me.id]);
  fr.forEach(f => cmds.push(["SREM", "f:" + f, me.id], ["DEL", convoKey(me.id, f)])); await rdp(cmds);
}
