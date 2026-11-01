import { useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { RabbitFace } from "@/components/RabbitFace";
import { usePet } from "@/lib/pet";
import { emptyState, loadChat, respond, saveChat, setMyName, upgradeTalk, type Chip, type Ctx, type Msg, type TalkState } from "@/engine/talk";
import { tr } from "@/i18n";
import { markNotice, noticeSeen, setSharing, sharingOn, shareTurn } from "@/lib/talkshare";

const uid = () => Math.random().toString(36).slice(2, 10);
export interface TalkProps { myName: string; ctx: Ctx; onStart: (title: string, step: string) => void; onCoach: (task?: string) => void; onPlan: () => void; onCircle: () => void }

/** A calm one-to-one chat with your rabbit. History stays on this device. */
export function TalkTab({ myName, ctx, onStart, onCoach, onPlan, onCircle }: TalkProps) {
  const pet = usePet(); setMyName(myName);
  const init = useRef(loadChat()); const [msgs, setMsgs] = useState<Msg[]>(init.current.msgs); const [st, setSt] = useState<TalkState>(init.current.state);
  const [text, setText] = useState(""); const stRef = useRef<TalkState>(init.current.state); const queue = useRef<{ t: string; via: "typed" | "chip" }[]>([]); const running = useRef(false); const [notice, setNotice] = useState(() => !noticeSeen() && sharingOn()); const [busy, setBusy] = useState(false); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { saveChat(msgs, st); stRef.current = st; }, [msgs, st]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, busy]);
  const drain = async () => {
    if (running.current) return; running.current = true; setBusy(true);
    try {
      while (queue.current.length) {
        const { t, via } = queue.current.shift()!; const st0 = stRef.current;
        try {
          const turn = await respond(t, st0, ctx); stRef.current = turn.state;
          shareTurn({ x: t, prev: st0.last, act: turn.act, conf: turn.conf, via, unsure: turn.unsure }, { sensitive: turn.sensitive, names: [myName, pet.name] });
          await new Promise(r => setTimeout(r, 300 + Math.min(600, turn.reply.length * 5)));
          setSt(turn.state); setMsgs(m => [...m, { id: uid(), from: "pip", text: turn.reply, ts: Date.now(), chips: turn.chips, act: turn.act, conf: turn.conf }]);
        } catch { setMsgs(m => [...m, { id: uid(), from: "pip", text: "Something went wrong on my side. Try again in a moment.", ts: Date.now() }]); }
      }
    } finally { running.current = false; setBusy(false); }
  };
  // Messages typed while the rabbit is still replying are queued, never dropped.
  const send = (raw: string, via: "typed" | "chip" = "typed") => {
    const t = raw.trim().slice(0, 300); if (!t) return; setText(""); window.setTimeout(() => void upgradeTalk(), 4000); // they use Talk, so fetch the larger model quietly
    queue.current.push({ t, via }); setMsgs(m => [...m.map(x => ({ ...x, chips: undefined })), { id: uid(), from: "me", text: t, ts: Date.now() }]); void drain();
  };
  const chip = (c: Chip) => {
    if (c.act === "start") { onStart(c.task ?? "Something small", c.step ?? "Open it and look at it for two minutes."); return; }
    if (c.act === "coach") { onCoach(c.task); return; }
    if (c.act === "plan") { onPlan(); return; }
    if (c.act === "circle") { onCircle(); return; }
    if (c.send) void send(c.send, "chip");
  };
  const clear = () => { if (!confirm(tr("Clear this chat? It only lives on this device."))) return; setMsgs([]); setSt(emptyState()); };
  const greeting = msgs.length === 0;
  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] max-w-2xl flex-col lg:h-[calc(100dvh-8rem)]">
      <div className="glass flex items-center gap-3 rounded-3xl px-4 py-3">
        <div className="shrink-0"><RabbitFace alive face={busy ? "curious" : "happy"} crop size={44} /></div>
        <div className="min-w-0 flex-1"><div className="font-semibold"><span translate="no">{pet.name}</span></div><div className="text-xs text-muted-foreground">An AI that runs on your device. Chats help train it unless you turn that off in Me.</div></div>
        {!greeting && <button onClick={clear} aria-label="Clear chat" className="rounded-full p-2 text-muted-foreground hover:text-foreground"><Trash2 className="h-4 w-4" /></button>}
      </div>
      {notice && <div className="glass mt-3 rounded-3xl p-4 text-sm" role="note"><div className="font-semibold">Helping <span translate="no">{pet.name}</span> learn</div><p className="mt-1 text-muted-foreground">To make <span translate="no">{pet.name}</span> better at conversation, what you type here is shared without your name or account, with emails, links and numbers removed. Messages that sound like a crisis or a low mood are never shared. You can turn this off any time in Me, under Settings.</p><div className="mt-3 flex gap-2"><button onClick={() => { markNotice(); setNotice(false); }} className="rounded-full bg-primary px-4 py-1.5 text-primary-foreground">OK</button><button onClick={() => { setSharing(false); markNotice(); setNotice(false); }} className="rounded-full border border-border px-4 py-1.5 text-muted-foreground">Turn off</button></div></div>}
      <div className="mt-3 flex-1 space-y-3 overflow-y-auto px-1 pb-2" role="log" aria-live="polite">
        {greeting && <div className="mt-6 text-center"><div className="text-lg font-semibold"><span translate="no">{pet.name}</span> is here.</div><p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Tell me what's on your mind, or what you keep putting off.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">{["Help me start", "I'm stuck", "Plan my day", "I'm tired"].map(c => <button key={c} onClick={() => void send(c)} className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground">{c}</button>)}</div></div>}
        {msgs.map((m, i) => (
          <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-[15px] leading-snug ${m.from === "me" ? "bg-primary text-primary-foreground" : "glass"}`}>
              {m.from === "me" ? m.text : <span translate="no">{m.text}</span>}
              {m.chips && m.chips.length > 0 && i === msgs.length - 1 && <div className="mt-2 flex flex-wrap gap-2">{m.chips.map(c => <button key={c.label} onClick={() => chip(c)} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20">{c.label}</button>)}</div>}
            </div>
          </div>))}
        {busy && <div className="flex justify-start"><div className="glass rounded-3xl px-4 py-3" aria-label="Typing"><span className="inline-flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:240ms]" /></span></div></div>}
        <div ref={end} />
      </div>
      <form onSubmit={e => { e.preventDefault(); void send(text); }} className="glass mt-2 flex items-center gap-2 rounded-full py-1.5 pe-1.5 ps-4">
        <input value={text} onChange={e => setText(e.target.value)} maxLength={300} placeholder="Say something" aria-label="Message" className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        <button type="submit" disabled={!text.trim()} aria-label="Send" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </form>
    </div>);
}
