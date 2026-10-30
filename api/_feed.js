// Friends-only feed. Posts are visible to the author's friends (and team posts to everyone signed in).
// No follower counts, no ranking: newest first. Posts expire after 90 days.
import { rd, rdp, getJ, setJ, err, randomId, isAdmin, pub, lastDays, dayStr } from "./_core.js";

const KINDS = ["update", "win", "help"];
const TTL = 90 * 86400;
const clean = (s, n) => String(s ?? "").replace(/\r/g, "").replace(/[<>]/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, n);
const hashObj = h => { if (!h) return {}; if (Array.isArray(h)) { const o = {}; for (let i = 0; i < h.length; i += 2) o[h[i]] = h[i + 1]; return o; } return h; };

async function loadPosts(ids) {
  if (!ids.length) return [];
  const raw = await rdp(ids.map(i => ["GET", "post:" + i]));
  return raw.map(r => { try { return r ? JSON.parse(r) : null; } catch { return null; } }).filter(Boolean);
}
async function present(posts, me, admin) {
  if (!posts.length) return [];
  const [hs, authors] = await Promise.all([
    rdp(posts.map(p => ["HGETALL", "prx:" + p.id])),
    rdp([...new Set(posts.map(p => p.uid))].map(u => ["GET", "user:" + u])),
  ]);
  const byId = {}; authors.forEach(a => { try { const u = a && JSON.parse(a); if (u) byId[u.id] = u; } catch { /* skip */ } });
  return posts.filter(p => byId[p.uid] || p.team).map((p, i) => {
    const h = hashObj(hs[posts.indexOf(p)]); const reacts = {}; Object.values(h).forEach(e => { if (e) reacts[e] = (reacts[e] || 0) + 1; });
    return { id: p.id, ts: p.ts, text: p.text, kind: p.kind, team: !!p.team, author: byId[p.uid] ? pub(byId[p.uid]) : null, reacts, mine: h[me.id] || "", own: p.uid === me.id, canDelete: p.uid === me.id || admin };
  });
}
async function canSee(me, post) {
  if (!post) return false; if (post.team || post.uid === me.id) return true;
  return !!(await rd("SISMEMBER", "f:" + me.id, post.uid));
}

export async function feedRoute(path, method, me, body, query) {
  if (path === "feed" && method === "GET") {
    const fids = [me.id, ...((await rd("SMEMBERS", "f:" + me.id)) || [])];
    const lists = await rdp([...fids.map(f => ["LRANGE", "posts:" + f, 0, 29]), ["LRANGE", "posts:team", 0, 9]]);
    const ids = [...new Set(lists.flat().filter(Boolean))];
    const before = +query.before || Infinity;
    const posts = (await loadPosts(ids)).filter(p => p.ts < before).sort((a, b) => b.ts - a.ts).slice(0, 30);
    const admin = await isAdmin(me);
    return { posts: await present(posts, me, admin), canTeam: admin };
  }
  if (path === "post" && method === "POST") {
    const text = clean(body.text, 600); if (!text) throw err(400, "Write something first.");
    const n = await rd("INCR", `rl:post:${me.id}:${dayStr()}`); await rd("EXPIRE", `rl:post:${me.id}:${dayStr()}`, 172800); if (n > 20) throw err(429, "That is a lot of posts for one day. Try again tomorrow.");
    const team = !!body.team && (await isAdmin(me));
    const p = { id: randomId(), uid: me.id, text, kind: KINDS.includes(body.kind) ? body.kind : "update", ts: Date.now(), ...(team ? { team: true } : {}) };
    await setJ("post:" + p.id, p, "EX", TTL);
    const cmds = [["LPUSH", "posts:" + me.id, p.id], ["LTRIM", "posts:" + me.id, 0, 199], ["EXPIRE", "posts:" + me.id, TTL]];
    if (team) cmds.push(["LPUSH", "posts:team", p.id], ["LTRIM", "posts:team", 0, 49]);
    await rdp(cmds);
    return { post: (await present([p], me, team))[0] };
  }
  if (path === "post-del" && method === "POST") {
    const p = await getJ("post:" + String(body.id || "")); if (!p) throw err(404, "That post is gone.");
    if (p.uid !== me.id && !(await isAdmin(me))) throw err(403, "You can only delete your own posts.");
    await rdp([["DEL", "post:" + p.id], ["DEL", "prx:" + p.id], ["LREM", "posts:" + p.uid, 0, p.id], ["LREM", "posts:team", 0, p.id]]);
    return { ok: true };
  }
  if (path === "post-react" && method === "POST") {
    const p = await getJ("post:" + String(body.id || "")); if (!(await canSee(me, p))) throw err(404, "That post is gone.");
    const e = String(body.e || "").slice(0, 16);
    if (e) await rdp([["HSET", "prx:" + p.id, me.id, e], ["EXPIRE", "prx:" + p.id, TTL]]); else await rd("HDEL", "prx:" + p.id, me.id);
    return { ok: true, author: p.uid, reacted: !!e };
  }
  if (path === "profile-view" && method === "GET") {
    const un = String(query.u || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    const id = un ? await rd("GET", "u:" + un) : null; const u = id ? await getJ("user:" + id) : null;
    if (!u || u.suspended || (await rd("SISMEMBER", "blk:" + u.id, me.id))) throw err(404, "We could not find that person.");
    const self = u.id === me.id; const friend = !self && !!(await rd("SISMEMBER", "f:" + me.id, u.id));
    const out = { user: pub(u), bio: u.bio || "", joined: u.created || null, self, friend };
    if (self || friend) {
      const days = new Set((await rd("SMEMBERS", "sd:" + u.id)) || []); const wk = lastDays(7), mo = lastDays(30);
      out.week = wk.filter(d => days.has(d)).length; out.month = mo.filter(d => days.has(d)).length;
      if (friend) { const mine = new Set((await rd("SMEMBERS", "sd:" + me.id)) || []); out.together = wk.filter(d => days.has(d) && mine.has(d)).length; }
      const ids = (await rd("LRANGE", "posts:" + u.id, 0, 19)) || [];
      out.posts = await present((await loadPosts(ids)).sort((a, b) => b.ts - a.ts), me, await isAdmin(me));
    }
    return out;
  }
  return null;
}
