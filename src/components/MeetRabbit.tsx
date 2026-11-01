import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RabbitFace } from "@/components/RabbitFace";
import { api } from "@/lib/api";
import { tr } from "@/i18n";
import { COATS, DEFAULT_PET, SUGGESTIONS, nameProblem, savePetLocal } from "@/lib/pet";
import type { AuthApi, User } from "@/store/useAuth";

const pickSome = () => [...SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 6);
/** Shown once, right after you make an account (and once for people who joined before rabbits had names). Name it, pick a coat. Skipping is fine. */
export function MeetRabbit({ auth, onDone }: { auth: AuthApi; onDone: () => void }) {
  const [name, setName] = useState(""); const [coat, setCoat] = useState("lavender"); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const sug = useMemo(pickSome, []);
  const save = async (pet: { name: string; coat: string }) => {
    setErr(""); const p = nameProblem(pet.name); if (p) { setErr(p); return; } setBusy(true);
    try { savePetLocal(pet); const r = await api<{ user: User }>("profile", { body: { pet } }); auth.updateUser(r.user); onDone(); }
    catch (e) { savePetLocal(pet); setErr((e as Error).message === "Pick a name without links, emails or long numbers." ? (e as Error).message : ""); if ((e as Error).message?.startsWith("Pick a name")) { setBusy(false); return; } onDone(); }
    finally { setBusy(false); }
  };
  const shown = name.trim() || "your rabbit";
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <style>{`.mr-coat{filter:var(--f)}`}</style>
      <div style={{ filter: COATS.find(c => c.id === coat)?.filter }}><RabbitFaceStatic /></div>
      <h1 className="mt-2 text-4xl leading-tight">Meet your rabbit.</h1>
      <p className="mt-2 max-w-xs text-muted-foreground">It lives in Lagomo, keeps you company, and helps you start. Give it a name.</p>
      <input value={name} onChange={e => { setName(e.target.value.slice(0, 20)); setErr(""); }} onKeyDown={e => e.key === "Enter" && name.trim() && save({ name, coat })} aria-label="Your rabbit's name" placeholder="A name for your rabbit" maxLength={20} className="mt-5 h-12 w-full rounded-2xl border border-border bg-secondary/40 px-4 text-center text-lg outline-none focus:ring-2 focus:ring-primary/40" />
      <div className="mt-3 flex flex-wrap justify-center gap-2">{sug.map(x => <button key={x} onClick={() => { setName(x); setErr(""); }} className={`rounded-full border px-3 py-1.5 text-sm ${name === x ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/60"}`}>{x}</button>)}
        <button onClick={() => { setName(SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)]); setErr(""); }} className="rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/60">Surprise me</button></div>
      <div className="mt-5 text-sm text-muted-foreground">Pick a coat</div>
      <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Coat">{COATS.map(c => <button key={c.id} role="radio" aria-checked={coat === c.id} aria-label={c.label} onClick={() => setCoat(c.id)} className={`h-9 w-9 rounded-full border-2 ${coat === c.id ? "border-primary" : "border-transparent"}`}><span className="block h-full w-full rounded-full" style={{ background: "#9a85c9", filter: c.filter }} /></button>)}</div>
      <Button variant="hero" className="mt-6 h-12 w-full rounded-2xl text-base" disabled={busy || !name.trim()} onClick={() => save({ name, coat })}>{shown === "your rabbit" ? tr("Say hi to your rabbit") : tr("Say hi to {name}").replace("{name}", shown)}</Button>
      <button disabled={busy} onClick={() => save({ ...DEFAULT_PET, coat })} className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:underline">Name it later</button>
      {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
      <p className="mt-4 max-w-xs text-xs text-muted-foreground">Your rabbit is a small AI that runs in this app. What you tell it stays on your device. You can rename it any time in Me.</p>
    </div>);
}
function RabbitFaceStatic() { return <RabbitFace alive face="happy" size={150} />; }
