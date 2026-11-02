// Opt-in research data. Only numbers: the six Drive variables, the raw measurements behind them, and whether a start followed.
// No account id, task name, message or journal text is stored. Each device sends a random pseudonym that cannot be linked to the account.
import { rd, rdp, err } from "./_core.js";

const num = (v, lo, hi) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);
const RAW_KEYS = /^[a-z0-9_]{2,32}$/;

export async function researchIn(me, body) {
  const pid = String(body.pid || ""); if (!/^[a-z0-9]{10,24}$/.test(pid)) throw err(400, "Bad id.");
  const recs = Array.isArray(body.recs) ? body.recs.slice(0, 200) : []; if (!recs.length) return { stored: 0 };
  const dayKey = "rsq:" + me.id + ":" + new Date().toISOString().slice(0, 10); const used = Number(await rd("GET", dayKey)) || 0; if (used > 2000) throw err(429, "Daily limit reached.");
  const cmds = []; let stored = 0;
  for (const r of recs) {
    const t = num(r && r.t, 1.7e12, 4e12); const v = Array.isArray(r && r.v) && r.v.length === 6 ? r.v.map(x => num(x, 0, 1)) : null; if (t == null || !v || v.some(x => x == null)) continue;
    const raw = {}; for (const [k, x] of Object.entries((r && r.raw) || {}).slice(0, 30)) { if (RAW_KEYS.test(k)) { const n = num(x, -1e6, 1e6); if (n != null) raw[k] = n; } }
    const row = { pid, t: Math.floor(t / 36e5) * 36e5, v, raw, cov: num(r.cov, 0, 1), dp: num(r.dp, -50, 50), dc: num(r.dc, -50, 50), pb: num(r.pb, 0, 1), pl: num(r.pl, 0, 1), y: r.y === 1 || r.y === 0 ? r.y : null, proto: String(r.proto || "").slice(0, 40) };
    cmds.push(["SET", "rsd:" + pid + ":" + row.t, "1", "NX", "EX", 400 * 86400], ["RPUSH", "rs", JSON.stringify(row)]); stored++;
  }
  if (!cmds.length) return { stored: 0 };
  // dedupe: only push rows whose key was new (SET NX). Do it in two steps.
  const sets = await rdp(cmds.filter((_, i) => i % 2 === 0));
  const pushes = []; let k = 0; for (let i = 1; i < cmds.length; i += 2, k++) if (sets[k] === "OK") pushes.push(cmds[i]);
  if (pushes.length) await rdp([...pushes, ["LTRIM", "rs", -200000, -1], ["INCRBY", dayKey, pushes.length], ["EXPIRE", dayKey, 2 * 86400]]);
  return { stored: pushes.length };
}
export async function researchRows() { return (await rd("LRANGE", "rs", 0, -1)).map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean); }
export async function researchCsv() {
  const rows = await researchRows(); const rawKeys = Array.from(new Set(rows.flatMap(r => Object.keys(r.raw || {})))).sort();
  const head = ["pseudonym", "hour_utc", "primode", "cap", "flexion", "anchory", "grain", "slip", "coverage", "drive_paper", "drive_core", "p_usual_hour", "p_lagun", "started_within_3h", "protocol", ...rawKeys.map(k => "raw_" + k)];
  return [head.join(","), ...rows.map(r => [r.pid, new Date(r.t).toISOString().slice(0, 13) + ":00Z", ...r.v.map(x => x.toFixed(3)), r.cov, r.dp, r.dc, r.pb, r.pl, r.y == null ? "" : r.y, r.proto, ...rawKeys.map(k => (r.raw && r.raw[k] != null ? r.raw[k] : ""))].join(","))].join("\n");
}
export async function researchCount() { const n = await rd("LLEN", "rs"); const pids = new Set((await rd("LRANGE", "rs", -5000, -1)).map(s => { try { return JSON.parse(s).pid; } catch { return null; } })); return { rows: Number(n) || 0, devicesRecent: pids.size }; }
