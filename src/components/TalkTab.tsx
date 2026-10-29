import { useEffect, useMemo, useRef, useState } from "react";
import { Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { Companion } from "@/components/Companion";
import { greeting } from "@/engine/friend";
import { MENU, newState, respond, type Action, type Chip, type DState } from "@/engine/dialogue";
import type { JournalApi } from "@/store/useJournal";
import type { FeedbackApi } from "@/store/useFeedback";

const REASONS = ["Not relevant", "Too pushy", "Repeated itself", "Did not understand", "Something else"];

const KEY = "cognitune.dialog.v1";
const loadState = (): { s: DState; chips: Chip[] } => { try { const o = JSON.parse(localStorage.getItem(KEY) || ""); if (o && Date.now() - o.s.ts < 3 * 3600e3) return o; } catch { /* new */ } return { s: newState(), chips: MENU }; };

export function TalkTab({ j, earn, onAction, fb }: { j: JournalApi; earn?: () => void; onAction?: (a: Action) => void; fb: FeedbackApi }) {
  const [askShare, setAskShare] = useState(false); const [reasonFor, setReasonFor] = useState<string | null>(null);
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
    const prevTune = [...chat].reverse().find(e => e.role === "friend")?.text ?? "";
    msgs.forEach((m, i) => setTimeout(() => {
      j.addFriend(m, i === msgs.length - 1 ? { flow: state.flow ?? "", step: state.step ?? "", user: t, prev: prevTune } : undefined);
      if (i === msgs.length - 1) { setTyping(false); const c = turn.chips ?? []; setChips(c); persist(state, c); turn.actions?.forEach(a => onAction?.(a)); }
    }, 650 + i * 1000));
    if (!msgs.length) { setTyping(false); persist(state, []); }
  };
  return (
    <div className="animate-rise mx-auto flex max-w-2xl flex-col" style={{ minHeight: "calc(100vh - 11rem)" }}>
      <div className="mb-2 flex items-center gap-3"><div className="w-14"><Companion size={56} talking={typing} mood={typing ? "thinking" : "calm"} /></div><div><div className="text-2xl font-semibold">Tune</div><div className="text-xs text-muted-foreground">Private, on this device. Simple rules, not an AI service and not a therapist.</div></div></div>
      <div className="flex-1 space-y-3 py-4">
        {chat.map(m => { const r = m.meta ? fb.rated(m.id) : undefined; const rate = (rating: "up" | "down", reason?: string) => { fb.rate({ id: m.id, ts: Date.now(), rating, reason, flow: m.meta!.flow, step: m.meta!.step, prev: m.meta!.prev, user: m.meta!.user, reply: m.text }); if (fb.share === null) setAskShare(true); setReasonFor(rating === "down" && !reason ? m.id : null); }; return (
          <div key={m.id}><div className={`flex ${m.role === "user" ? "justify-end" : ""}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${m.role === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-foreground/[.07]"}`}>{m.text}</div></div>
            {m.meta && <div className="mt-1 flex flex-wrap items-center gap-1 pl-1 text-xs text-muted-foreground">
              <button aria-label="This helped" aria-pressed={r?.rating === "up"} onClick={() => rate("up")} className={`rounded-full p-1.5 hover:text-foreground ${r?.rating === "up" ? "text-primary" : ""}`}><ThumbsUp className="h-3.5 w-3.5" /></button>
              <button aria-label="This did not help" aria-pressed={r?.rating === "down"} onClick={() => rate("down")} className={`rounded-full p-1.5 hover:text-foreground ${r?.rating === "down" ? "text-destructive" : ""}`}><ThumbsDown className="h-3.5 w-3.5" /></button>
              {r && reasonFor !== m.id && <span>Thanks, noted.</span>}
              {reasonFor === m.id && <span className="flex flex-wrap gap-1">{REASONS.map(x => <button key={x} onClick={() => rate("down", x)} className="rounded-full border border-border px-2.5 py-1 hover:text-foreground">{x}</button>)}</span>}
            </div>}</div>); })}
        {askShare && fb.share === null && <div className="glass rounded-2xl p-4 text-sm"><div className="font-semibold">Help make Tune better?</div><p className="mt-1 text-muted-foreground">Your ratings are saved on this device. If you like, you can share each rated reply, your message before it, and the rating, with no name or account attached, so Tune can be trained to talk better. You can turn this off any time in Me, Settings.</p><div className="mt-3 flex gap-2"><button className="rounded-full bg-primary px-4 py-1.5 text-primary-foreground" onClick={() => { fb.setShare(true); fb.items.forEach(fb.upload); setAskShare(false); }}>Yes, share anonymously</button><button className="rounded-full border border-border px-4 py-1.5" onClick={() => { fb.setShare(false); setAskShare(false); }}>Keep private</button></div></div>}
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
