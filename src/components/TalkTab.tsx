import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Companion } from "@/components/Companion";
import { greeting } from "@/engine/friend";
import { MENU, newState, respond, type Action, type Chip, type DState } from "@/engine/dialogue";
import type { JournalApi } from "@/store/useJournal";

const KEY = "cognitune.dialog.v1";
const loadState = (): { s: DState; chips: Chip[] } => { try { const o = JSON.parse(localStorage.getItem(KEY) || ""); if (o && Date.now() - o.s.ts < 3 * 3600e3) return o; } catch { /* new */ } return { s: newState(), chips: MENU }; };

export function TalkTab({ j, earn, onAction }: { j: JournalApi; earn?: () => void; onAction?: (a: Action) => void }) {
  const { entries, profile, settings } = j;
  const chat = useMemo(() => entries.filter(e => e.kind === "chat").slice(-80), [entries]);
  const [text, setText] = useState(""); const [typing, setTyping] = useState(false);
  const init = useRef(loadState()); const dstate = useRef<DState>(init.current.s); const [chips, setChips] = useState<Chip[]>(init.current.chips);
  const end = useRef<HTMLDivElement>(null); const started = useRef(false);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.length, typing, chips.length]);
  useEffect(() => {
    if (started.current || chat.length > 0) return; started.current = true;
    j.addFriend(greeting(settings.name, profile)); j.addFriend("What would help most right now?"); setChips(MENU);
  }); // eslint-disable-line
  const persist = (s: DState, c: Chip[]) => { try { localStorage.setItem(KEY, JSON.stringify({ s, chips: c })); } catch { /* ignore */ } };
  const send = (value?: string, label?: string) => {
    const t = (value ?? text).trim(); if (!t || typing) return; setText(""); setChips([]);
    const { state, turn } = respond(dstate.current, t, { name: settings.name, hour: new Date().getHours() });
    dstate.current = state; j.addUser(label ?? t, "chat"); earn?.(); setTyping(true);
    const msgs = turn.messages.filter(Boolean);
    msgs.forEach((m, i) => setTimeout(() => {
      j.addFriend(m);
      if (i === msgs.length - 1) { setTyping(false); const c = turn.chips ?? []; setChips(c); persist(state, c); turn.actions?.forEach(a => onAction?.(a)); }
    }, 650 + i * 1000));
    if (!msgs.length) { setTyping(false); persist(state, []); }
  };
  return (
    <div className="animate-rise mx-auto flex max-w-2xl flex-col" style={{ minHeight: "calc(100vh - 11rem)" }}>
      <div className="mb-2 flex items-center gap-3"><div className="w-14"><Companion size={56} talking={typing} mood={typing ? "thinking" : "calm"} /></div><div><div className="text-2xl font-semibold">Tune</div><div className="text-xs text-muted-foreground">Private, on this device. Simple rules, not an AI service and not a therapist.</div></div></div>
      <div className="flex-1 space-y-3 py-4">
        {chat.map(m => <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : ""}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${m.role === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-foreground/[.07]"}`}>{m.text}</div></div>)}
        {typing && <div className="flex"><div className="rounded-2xl rounded-tl-sm bg-foreground/[.07] px-4 py-3"><span className="inline-flex gap-1">{[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />)}</span></div></div>}
        {!typing && chips.length > 0 && <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Quick replies">{chips.map(c => <button key={c.label} onClick={() => send(c.value, c.label)} className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary transition hover:bg-primary/20">{c.label}</button>)}</div>}
        <div ref={end} />
      </div>
      <div className="sticky bottom-24 flex items-end gap-2 rounded-3xl glass p-2">
        <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder="Say anything, or tap a reply..." className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none" />
        <button aria-label="Send" onClick={() => send()} disabled={!text.trim() || typing} className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
