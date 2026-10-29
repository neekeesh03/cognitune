import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getToken } from "@/lib/api";

type Tab = "overview" | "experiments" | "people" | "reports" | "team";
const TABS: { id: Tab; label: string }[] = [{ id: "overview", label: "Overview" }, { id: "experiments", label: "Experiments" }, { id: "people", label: "People" }, { id: "reports", label: "Reports" }, { id: "team", label: "Team and notices" }];
const when = (t?: number | null) => (t ? new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Never");
const errText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

function Card({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return <section className="glass rounded-3xl p-5">{(title || right) && <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{title}</h2>{right}</div>}{children}</section>;
}
function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return <div className="glass rounded-2xl p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 text-3xl font-semibold">{value}</div>{hint && <div className="text-xs text-muted-foreground">{hint}</div>}</div>;
}
function Bars({ data, k, label }: { data: { day: string; [k: string]: number | string }[]; k: string; label: string }) {
  const max = Math.max(1, ...data.map(d => +d[k]));
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{label}</div>
      <div className="flex h-24 items-end gap-1" role="img" aria-label={`${label} over the last 14 days`}>
        {data.map(d => <div key={d.day} className="flex h-full flex-1 items-end"><div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(3, (+d[k] / max) * 100)}%` }} title={`${d.day}: ${d[k]}`} /></div>)}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{data[0]?.day}</span><span>{data[data.length - 1]?.day}</span></div>
    </div>
  );
}
function Pill({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "good" | "warn" }) {
  const c = tone === "good" ? "bg-success/15 text-success" : tone === "warn" ? "bg-accent/20 text-foreground" : "bg-secondary text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs ${c}`}>{children}</span>;
}

// ---------------- Overview ----------------
type Overview = { totals: { users: number; ratings: number; reports: number; admins: number }; announce: { text: string } | null; series: { day: string; signups: number; messages: number; active: number; ratings: number }[]; week: { signups: number; messages: number; active: number }; system: { storage: boolean; region: string; node: string } };
function OverviewTab() {
  const [o, setO] = useState<Overview | null>(null); const [e, setE] = useState("");
  const load = useCallback(() => api<Overview>("admin-overview").then(setO).catch(x => setE(errText(x))), []);
  useEffect(() => { load(); }, [load]);
  if (e) return <p className="text-destructive">{e}</p>; if (!o) return <p className="text-muted-foreground">Loading...</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="People" value={o.totals.users} hint={`${o.week.signups} joined this week`} />
        <Stat label="Active today" value={o.week.active} />
        <Stat label="Messages this week" value={o.week.messages} />
      </div>
      <Card title="Last 14 days" right={<Button size="sm" variant="ghost" className="rounded-full" onClick={load}><RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh</Button>}>
        <div className="grid gap-6 md:grid-cols-2">
          <Bars data={o.series} k="signups" label="New sign-ups" /><Bars data={o.series} k="active" label="People active" />
          <Bars data={o.series} k="messages" label="Messages sent" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Counts start from when this panel was released. Active means opened the app at least once that day (UTC).</p>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Needs attention"><ul className="space-y-1 text-sm"><li>Reports filed: <b>{o.totals.reports}</b> (see Reports for the open ones)</li><li>Notice showing now: {o.announce ? <b>"{o.announce.text}"</b> : <span className="text-muted-foreground">none</span>}</li></ul></Card>
        <Card title="System"><ul className="space-y-1 text-sm"><li>Storage: {o.system.storage ? <Pill tone="good">connected</Pill> : <Pill tone="warn">not connected</Pill>}</li><li>Region: {o.system.region}</li><li>Admins: {o.totals.admins}</li></ul></Card>
      </div>
    </div>
  );
}


// ---------------- Experiments (the test / kill dashboard) ----------------
interface Exp { users: number; weeklyActive: number; funnel: Record<string, number>; activation: { rate: number | null; n: number }; retention: { d1: number | null; d7: number | null; d30: number | null; n1: number; n7: number; n30: number }; friendEffect: { withFriend: number | null; without: number | null; nWith: number; nWithout: number }; invite: { rate: number | null; n: number }; weekly: { week: string; starters: number; anyStart: number }[]; pulse: { counts: Record<string, number>; n: number; veryPct: number | null; comments: { ts: number; answer: string; benefit: string; alt: string; improve: string }[] }; plus: { counts: Record<string, number>; total: number; opened: number; ofActive: number | null }; landing: { v: string; s: string; view: number; click: number; signup: number }[]; waitlist: number }
type Verdict = "pass" | "kill" | "mid" | "early";
// Thresholds from the validation plan (section 6). Change them in the plan first, then here.
const judge = (val: number | null, n: number, pass: number, kill: number, minN = 30): Verdict => (val == null || n < minN ? "early" : val >= pass ? "pass" : val < kill ? "kill" : "mid");
const pc = (v: number | null, d = 0) => (v == null ? "no data" : `${(v * 100).toFixed(d)}%`);
function Badge({ v }: { v: Verdict }) { const m = { pass: ["Pass", "good"], kill: ["Below kill line", "warn"], mid: ["Between", "plain"], early: ["Too early", "plain"] } as const; return <Pill tone={m[v][1] as "good" | "warn" | "plain"}>{m[v][0]}</Pill>; }
function Metric({ label, value, n, rule, v }: { label: string; value: string; n: string; rule: string; v: Verdict }) {
  return <div className="glass rounded-2xl p-4"><div className="flex items-start justify-between gap-2"><div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div><Badge v={v} /></div><div className="mt-1 text-3xl font-semibold">{value}</div><div className="text-xs text-muted-foreground">{n}</div><div className="mt-1 text-xs text-muted-foreground">{rule}</div></div>;
}
function ExperimentsTab() {
  const [d, setD] = useState<Exp | null>(null); const [e, setE] = useState("");
  const load = useCallback(() => api<Exp>("admin-exp").then(setD).catch(x => setE(errText(x))), []);
  useEffect(() => { load(); }, [load]);
  if (e) return <p className="text-destructive">{e}</p>; if (!d) return <p className="text-muted-foreground">Loading...</p>;
  const f = d.funnel; const ratio = d.friendEffect.withFriend != null && d.friendEffect.without ? d.friendEffect.withFriend / d.friendEffect.without : null;
  const lp = d.landing.filter(x => x.view > 0).map(x => ({ ...x, conv: (x.click + x.signup) / x.view })).sort((a, b) => b.conv - a.conv);
  const best = lp[0]; const pulseV = judge(d.pulse.veryPct, d.pulse.n, 0.4, 0.2, 40);
  const exp = async () => { const r = await fetch("/api/admin-waitlist-export", { headers: { Authorization: "Bearer " + getToken() } }); if (!r.ok) return alert("Not allowed."); const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob()); a.download = "waitlist.csv"; a.click(); };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Live numbers for the test plan. Badges compare each result with the pass and kill lines written in the validation plan. "Too early" means too few people to judge. Nothing here reads anyone's messages, journal or plans.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="People" value={d.users} hint={`${d.weeklyActive} active in 7 days`} />
        <Stat label="Weekly starters" value={d.weekly[0]?.starters ?? 0} hint="3+ timed starts this week (North Star)" />
        <Stat label="Waitlist" value={d.waitlist} />
        <Stat label="Pulse answers" value={d.pulse.n} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="First start in 24h" value={pc(d.activation.rate)} n={`${d.activation.n} people old enough`} rule="Pass 40%+ · kill under 15%" v={judge(d.activation.rate, d.activation.n, 0.4, 0.15)} />
        <Metric label="Came back Day 1" value={pc(d.retention.d1)} n={`${d.retention.n1} people`} rule="Pass 35%+" v={judge(d.retention.d1, d.retention.n1, 0.35, 0.15)} />
        <Metric label="Came back Day 7" value={pc(d.retention.d7)} n={`${d.retention.n7} people`} rule="Pass 15%+" v={judge(d.retention.d7, d.retention.n7, 0.15, 0.05)} />
        <Metric label="Came back Day 30" value={pc(d.retention.d30)} n={`${d.retention.n30} people`} rule="Pass 8%+ · kill under 4%" v={judge(d.retention.d30, d.retention.n30, 0.08, 0.04)} />
        <Metric label="Invited a friend" value={pc(d.invite.rate)} n={`${d.invite.n} people who started`} rule="Pass 20%+ · kill under 8%" v={judge(d.invite.rate, d.invite.n, 0.2, 0.08)} />
        <Metric label="Friend effect (Day 7)" value={ratio == null ? "no data" : `${ratio.toFixed(1)}x`} n={`With friend ${pc(d.friendEffect.withFriend)} (${d.friendEffect.nWith}) · without ${pc(d.friendEffect.without)} (${d.friendEffect.nWithout})`} rule="Pass 1.5x or more" v={ratio == null || d.friendEffect.nWith < 15 || d.friendEffect.nWithout < 15 ? "early" : ratio >= 1.5 ? "pass" : ratio < 1.1 ? "kill" : "mid"} />
        <Metric label="Very disappointed to lose it" value={pc(d.pulse.veryPct)} n={`${d.pulse.n} answers`} rule="Pass 40%+ (40+ answers) · kill under 20%" v={pulseV} />
        <Metric label="Chose a price" value={pc(d.plus.ofActive, 1)} n={`${d.plus.total} choices · ${d.plus.opened} opened`} rule="Pass 3%+ of weekly actives · kill under 0.5%" v={judge(d.plus.ofActive, d.weeklyActive, 0.03, 0.005, 30)} />
      </div>
      <Card title="Where people drop off (people who ever did each step)">
        <div className="space-y-1.5 text-sm">{[["checkin", "Did a check-in"], ["timer_start", "Started a timer"], ["timer_done", "Finished a timer"], ["invite", "Invited a friend"], ["together_start", "Started together"], ["tab_circle", "Opened Circle"], ["tab_plan", "Opened Plan"]].map(([k, l]) => <div key={k} className="flex items-center gap-3"><span className="w-36 shrink-0">{l}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary/70" style={{ width: `${d.users ? Math.min(100, ((f[k] || 0) / d.users) * 100) : 0}%` }} /></div><span className="w-14 text-right text-xs text-muted-foreground">{f[k] || 0}</span></div>)}</div>
        <p className="mt-2 text-xs text-muted-foreground">Features opened by under 10% of people after 4 weeks are candidates to cut (kill list in the plan).</p>
      </Card>
      <Card title="Weekly starters, last 4 weeks"><div className="grid grid-cols-4 gap-2 text-center text-sm">{d.weekly.map(w => <div key={w.week} className="rounded-xl bg-secondary/60 p-2"><div className="text-xs text-muted-foreground">Week of {w.week.slice(5)}</div><div className="text-xl font-semibold">{w.starters}</div><div className="text-xs text-muted-foreground">{w.anyStart} started at least once</div></div>)}</div></Card>
      <Card title="Landing page messages" right={<Button size="sm" variant="outline" className="rounded-full" onClick={exp}><Download className="mr-1 h-3.5 w-3.5" />Waitlist CSV</Button>}>
        <p className="mb-2 text-xs text-muted-foreground">Share links like /hello?v=tiny&amp;s=a&amp;src=campus. v = tiny, together or calm. s = a (students) or b (early career). Conversion = tried the app or joined the waitlist, out of visitors. Pass 10%+ · kill under 4%.</p>
        {lp.length ? <div className="space-y-1 text-sm">{lp.map(x => <div key={x.v + x.s} className="flex items-center justify-between gap-3 border-b border-border py-1.5"><span>{x.v} / {x.s === "a" ? "students" : "early career"}</span><span className="text-muted-foreground">{x.view} views · {x.click} tried · {x.signup} joined</span><span className="flex items-center gap-2"><b>{pc(x.conv, 1)}</b><Badge v={judge(x.conv, x.view, 0.1, 0.04, 100)} /></span></div>)}</div> : <p className="text-sm text-muted-foreground">No visits yet.</p>}
        {best && lp.length > 1 && <p className="mt-2 text-xs text-muted-foreground">Leading: {best.v} for {best.s === "a" ? "students" : "early career"}. A clear winner is at least 1.5x the next one.</p>}
      </Card>
      <Card title="What people say (anonymous)">
        {d.pulse.comments.length ? <div className="space-y-2 text-sm">{d.pulse.comments.map((c, i) => <div key={i} className="rounded-xl border border-border p-2"><Pill>{({ very: "Very disappointed", somewhat: "Somewhat", not: "Not disappointed", nolonger: "Don't use it" } as Record<string, string>)[c.answer]}</Pill>{c.benefit && <p className="mt-1"><b>Helps with:</b> {c.benefit}</p>}{c.alt && <p><b>Would use instead:</b> {c.alt}</p>}</div>)}</div> : <p className="text-sm text-muted-foreground">No comments yet. The question appears for people who used the app on 2+ of the last 14 days.</p>}
      </Card>
      <div className="text-right"><Button size="sm" variant="ghost" className="rounded-full" onClick={load}><RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh</Button></div>
    </div>
  );
}

// ---------------- People ----------------
type U = { id: string; username: string; name: string; created?: number; suspended: boolean; lastActive: number | null; friends: number; admin: boolean };
function PeopleTab() {
  const [q, setQ] = useState(""); const [off, setOff] = useState(0); const [d, setD] = useState<{ total: number; users: U[] } | null>(null); const [msg, setMsg] = useState("");
  const load = useCallback(() => api<{ total: number; users: U[] }>(`admin-users?q=${encodeURIComponent(q)}&offset=${off}`).then(setD).catch(x => setMsg(errText(x))), [q, off]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  const act = async (u: U, op: string) => {
    if (op === "delete" && !confirm(`Delete ${u.username} and all their server data? This cannot be undone.`)) return;
    if (op === "suspend" && !confirm(`Pause ${u.username}? They will be signed out and cannot sign in.`)) return;
    if (op === "reset-password" && !confirm(`Make a new temporary password for ${u.username}? Their sessions end, and old private messages they received will no longer open (encryption keys are tied to the password).`)) return;
    try { const r = await api<{ password?: string }>("admin-user", { body: { id: u.id, op } }); setMsg(r.password ? `New password for ${u.username}: ${r.password}  (shown once. Share it privately and ask them to change it.)` : "Done."); load(); } catch (e) { setMsg(errText(e)); }
  };
  return (
    <Card title={`People${d ? ` (${d.total})` : ""}`}>
      <div className="relative mb-3 max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search by username" value={q} onChange={e => { setQ(e.target.value); setOff(0); }} /></div>
      {msg && <p className="mb-3 break-all rounded-xl bg-secondary px-3 py-2 text-sm">{msg}</p>}
      <div className="divide-y divide-border">
        {d?.users.map(u => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div><div className="font-medium">{u.name} <span className="text-sm text-muted-foreground">@{u.username}</span> {u.admin && <Pill tone="good">admin</Pill>} {u.suspended && <Pill tone="warn">paused</Pill>}</div><div className="text-xs text-muted-foreground">Joined {when(u.created)} · Last seen {when(u.lastActive)} · {u.friends} friends</div></div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => act(u, "reset-password")}>New password</Button>
              {!u.admin && (u.suspended ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => act(u, "unsuspend")}>Unpause</Button> : <Button size="sm" variant="outline" className="rounded-full" onClick={() => act(u, "suspend")}>Pause</Button>)}
              {!u.admin && <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => act(u, "delete")}>Delete</Button>}
            </div>
          </div>
        ))}
        {d && !d.users.length && <p className="py-3 text-sm text-muted-foreground">No one found.</p>}
      </div>
      {d && d.total > 25 && <div className="mt-3 flex items-center gap-2 text-sm"><Button size="sm" variant="outline" disabled={off === 0} onClick={() => setOff(Math.max(0, off - 25))}>Previous</Button><span className="text-muted-foreground">{off + 1} to {Math.min(off + 25, d.total)} of {d.total}</span><Button size="sm" variant="outline" disabled={off + 25 >= d.total} onClick={() => setOff(off + 25)}>Next</Button></div>}
      <p className="mt-3 text-xs text-muted-foreground">Journals, plans and check-ins live only on each person's device, so they are never visible here. Admins never see private messages from this panel.</p>
    </Card>
  );
}

// ---------------- Reports ----------------
type Rep = { id: string; fromName: string; againstName: string; againstId: string; reason: string; text: string; ts: number; status: string; suspended: boolean; note?: string; by?: string };
function ReportsTab() {
  const [r, setR] = useState<Rep[] | null>(null); const [open, setOpen] = useState(true);
  const load = useCallback(() => api<{ reports: Rep[] }>("admin-reports").then(x => setR(x.reports)), []);
  useEffect(() => { load(); }, [load]);
  if (!r) return <p className="text-muted-foreground">Loading...</p>;
  const list = r.filter(x => (x.status === "open") === open);
  return (
    <Card title="Reports from people" right={<div className="flex gap-1">{[true, false].map(o => <Button key={String(o)} size="sm" variant={open === o ? "hero" : "outline"} className="rounded-full" onClick={() => setOpen(o)}>{o ? "Open" : "Resolved"}</Button>)}</div>}>
      <div className="space-y-2">{list.map(x => (
        <div key={x.id} className="rounded-2xl border border-border p-3 text-sm">
          <div><b>@{x.fromName}</b> reported <b>@{x.againstName}</b> <Pill>{x.reason}</Pill> <span className="text-xs text-muted-foreground">{when(x.ts)}</span></div>
          {x.text && <p className="mt-1 text-muted-foreground">"{x.text}"</p>}
          {x.status !== "open" && <p className="mt-1 text-xs text-muted-foreground">Resolved by {x.by}{x.note ? `: ${x.note}` : ""}</p>}
          <div className="mt-2 flex gap-2">
            {x.status === "open" ? <>
              {!x.suspended && <Button size="sm" variant="outline" className="rounded-full" onClick={async () => { if (confirm(`Pause @${x.againstName}?`)) { await api("admin-user", { body: { id: x.againstId, op: "suspend" } }).catch(e => alert(errText(e))); load(); } }}>Pause them</Button>}
              <Button size="sm" variant="hero" className="rounded-full" onClick={async () => { const note = prompt("Short note (optional)") || ""; await api("admin-reports", { body: { id: x.id, op: "resolve", note } }); load(); }}>Mark resolved</Button>
            </> : <Button size="sm" variant="outline" className="rounded-full" onClick={async () => { await api("admin-reports", { body: { id: x.id, op: "reopen" } }); load(); }}>Reopen</Button>}
          </div>
        </div>))}
        {!list.length && <p className="text-sm text-muted-foreground">{open ? "Nothing waiting. " : "Nothing resolved yet."}</p>}
      </div>
    </Card>
  );
}

// ---------------- Team and notices ----------------
type Audit = { ts: number; by: string; action: string; detail: string };
function TeamTab() {
  const [a, setA] = useState<{ root: string[]; added: { id: string; username: string; name: string }[] } | null>(null); const [name, setName] = useState(""); const [text, setText] = useState(""); const [lvl, setLvl] = useState("info"); const [log, setLog] = useState<Audit[]>([]); const [m, setM] = useState("");
  const load = useCallback(() => { api<typeof a>("admin-admins").then(setA); api<{ items: Audit[] }>("admin-audit").then(x => setLog(x.items)); }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-4">
      <Card title="Notice for everyone">
        <p className="mb-2 text-sm text-muted-foreground">Shows as a small banner at the top of the app until each person closes it. Send an empty notice to remove it.</p>
        <Input maxLength={280} placeholder="For example: Scheduled maintenance tonight at 10pm" value={text} onChange={e => setText(e.target.value)} />
        <div className="mt-2 flex flex-wrap items-center gap-2"><select className="h-9 rounded-full border border-border bg-background px-3 text-sm" value={lvl} onChange={e => setLvl(e.target.value)}><option value="info">Normal</option><option value="important">Important</option></select><Button size="sm" variant="hero" className="rounded-full" onClick={async () => { await api("admin-announce", { body: { text, level: lvl } }); setM(text ? "Notice is live." : "Notice removed."); setText(""); load(); }}>{text ? "Publish" : "Remove notice"}</Button>{m && <span className="text-sm text-muted-foreground">{m}</span>}</div>
      </Card>
      <Card title="Admins">
        <ul className="space-y-1 text-sm">{a?.root.map(r => <li key={r}>@{r} <Pill tone="good">set in server settings</Pill></li>)}{a?.added.map(u => <li key={u.id} className="flex items-center gap-2">@{u.username} <Pill>added here</Pill><button className="text-xs text-destructive" onClick={async () => { await api("admin-admins", { body: { username: u.username, op: "remove" } }); load(); }}>Remove</button></li>)}</ul>
        <div className="mt-3 flex gap-2"><Input className="max-w-xs" placeholder="Username to make admin" value={name} onChange={e => setName(e.target.value)} /><Button size="sm" variant="outline" className="rounded-full" onClick={async () => { try { await api("admin-admins", { body: { username: name, op: "add" } }); setName(""); load(); } catch (e) { alert(errText(e)); } }}>Add admin</Button></div>
      </Card>
      <Card title="Clean up old messages">
        <p className="mb-2 text-sm text-muted-foreground">Permanently deletes every message and file that was sent before private messaging was turned on. Encrypted messages are not touched. This cannot be undone.</p>
        <Button size="sm" variant="outline" className="rounded-full text-destructive" onClick={async () => { if (!confirm("Delete all old unencrypted messages and files for everyone?")) return; try { const r = await api<{ removed: number; chats: number; files: number }>("admin-purge-legacy", { method: "POST", body: {} }); setM(`Deleted ${r.removed} messages and ${r.files} files from ${r.chats} chats.`); load(); } catch (e) { alert(errText(e)); } }}>Delete old unencrypted messages</Button>
      </Card>
      <Card title="Recent admin actions"><div className="max-h-80 space-y-1 overflow-auto text-sm">{log.map((l, i) => <div key={i} className="flex gap-3"><span className="w-40 shrink-0 text-xs text-muted-foreground">{when(l.ts)}</span><span>@{l.by} · {l.action.replace(/-/g, " ")} {l.detail && <span className="text-muted-foreground">({l.detail})</span>}</span></div>)}{!log.length && <p className="text-muted-foreground">Nothing yet.</p>}</div></Card>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview"); const [state, setState] = useState<"checking" | "out" | "no" | "yes">("checking");
  useEffect(() => { if (!getToken()) { setState("out"); return; } api<{ admin: boolean }>("me").then(r => setState(r.admin ? "yes" : "no")).catch(() => setState("out")); }, []);
  const shell = (c: React.ReactNode) => <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-5 text-center">{c}<a href="/" className="text-sm text-primary underline">Back to Cognitune</a></div>;
  if (state === "checking") return shell(<p className="text-muted-foreground">Checking...</p>);
  if (state === "out") return shell(<><h1 className="text-2xl font-semibold">Please sign in first</h1><p className="text-muted-foreground">Sign in to Cognitune with your admin account, then come back to this page.</p></>);
  if (state === "no") return shell(<><h1 className="text-2xl font-semibold">This page is for the team</h1><p className="text-muted-foreground">Your account is not an admin.</p></>);
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-5 pb-16 pt-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><a href="/" aria-label="Back to the app" className="rounded-full p-2 hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></a><h1 className="flex items-center gap-2 text-2xl font-semibold"><ShieldCheck className="h-6 w-6 text-primary" />Cognitune admin</h1></div></header>
      <nav className="mb-5 flex flex-wrap gap-1.5" aria-label="Admin sections">{TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>{t.label}</button>)}</nav>
      {tab === "overview" && <OverviewTab />}{tab === "experiments" && <ExperimentsTab />}{tab === "people" && <PeopleTab />}{tab === "reports" && <ReportsTab />}{tab === "team" && <TeamTab />}
    </div>
  );
}
