import { err } from "./_core.js";

// ---------- calendar: ICS feed out, ICS import in ----------
const pad = n => String(n).padStart(2, "0");
const escIcs = t => String(t).replace(/[\\,;]/g, m => "\\" + m).replace(/\n/g, "\\n");
export function feedIcs(blocks) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const dt = (day, min) => day.replace(/-/g, "") + "T" + pad(Math.floor(min / 60) % 24) + pad(min % 60) + "00";
  const ev = blocks.flatMap(b => ["BEGIN:VEVENT", `UID:${b.id}@lagomo`, `DTSTAMP:${stamp}`, `DTSTART:${dt(b.day, b.start)}`, `DTEND:${dt(b.day, Math.min(b.start + b.dur, 1439))}`, `SUMMARY:${escIcs((b.done ? "Done: " : "") + b.title)}`, "DESCRIPTION:Planned with Lagomo", "END:VEVENT"]);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lagomo//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Lagomo", ...ev, "END:VCALENDAR"].join("\r\n");
}
const ALLOWED_CAL_HOST = /^(calendar\.google\.com|www\.google\.com|outlook\.live\.com|outlook\.office365\.com|[a-z0-9-]+\.icloud\.com)$/i;
function tzToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo, d, h, mi);
  try {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    const asUtc = t => { const p = Object.fromEntries(f.formatToParts(new Date(t)).map(x => [x.type, +x.value])); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second); };
    let t = guess - (asUtc(guess) - guess); t = guess - (asUtc(t) - t); return t;
  } catch { return null; }
}
function parseDt(val, P) {
  const m = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/); if (!m) return null;
  const [y, mo, d, h, mi] = [+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)];
  if (!m[4] || P.VALUE === "DATE") return { ms: Date.UTC(y, mo, d), wall: true, allDay: true };
  if (m[7]) return { ms: Date.UTC(y, mo, d, h, mi), wall: false };
  if (P.TZID) { const t = tzToUtc(y, mo, d, h, mi, P.TZID); if (t != null) return { ms: t, wall: false }; }
  return { ms: Date.UTC(y, mo, d, h, mi), wall: true };
}
const unesc = t => String(t || "").replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
function parseIcs(text) {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/); const evs = []; let cur = null;
  for (const ln of lines) {
    if (ln === "BEGIN:VEVENT") { cur = { ex: [] }; continue; } if (ln === "END:VEVENT") { if (cur) evs.push(cur); cur = null; continue; } if (!cur) continue;
    const i = ln.indexOf(":"); if (i < 0) continue; const [name, ...params] = ln.slice(0, i).split(";"); const val = ln.slice(i + 1);
    const P = Object.fromEntries(params.map(x => { const k = x.indexOf("="); return [x.slice(0, k).toUpperCase(), x.slice(k + 1).replace(/"/g, "")]; })); const n = name.toUpperCase();
    if (n === "SUMMARY") cur.title = unesc(val); else if (n === "DTSTART") cur.s = parseDt(val, P); else if (n === "DTEND") cur.e = parseDt(val, P); else if (n === "RRULE") cur.rr = val;
    else if (n === "EXDATE") val.split(",").forEach(v => { const x = parseDt(v, P); if (x) cur.ex.push(x.ms); }); else if (n === "UID") cur.uid = val; else if (n === "STATUS") cur.status = val; else if (n === "RECURRENCE-ID") { const x = parseDt(val, P); if (x) cur.rid = x.ms; }
  }
  return evs;
}
const DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function expand(ev, from, to) {
  if (!ev.s) return []; const dur = ev.e ? Math.max(0, ev.e.ms - ev.s.ms) : ev.s.allDay ? 864e5 : 36e5; const base = ev.s.ms; const out = []; const mk = ms => ({ s: ms, e: ms + dur, wall: ev.s.wall, allDay: !!ev.s.allDay });
  if (!ev.rr) return base + dur >= from && base <= to ? [mk(base)] : [];
  const r = Object.fromEntries(ev.rr.split(";").map(x => x.split("="))); const itv = +r.INTERVAL || 1; const count = r.COUNT ? +r.COUNT : Infinity; let until = Infinity;
  if (r.UNTIL) { const u = parseDt(r.UNTIL, {}); if (u) until = u.ms + (u.allDay ? 864e5 - 1 : 0); }
  const byday = r.BYDAY ? r.BYDAY.split(",").map(x => DAYS[x.slice(-2)]).filter(x => x != null) : null; const b = new Date(base); let n = 0;
  const push = ms => { if (ms < base || ms > until || n >= count) return false; n++; if (ms + dur >= from && ms <= to && !ev.ex.includes(ms)) out.push(mk(ms)); return true; };
  const tod = base % 864e5; const startDay = base - tod;
  if (r.FREQ === "DAILY") { for (let k = 0; k < 800 && n < count; k++) { const ms = base + k * itv * 864e5; if (ms > to || ms > until) break; push(ms); } }
  else if (r.FREQ === "WEEKLY") { const days = byday && byday.length ? byday : [b.getUTCDay()]; const weekStart = startDay - b.getUTCDay() * 864e5; for (let k = 0; k < 300 && n < count; k++) { let stop = false; for (const d of [...days].sort()) { const ms = weekStart + (k * itv * 7 + d) * 864e5 + tod; if (ms < base) continue; if (ms > to || ms > until) { stop = true; break; } push(ms); } if (stop) break; } }
  else if (r.FREQ === "MONTHLY") { for (let k = 0; k < 120 && n < count; k++) { const ms = Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + k * itv, b.getUTCDate()) + tod; if (ms > to || ms > until) break; push(ms); } }
  else if (r.FREQ === "YEARLY") { for (let k = 0; k < 20 && n < count; k++) { const ms = Date.UTC(b.getUTCFullYear() + k * itv, b.getUTCMonth(), b.getUTCDate()) + tod; if (ms > to || ms > until) break; push(ms); } }
  else if (base + dur >= from && base <= to) out.push(mk(base));
  return out;
}
export function eventsFromIcs(text, nowMs = Date.now()) {
  const from = nowMs - 7 * 864e5, to = nowMs + 60 * 864e5; const evs = parseIcs(text).filter(e => e.status !== "CANCELLED"); const overridden = {};
  evs.filter(e => e.rid != null).forEach(e => { (overridden[e.uid] ||= []).push(e.rid); });
  const out = [];
  for (const e of evs) { if (e.rid == null && overridden[e.uid]) e.ex.push(...overridden[e.uid]); for (const o of expand(e, from, to)) { out.push({ id: `${e.uid || e.title}:${o.s}`, title: e.title || "Busy", s: o.s, e: o.e, wall: o.wall, allDay: o.allDay }); if (out.length >= 900) return out; } }
  return out.sort((a, b) => a.s - b.s);
}
export async function fetchIcs(rawUrl) {
  let u; try { u = new URL(String(rawUrl).trim().replace(/^webcal:/i, "https:")); } catch { throw err(400, "That does not look like a calendar link."); }
  if (u.protocol !== "https:" || !ALLOWED_CAL_HOST.test(u.hostname)) throw err(400, "Only Google, Outlook and iCloud calendar links are supported.");
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(u, { signal: ac.signal, headers: { Accept: "text/calendar" } }); if (!ALLOWED_CAL_HOST.test(new URL(r.url).hostname)) throw err(400, "Unexpected redirect.");
    if (!r.ok) throw err(400, "The calendar link did not work. Check that you copied the secret iCal address.");
    const text = await r.text(); if (text.length > 4_000_000) throw err(413, "That calendar is too large."); if (!text.includes("BEGIN:VCALENDAR")) throw err(400, "That link is not a calendar feed.");
    return text;
  } catch (e) { if (e.status) throw e; throw err(400, "Could not reach that calendar. Try again in a moment."); } finally { clearTimeout(t); }
}
