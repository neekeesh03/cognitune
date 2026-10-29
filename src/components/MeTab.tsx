import { useEffect, useRef, useState } from "react";
import { Flame, Gift, Lock, Snowflake, Sparkles, Trash2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Garden } from "@/components/Garden";
import { Avatar } from "@/components/Avatar";
import { AvatarEditor } from "@/components/AvatarEditor";
import { StartsCard } from "@/components/StartsCard";
import { PlusCard } from "@/components/PlusCard";
import { api, getToken } from "@/lib/api";
import type { AuthApi } from "@/store/useAuth";
import { JournalTab } from "@/components/JournalTab";
import type { JournalApi } from "@/store/useJournal";
import type { AvatarSpec } from "@/engine/avatar";
import { InsightsTab } from "@/components/InsightsTab";
import { BADGES, dkey, levelFor } from "@/engine/game";
import type { GameApi } from "@/store/useGame";
import type { Profile } from "@/engine/profile";
import type { CheckIn } from "@/engine/analytics";

const KEYS = ["cognitune.history.v2", "cognitune.entries.v1", "cognitune.settings.v1", "cognitune.game.v1", "cognitune.tasks.v1", "cognitune.blocks.v1"];
interface Props { j: JournalApi; auth: AuthApi; game: GameApi; profile: Profile; history: CheckIn[]; onFollowUp: (id: string, s: boolean) => void; onClear: () => void; onDelete: (id: string) => void }

export function MeTab({ j, auth, game, profile, history, onFollowUp, onClear, onDelete }: Props) {
  const [view, setView] = useState<"progress" | "rewards" | "journal" | "insights" | "profile" | "data">("progress");
  const [admin, setAdmin] = useState(false); useEffect(() => { api<{ admin: boolean }>("me").then(r => setAdmin(!!r.admin)).catch(() => {}); }, []);
  const user = auth.user!; const [pname, setPname] = useState(user.name); const [pav, setPav] = useState<AvatarSpec>(user.avatar); const [pmsg, setPmsg] = useState(""); const [delPw, setDelPw] = useState("");
  const saveProfile = async () => { setPmsg(""); try { const r = await api<{ user: typeof user }>("profile", { body: { name: pname, avatar: pav } }); auth.updateUser(r.user); setPmsg("Saved."); } catch (e) { setPmsg((e as Error).message); } };
  const deleteAccount = async () => { if (!confirm("Delete your account and all your messages? This cannot be undone.")) return; try { await api("account", { method: "DELETE", body: user.g ? { confirm: delPw } : { password: delPw } }); auth.logout(); } catch (e) { setPmsg((e as Error).message); } };
  const { g } = game; const lv = levelFor(g.lifetime); const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(""); const [cost, setCost] = useState("50");
  const boxReady = g.todayActive && g.boxDay !== dkey();
  const exportAll = () => { const o: Record<string, string | null> = {}; KEYS.forEach(k => (o[k] = localStorage.getItem(k))); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: "application/json" })); a.download = `cognitune-backup-${dkey()}.json`; a.click(); };
  const importAll = async (f: File) => { try { const o = JSON.parse(await f.text()); Object.entries(o).forEach(([k, v]) => KEYS.includes(k) && typeof v === "string" && localStorage.setItem(k, v)); location.reload(); } catch { alert("That file could not be read."); } };
  return (
    <div className="animate-rise mx-auto max-w-3xl">
      <div className="mb-6 flex w-fit flex-wrap gap-1 rounded-full bg-foreground/[.05] p-1">{([["progress", "Progress"], ["rewards", "Rewards"], ["journal", "Journal"], ["insights", "About me"], ["profile", "Profile"], ["data", "Settings"]] as const).map(([id, l]) => <button key={id} onClick={() => setView(id)} className={`rounded-full px-4 py-1.5 text-sm ${view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>)}</div>

      {view === "progress" && (
        <div className="space-y-5">
          <div className="glass rounded-3xl p-6 text-center">
            <Garden lifetime={g.lifetime} />
            <div className="mt-2 text-3xl font-semibold">{lv.name}</div>
            <div className="text-sm text-muted-foreground">Level {lv.level + 1} · {g.lifetime} sparks earned</div>
            <div className="mx-auto mt-3 h-2.5 max-w-xs rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${lv.pct * 100}%` }} /></div>
            <div className="mt-1 text-xs text-muted-foreground">{lv.level >= 8 ? "Fully grown" : `${lv.need - lv.into} sparks to the next stage`}</div>
          </div>
          <StartsCard name={user.name} avatar={user.avatar} g={g} />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="glass rounded-3xl p-4"><Flame className="mx-auto h-6 w-6" style={{ color: "hsl(var(--f-primode))" }} /><div className="text-3xl font-semibold">{g.streak.current}</div><div className="text-xs text-muted-foreground">showing-up days</div></div>
            <div className="glass rounded-3xl p-4"><Sparkles className="mx-auto h-6 w-6 text-primary" /><div className="text-3xl font-semibold">{g.sparks}</div><div className="text-xs text-muted-foreground">sparks to spend</div></div>
            <div className="glass rounded-3xl p-4"><Snowflake className="mx-auto h-6 w-6" style={{ color: "hsl(var(--f-anchory))" }} /><div className="text-3xl font-semibold">{g.streak.freezes}</div><div className="text-xs text-muted-foreground">rest days saved</div></div>
          </div>
          <p className="text-center text-xs text-muted-foreground">Best streak: {g.streak.best} {g.streak.best === 1 ? "day" : "days"}. A freeze covers a missed day so your streak stays safe. You earn one every 7 days.</p>
          <div className="glass flex items-center justify-between gap-3 rounded-3xl p-5">
            <div><div className="font-semibold">Daily spark box</div><div className="text-sm text-muted-foreground">{boxReady ? "You showed up today. Open it!" : g.boxDay === dkey() ? "Opened today. Come back tomorrow." : "Do one thing today to unlock it."}</div></div>
            <Button variant="hero" className="rounded-full" disabled={!boxReady} onClick={game.openBox}><Gift className="mr-2 h-4 w-4" />Open</Button>
          </div>
          <div className="glass rounded-3xl p-5">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Badges</div>
            <div className="grid gap-2 sm:grid-cols-2">{BADGES.map(b => { const on = g.badges.includes(b.id); return (
              <div key={b.id} className={`flex items-center gap-3 rounded-2xl p-3 ${on ? "bg-primary/10" : "bg-foreground/[.04] opacity-70"}`}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${on ? "bg-primary text-primary-foreground" : "bg-foreground/10"}`}>{on ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</div>
                <div><div className="text-sm font-semibold">{b.name}</div><div className="text-xs text-muted-foreground">{b.how}</div></div></div>); })}</div>
          </div>
        </div>)}

      {view === "rewards" && (
        <div className="space-y-5">
          <div className="glass rounded-3xl p-5 text-center"><div className="text-4xl font-semibold">{g.sparks}</div><div className="text-sm text-muted-foreground">sparks to spend on real rewards you choose</div></div>
          <div className="space-y-3">{g.rewards.map(r => (
            <div key={r.id} className="glass flex items-center justify-between gap-3 rounded-3xl p-4">
              <div><div className="font-semibold">{r.name}</div><div className="text-sm text-muted-foreground">{r.cost} sparks</div></div>
              <div className="flex items-center gap-2"><Button variant={g.sparks >= r.cost ? "hero" : "outline"} className="rounded-full" disabled={g.sparks < r.cost} onClick={() => game.claim(r.id)}>{g.sparks >= r.cost ? "Claim" : `${r.cost - g.sparks} to go`}</Button><button aria-label={`Remove ${r.name}`} className="p-2 text-muted-foreground hover:text-foreground" onClick={() => game.removeReward(r.id)}><Trash2 className="h-4 w-4" /></button></div>
            </div>))}</div>
          <div className="glass rounded-3xl p-4">
            <div className="mb-2 text-sm font-semibold">Add your own reward</div>
            <div className="flex gap-2"><Input className="h-11 rounded-2xl bg-secondary/60" placeholder="e.g. A walk in the park" value={name} onChange={e => setName(e.target.value)} /><Input className="h-11 w-24 rounded-2xl bg-secondary/60" inputMode="numeric" value={cost} onChange={e => setCost(e.target.value)} aria-label="Cost in sparks" /></div>
            <Button variant="hero" className="mt-3 w-full rounded-2xl" disabled={!name.trim() || !Number(cost)} onClick={() => { game.addReward(name.trim(), Number(cost)); setName(""); }}>Add reward</Button>
          </div>
          {g.claimed.length > 0 && <div className="text-sm text-muted-foreground">Recently claimed: {g.claimed.slice(0, 3).map(c => c.name).join(", ")}</div>}
        </div>)}

      {view === "journal" && <JournalTab j={j} earn={() => game.earn("journal")} />}
      {view === "insights" && <InsightsTab profile={profile} history={history} onFollowUp={onFollowUp} onClear={onClear} onDelete={onDelete} />}

      {view === "profile" && (
        <div className="space-y-5">
          <div className="glass space-y-4 rounded-3xl p-5">
            <div className="flex items-center gap-3"><Avatar spec={user.avatar} size={48} /><div><div className="text-lg font-semibold">{user.name}</div><div className="text-sm text-muted-foreground">@{user.username}</div></div></div>
            <AvatarEditor value={pav} onChange={setPav} />
            <Input className="h-11 rounded-2xl bg-secondary/60" placeholder="Display name" maxLength={30} value={pname} onChange={e => setPname(e.target.value)} />
            <Button variant="hero" className="w-full rounded-2xl" onClick={saveProfile}>Save profile</Button>
            {pmsg && <p className="text-sm text-muted-foreground" role="status">{pmsg}</p>}
          </div>
          <div className="glass space-y-3 rounded-3xl p-5 text-sm"><Button variant="outline" className="rounded-full" onClick={auth.logout}>Log out</Button>
            <div className="border-t border-border pt-3"><div className="font-semibold">Delete account</div><p className="mb-2 text-muted-foreground">Removes your account, friends list and messages from our server. Your journal and plans on this device are not touched.</p><div className="flex gap-2"><Input type={user.g ? "text" : "password"} className="h-10 rounded-2xl bg-secondary/60" placeholder={user.g ? "Type your username to confirm" : "Your password"} value={delPw} onChange={e => setDelPw(e.target.value)} /><Button variant="outline" className="rounded-full" disabled={!delPw} onClick={deleteAccount}>Delete</Button></div></div></div>
        </div>)}

      {view === "data" && (
        <div className="space-y-5">
          <PlusCard />
          <div className="glass rounded-3xl p-5 text-sm">
            {admin && <div className="mt-4 border-t border-border pt-3"><div className="font-semibold">Team</div><p className="text-muted-foreground">You are an admin. The admin panel has people, reports and announcements.</p><a href="/admin" className="mt-2 inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">Open admin panel</a></div>}
          </div>
          <div className="glass rounded-3xl p-5 text-sm">
            <div className="mb-1 text-lg font-semibold">Your personal data stays on this device</div>
            <p className="text-muted-foreground">Your journal, plans and rewards are saved on this device only. Clearing your browser data would erase them, and they do not follow you to other devices yet. Save a backup file now and then, and load it on another device to continue there.</p>
            <div className="mt-4 flex flex-wrap gap-2"><Button variant="hero" className="rounded-full" onClick={exportAll}><Download className="mr-2 h-4 w-4" />Save backup</Button><Button variant="outline" className="rounded-full" onClick={() => file.current?.click()}><Upload className="mr-2 h-4 w-4" />Load backup</Button><input ref={file} type="file" accept="application/json" hidden onChange={e => e.target.files?.[0] && importAll(e.target.files[0])} /></div>
          </div>
          <div className="glass rounded-3xl p-5 text-sm"><div className="mb-1 text-lg font-semibold">Need support?</div><p className="text-muted-foreground">Cognitune is a helper for building habits. It is not therapy or medical advice. If you are struggling or in crisis, please reach out to someone you trust or a local helpline. <a className="underline" href="https://findahelpline.com" target="_blank" rel="noreferrer">findahelpline.com</a> lists free lines by country.</p></div>
        </div>)}
    </div>
  );
}
