// Product experiments: privacy-light event counters, the "would you miss it" survey, the Plus price test,
// landing-page tracking and the waitlist. No message, journal or plan content is ever recorded here.
import { rd, rdp, setJ, getJ, err, dayStr, lastDays } from "./_core.js";

export const EVENTS = ["app_open", "checkin", "timer_start", "timer_done", "together_start", "invite", "tab_circle", "tab_plan", "tab_checkin", "plus_open", "plus_price"];
const PRICES = ["3", "5", "8", "none"];
export const weekId = (t = Date.now()) => { const d = new Date(t); const day = (d.getUTCDay() + 6) % 7; return dayStr(t - day * 864e5); }; // Monday of the week
const cl = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").trim().slice(0, n);

export async function track(me, name, props = {}) {
  if (!EVENTS.includes(name)) throw err(400, "Unknown event.");
  const d = dayStr(), w = weekId(), id = me.id;
  const cmds = [["SADD", "evf:" + name, id], ["SETNX", `evt:${name}:${id}`, String(Date.now())], ["INCR", `stat:ev_${name}:${d}`], ["EXPIRE", `stat:ev_${name}:${d}`, 400 * 86400], ["SADD", `evd:${name}:${d}`, id], ["EXPIRE", `evd:${name}:${d}`, 120 * 86400]];
  if (name === "timer_start") cmds.push(["INCR", `wk:${w}:${id}`], ["EXPIRE", `wk:${w}:${id}`, 45 * 86400]);
  if (name === "plus_price") { const p = PRICES.includes(String(props.price)) ? String(props.price) : "none"; cmds.push(["RPUSH", "plusc", JSON.stringify({ ts: Date.now(), price: p })], ["LTRIM", "plusc", -5000, -1]); }
  await rdp(cmds);
}

// who may be asked the Sean Ellis question: used the app on 2+ of the last 14 days, signed up 3+ days ago, not asked in the last 14 days
export async function pulseEligible(me) {
  if (Date.now() - (me.created || 0) < 3 * 864e5) return false;
  if (await rd("GET", "pulsed:" + me.id)) return false;
  const days = lastDays(14); const r = await rdp(days.map(d => ["SISMEMBER", "dau:" + d, me.id]));
  return r.filter(Boolean).length >= 2;
}
export async function pulseAnswer(me, body) {
  const a = ["very", "somewhat", "not", "nolonger"].includes(body.answer) ? body.answer : null; if (!a) throw err(400, "Pick an answer.");
  await rdp([["RPUSH", "pulse", JSON.stringify({ ts: Date.now(), answer: a, benefit: cl(body.benefit, 300), alt: cl(body.alt, 200), improve: cl(body.improve, 300) })], ["LTRIM", "pulse", -5000, -1], ["SET", "pulsed:" + me.id, String(Date.now()), "EX", 14 * 86400]]);
}

// public: landing-page counters (page views, clicks, waitlist sign-ups by variant and segment)
export async function landingHit(ip, body) {
  const rl = await rd("INCR", `rl:hit:${ip}:${Math.floor(Date.now() / 6e4)}`); if (rl > 60) throw err(429, "Slow down.");
  const v = ["tiny", "together", "calm"].includes(body.v) ? body.v : "tiny", s = ["a", "b"].includes(body.s) ? body.s : "a", kind = ["view", "click", "signup"].includes(body.kind) ? body.kind : "view";
  await rdp([["INCR", `lp:${v}:${s}:${kind}`]]);
}
export async function joinWaitlist(ip, body) {
  const rl = await rd("INCR", `rl:wl:${ip}:${Math.floor(Date.now() / 36e5)}`); if (rl > 10) throw err(429, "Too many tries. Please try again later.");
  const email = cl(body.email, 120).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw err(400, "That email does not look right.");
  if (!body.consent) throw err(400, "Please tick the box so we can email you.");
  const v = ["tiny", "together", "calm"].includes(body.v) ? body.v : "tiny", s = ["a", "b"].includes(body.s) ? body.s : "a";
  if (!(await rd("SETNX", "wlx:" + email, "1"))) return; // already on the list: say nothing different
  await rdp([["RPUSH", "wl", JSON.stringify({ ts: Date.now(), email, v, s, src: cl(body.src, 40) })], ["INCR", `lp:${v}:${s}:signup`]]);
}

// admin: every number the test plan needs, in one call
export async function experimentStats() {
  const now = Date.now(), today = dayStr(now);
  const names = await rd("ZRANGE", "users:z", 0, -1);
  const ids = (await rdp(names.map(n => ["GET", "u:" + n]))).filter(Boolean);
  const users = (await rdp(ids.map(i => ["GET", "user:" + i]))).map(v => v && JSON.parse(v)).filter(Boolean);
  const total = users.length;
  const [fcount] = [await rdp(users.map(u => ["SCARD", "f:" + u.id]))];
  const evNames = ["checkin", "timer_start", "timer_done", "together_start", "invite", "tab_circle", "tab_plan"];
  const evSets = {}; for (const n of evNames) evSets[n] = new Set(await rd("SMEMBERS", "evf:" + n));
  // retention: for each user, was she active on day +1, +7, +30 (only if that day has fully passed)
  const checks = []; const meta = [];
  users.forEach((u, i) => [1, 7, 30].forEach(n => { const dayN = dayStr((u.created || 0) + n * 864e5); if (dayN < today) { checks.push(["SISMEMBER", "dau:" + dayN, u.id]); meta.push({ i, n }); } }));
  const res = checks.length ? await rdp(checks) : [];
  const ret = { 1: { n: 0, hit: 0 }, 7: { n: 0, hit: 0 }, 30: { n: 0, hit: 0 } }; const retByFriend = { with: { n: 0, hit: 0 }, without: { n: 0, hit: 0 } };
  meta.forEach((m, k) => { ret[m.n].n++; if (res[k]) ret[m.n].hit++; if (m.n === 7) { const g = fcount[m.i] > 0 ? retByFriend.with : retByFriend.without; g.n++; if (res[k]) g.hit++; } });
  // activation: first timer within 24h of signup
  const first = await rdp(users.map(u => ["GET", `evt:timer_start:${u.id}`]));
  const eligible = users.filter(u => now - (u.created || 0) > 864e5);
  let act = 0; users.forEach((u, i) => { if (first[i] && +first[i] - (u.created || 0) < 864e5 && now - (u.created || 0) > 864e5) act++; });
  // weekly starters (3+ timers in a week), last 4 weeks
  const weeks = [0, 1, 2, 3].map(k => weekId(now - k * 7 * 864e5)); const wkc = []; weeks.forEach(w => users.forEach(u => wkc.push(["GET", `wk:${w}:${u.id}`])));
  const wkr = wkc.length ? await rdp(wkc) : []; const weekly = weeks.map((w, k) => ({ week: w, starters: wkr.slice(k * total, (k + 1) * total).filter(x => +x >= 3).length, anyStart: wkr.slice(k * total, (k + 1) * total).filter(x => +x >= 1).length }));
  const invitedAmongActivated = users.filter(u => evSets.invite.has(u.id) && evSets.timer_start.has(u.id)).length, activatedEver = users.filter(u => evSets.timer_start.has(u.id)).length;
  // pulse
  const pr = (await rd("LRANGE", "pulse", 0, -1)).map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  const pc = { very: 0, somewhat: 0, not: 0, nolonger: 0 }; pr.forEach(p => pc[p.answer]++);
  // plus price test
  const pl = (await rd("LRANGE", "plusc", 0, -1)).map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean); const plus = { "3": 0, "5": 0, "8": 0, none: 0 }; pl.forEach(p => plus[p.price]++);
  const plusOpen = evSets.plus_open ? 0 : 0; const opens = await rd("SCARD", "evf:plus_open");
  // landing variants
  const lpKeys = []; for (const v of ["tiny", "together", "calm"]) for (const s of ["a", "b"]) for (const k of ["view", "click", "signup"]) lpKeys.push([v, s, k]);
  const lpv = await rdp(lpKeys.map(([v, s, k]) => ["GET", `lp:${v}:${s}:${k}`])); const landing = {}; lpKeys.forEach(([v, s, k], i) => { const key = `${v}:${s}`; (landing[key] ||= { v, s, view: 0, click: 0, signup: 0 })[k] = +lpv[i] || 0; });
  const wlCount = await rd("LLEN", "wl");
  const weeklyActive7 = new Set(); for (const d of lastDays(7)) (await rd("SMEMBERS", "dau:" + d)).forEach(x => weeklyActive7.add(x));
  const pct = (a, b) => (b ? a / b : null);
  return {
    users: total, weeklyActive: weeklyActive7.size,
    funnel: Object.fromEntries(evNames.map(n => [n, evSets[n].size])),
    activation: { rate: pct(act, eligible.length), n: eligible.length },
    retention: { d1: pct(ret[1].hit, ret[1].n), d7: pct(ret[7].hit, ret[7].n), d30: pct(ret[30].hit, ret[30].n), n1: ret[1].n, n7: ret[7].n, n30: ret[30].n },
    friendEffect: { withFriend: pct(retByFriend.with.hit, retByFriend.with.n), without: pct(retByFriend.without.hit, retByFriend.without.n), nWith: retByFriend.with.n, nWithout: retByFriend.without.n },
    invite: { rate: pct(invitedAmongActivated, activatedEver), n: activatedEver },
    weekly,
    pulse: { counts: pc, n: pr.length, veryPct: pct(pc.very, pr.length), comments: pr.filter(p => p.benefit || p.alt || p.improve).slice(-30).reverse().map(p => ({ ts: p.ts, answer: p.answer, benefit: p.benefit, alt: p.alt, improve: p.improve })) },
    plus: { counts: plus, total: pl.length, opened: opens, ofActive: pct(pl.filter(p => p.price !== "none").length, weeklyActive7.size || 0) },
    landing: Object.values(landing), waitlist: wlCount,
  };
}
export async function waitlistList() { return (await rd("LRANGE", "wl", 0, -1)).map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean).reverse(); }
export { setJ, getJ };
