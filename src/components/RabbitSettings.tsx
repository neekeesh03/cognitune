import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { COATS, nameProblem, savePetLocal, usePet } from "@/lib/pet";
import { isStill } from "@/lib/useAlive";
import type { AuthApi, User } from "@/store/useAuth";
import { setSharing, sharingOn } from "@/lib/talkshare";

/** Rename your rabbit, change its coat, make it still, and read what it is. */
export function RabbitSettings({ auth }: { auth: AuthApi }) {
  const pet = usePet(); const [name, setName] = useState(pet.name); const [msg, setMsg] = useState(""); const [still, setStill] = useState(isStill());
  const save = async (next: { name: string; coat: string }) => {
    const p = nameProblem(next.name); if (p) { setMsg(p); return; } savePetLocal(next);
    try { const r = await api<{ user: User }>("profile", { body: { pet: next } }); auth.updateUser(r.user); setMsg("Saved."); } catch (e) { setMsg((e as Error).message); }
  };
  const [share, setShare] = useState(sharingOn()); const toggleShare = () => { const v = !share; setShare(v); setSharing(v); };
  const [roam, setRoam] = useState(localStorage.getItem("lagomo.rabbit.roam") !== "0");
  const toggleRoam = () => { const v = !roam; setRoam(v); v ? localStorage.removeItem("lagomo.rabbit.roam") : localStorage.setItem("lagomo.rabbit.roam", "0"); };
  const toggleStill = () => { const v = !still; setStill(v); v ? localStorage.setItem("lagomo.rabbit.still", "1") : localStorage.removeItem("lagomo.rabbit.still"); window.dispatchEvent(new Event("lagomo:pet")); };
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-3 text-sm font-semibold">Your rabbit</div>
      <div className="flex gap-2"><input value={name} onChange={e => { setName(e.target.value.slice(0, 20)); setMsg(""); }} aria-label="Your rabbit's name" maxLength={20} className="h-11 min-w-0 flex-1 rounded-2xl border border-border bg-secondary/40 px-3 outline-none focus:ring-2 focus:ring-primary/30" /><Button variant="hero" className="rounded-full" disabled={!name.trim() || name.trim() === pet.name} onClick={() => save({ name: name.trim(), coat: pet.coat })}>Rename</Button></div>
      <div className="mt-3 flex items-center gap-2" role="radiogroup" aria-label="Coat">{COATS.map(c => <button key={c.id} role="radio" aria-checked={pet.coat === c.id} aria-label={c.label} onClick={() => save({ name: pet.name, coat: c.id })} className={`h-8 w-8 rounded-full border-2 ${pet.coat === c.id ? "border-primary" : "border-transparent"}`}><span className="block h-full w-full rounded-full" style={{ background: "#9a85c9", filter: c.filter }} /></button>)}</div>
      <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={still} onChange={toggleStill} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" /><span><b>Still mode</b><span className="block text-xs text-muted-foreground">{pet.name} stops blinking, twitching and watching your finger. It stays calm and quiet.</span></span></label>
      <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={roam} onChange={toggleRoam} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" /><span><b>Let {pet.name} wander</b><span className="block text-xs text-muted-foreground">{pet.name} sits at the bottom of Today and sometimes hops to another spot.</span></span></label>
      <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={share} onChange={toggleShare} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" /><span><b>Help train {pet.name}</b><span className="block text-xs text-muted-foreground">Share what you type in Talk, without your name or account, so {pet.name} learns to chat better. Messages that sound like a crisis or a low mood are never shared. Turn this off and nothing more is sent.</span></span></label>
      <p className="mt-4 rounded-2xl bg-secondary/50 p-3 text-xs text-muted-foreground"><b className="text-foreground">About {pet.name}.</b> {pet.name} is an AI that lives in this app. It is a small model that runs on your device and helps you start things. It is not a person, it does not have feelings, and it is not a therapist. What you tell it stays on your device. If things ever feel unsafe, findahelpline.com lists free lines by country.</p>
      {msg && <p className="mt-2 text-xs text-primary" role="status">{msg}</p>}
    </div>);
}
