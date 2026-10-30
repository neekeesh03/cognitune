// Admin backend: overview stats, users, reports, announcements, team, audit log.
import crypto from "node:crypto";
import { experimentStats, waitlistList } from "./_exp.js";
import { rd, rdp, getJ, setJ, err, pub, lastDays, dayStr, hashPw, randomToken, randomId, convoKey, isAdmin, rootAdmins, forgetAdmin, deleteAccount, URL_, IS_PROD } from "./_core.js";

const sha = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
async function audit(me, action, detail = "") { await rdp([["RPUSH", "audit", JSON.stringify({ ts: Date.now(), by: me.username, action, detail: String(detail).slice(0, 200) })], ["LTRIM", "audit", -500, -1]]); }
async function userByName(name) { const id = await rd("GET", "u:" + String(name).toLowerCase()); return id ? getJ("user:" + id) : null; }

export async function adminRoute(path, method, ctx) {
  return (await adminInner(path, method, ctx)) !== false;
}
async function adminInner(path, method, ctx) {
  const { me, body, query, res } = ctx;
  if (!path.startsWith("admin-")) return false;
  if (!(await isAdmin(me))) throw err(403, "Not allowed.");

  if (path === "admin-overview" && method === "GET") {
    const days = lastDays(14);
    const cmds = [["ZCARD", "users:z"], ["LLEN", "fb"], ["LLEN", "reps"], ["GET", "announce"], ["SCARD", "admins"], ...days.flatMap(d => [["GET", `stat:signups:${d}`], ["GET", `stat:msgs:${d}`], ["SCARD", `dau:${d}`], ["GET", `stat:fb:${d}`]])];
    const r = await rdp(cmds); const series = days.map((d, i) => ({ day: d.slice(5), signups: +r[5 + i * 4] || 0, messages: +r[6 + i * 4] || 0, active: +r[7 + i * 4] || 0, ratings: +r[8 + i * 4] || 0 }));
    const sum = k => series.reduce((a, x) => a + x[k], 0);
    return res.json({ totals: { users: r[0], ratings: r[1], reports: r[2], admins: (r[4] || 0) + rootAdmins().length }, announce: r[3] ? JSON.parse(r[3]) : null, series, week: { signups: series.slice(-7).reduce((a, x) => a + x.signups, 0), messages: series.slice(-7).reduce((a, x) => a + x.messages, 0), active: series[series.length - 1].active }, fortnight: { signups: sum("signups"), messages: sum("messages") }, system: { storage: IS_PROD ? !!URL_ : true, region: process.env.VERCEL_REGION || "local", node: process.version } });
  }

  if (path === "admin-users" && method === "GET") {
    const q = String(query.q || "").toLowerCase().replace(/[^a-z0-9_]/g, ""); const off = Math.max(0, +query.offset || 0); const LIM = 25;
    const all = await rd("ZRANGE", "users:z", 0, -1); const hit = all.filter(n => !q || n.includes(q)); const page = hit.slice(off, off + LIM);
    const ids = await rdp(page.map(n => ["GET", "u:" + n])); const users = (await rdp(ids.map(i => ["GET", "user:" + i]))).map(v => v && JSON.parse(v));
    const la = await rdp(ids.map(i => ["GET", "la:" + i])); const fc = await rdp(ids.map(i => ["SCARD", "f:" + i]));
    return res.json({ total: hit.length, offset: off, users: users.map((u, i) => u && { ...pub(u), created: u.created, suspended: !!u.suspended, lastActive: +la[i] || null, friends: fc[i] || 0, admin: rootAdmins().includes(u.username) }).filter(Boolean) });
  }

  if (path === "admin-user" && method === "POST") {
    const u = await getJ("user:" + String(body.id || "")); if (!u) throw err(404, "No such user."); const root = rootAdmins().includes(u.username);
    const op = String(body.op || "");
    if (["suspend", "delete"].includes(op) && (root || u.id === me.id)) throw err(400, "You cannot do that to an admin account.");
    if (op === "suspend") { u.suspended = true; await setJ("user:" + u.id, u); await audit(me, "suspend", u.username); return res.json({ ok: true }); }
    if (op === "unsuspend") { u.suspended = false; await setJ("user:" + u.id, u); await audit(me, "unsuspend", u.username); return res.json({ ok: true }); }
    if (op === "delete") { await deleteAccount(u); await audit(me, "delete-user", u.username); return res.json({ ok: true }); }
    if (op === "reset-password") { const pw = randomToken(9); u.pw = hashPw(pw); u.pwv = (u.pwv || 0) + 1; await setJ("user:" + u.id, u); await audit(me, "reset-password", u.username); return res.json({ ok: true, password: pw }); }
    throw err(400, "Unknown action.");
  }

  if (path === "admin-reports" && method === "GET") {
    const ids = (await rd("LRANGE", "reps", -100, -1)).reverse(); const reps = (await rdp(ids.map(i => ["GET", "rep:" + i]))).map(v => v && JSON.parse(v)).filter(Boolean);
    const uids = [...new Set(reps.flatMap(r => [r.from, r.against]))]; const us = (await rdp(uids.map(i => ["GET", "user:" + i]))).map(v => v && JSON.parse(v)); const nm = Object.fromEntries(uids.map((i, n) => [i, us[n] ? us[n].username : "(deleted)"]));
    return res.json({ reports: reps.map(r => ({ ...r, fromName: nm[r.from], againstName: nm[r.against], againstId: r.against, suspended: !!us[uids.indexOf(r.against)]?.suspended })) });
  }
  if (path === "admin-report-evidence" && method === "GET") {
    const id = String(query.id || "").replace(/[^\w-]/g, ""); const img = id ? await rd("GET", "repev:" + id) : null; if (!img) throw err(404, "No photo kept for this report."); await audit(me, "view-report-photo", id); return res.json({ img });
  }
  if (path === "admin-reports" && method === "POST") {
    const r = await getJ("rep:" + String(body.id || "")); if (!r) throw err(404, "Not found."); r.status = body.op === "reopen" ? "open" : "resolved"; r.note = String(body.note || "").slice(0, 300); r.by = me.username; r.resolvedAt = Date.now(); await setJ("rep:" + r.id, r); await audit(me, "report-" + r.status, r.id.slice(0, 8)); return res.json({ ok: true });
  }

  if (path === "admin-announce" && method === "POST") {
    const text = String(body.text || "").replace(/[<>]/g, "").trim().slice(0, 280);
    if (!text) { await rd("DEL", "announce"); await audit(me, "clear-announcement"); return res.json({ ok: true, announce: null }); }
    const a = { id: randomId(), text, level: body.level === "important" ? "important" : "info", ts: Date.now() }; await setJ("announce", a); await audit(me, "announce", text.slice(0, 60)); return res.json({ ok: true, announce: a });
  }

  if (path === "admin-admins" && method === "GET") {
    const ids = await rd("SMEMBERS", "admins"); const us = (await rdp(ids.map(i => ["GET", "user:" + i]))).map(v => v && JSON.parse(v)).filter(Boolean);
    return res.json({ root: rootAdmins(), added: us.map(u => ({ id: u.id, username: u.username, name: u.name })) });
  }
  if (path === "admin-admins" && method === "POST") {
    const u = await userByName(body.username); if (!u) throw err(404, "No one with that username."); const op = body.op === "remove" ? "remove" : "add";
    if (op === "remove" && rootAdmins().includes(u.username)) throw err(400, "That admin is set in the server settings and cannot be removed here.");
    await rd(op === "add" ? "SADD" : "SREM", "admins", u.id); forgetAdmin(u.id); await audit(me, op + "-admin", u.username); return res.json({ ok: true });
  }

  if (path === "admin-purge-legacy" && method === "POST") {
    // Deletes every message sent before end-to-end encryption existed (no "enc" field), and any file attached to one.
    let cursor = "0", chats = 0, removed = 0, files = 0;
    do {
      const r = await rd("SCAN", cursor, "MATCH", "c:*", "COUNT", 200); cursor = String(r[0]);
      for (const key of r[1]) {
        const raw = await rd("LRANGE", key, 0, -1); const keep = [], drop = [];
        raw.forEach(s => { let m; try { m = JSON.parse(s); } catch { drop.push(s); return; } (m.enc ? keep : drop).push(m.enc ? s : m); });
        if (!drop.length) continue; chats++;
        const cmds = []; await rd("DEL", key);
        for (const m of drop) { removed++; if (m && m.file && m.file.id) { files++; cmds.push(["DEL", "file:" + m.file.id]); } }
        keep.forEach(s => cmds.push(["RPUSH", key, s])); if (cmds.length) await rdp(cmds);
      }
    } while (cursor !== "0");
    await audit(me, "purge-unencrypted-messages", `${removed} messages in ${chats} chats, ${files} files`);
    return res.json({ ok: true, removed, chats, files });
  }

  if (path === "admin-exp" && method === "GET") return res.json(await experimentStats());
  if (path === "admin-waitlist" && method === "GET") return res.json({ items: await waitlistList() });
  if (path === "admin-waitlist-export" && method === "GET") { const items = await waitlistList(); await audit(me, "export-waitlist", `${items.length} rows`); res.setHeader("Content-Type", "text/csv"); res.setHeader("Content-Disposition", 'attachment; filename="waitlist.csv"'); return res.send("email,variant,segment,source,joined\n" + items.map(i => [i.email, i.v, i.s, i.src || "", new Date(i.ts).toISOString()].join(",")).join("\n")); }

  if (path === "admin-audit" && method === "GET") { const raw = await rd("LRANGE", "audit", -150, -1); return res.json({ items: raw.map(s => JSON.parse(s)).reverse() }); }

  throw err(404, "Not found");
}
