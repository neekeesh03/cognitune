import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Companion } from "@/components/Companion";
import { greeting, reply } from "@/engine/friend";
import { promptFor } from "@/engine/prompts";
import type { JournalApi } from "@/store/useJournal";

export function TalkTab({ j, earn }: { j: JournalApi; earn?: () => void }) {
  const { entries, profile, settings } = j;
  const chat = useMemo(() => entries.filter(e => e.kind === "chat").slice(-60), [entries]);
  const [text, setText] = useState(""); const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.length, typing]);
  useEffect(() => {
    if (started.current || chat.length > 0) return; started.current = true;
    j.addFriend(greeting(settings.name, profile)); j.addFriend(promptFor(profile, j.shuffleToday).text);
  }); // eslint-disable-line
  const send = () => {
    const t = text.trim(); if (!t || typing) return; setText("");
    const r = reply(t, profile, t + entries.length);
    j.addUser(t, "chat"); earn?.(); setTyping(true);
    r.messages.forEach((m, i) => setTimeout(() => { j.addFriend(m); if (i === r.messages.length - 1) setTyping(false); }, 700 + i * 1100));
  };
  return (
    <div className="animate-rise mx-auto flex max-w-2xl flex-col" style={{ minHeight: "calc(100vh - 11rem)" }}>
      <div className="mb-2 flex items-center gap-3"><div className="w-14"><Companion size={56} talking={typing} mood={typing ? "thinking" : "calm"} /></div><div><div className="font-display text-2xl">Tune</div><div className="text-xs text-muted-foreground">Private, on this device. A rule-based companion, not a therapist.</div></div></div>
      <div className="flex-1 space-y-3 py-4">
        {chat.map(m => <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : ""}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${m.role === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-foreground/[.07]"}`}>{m.text}</div></div>)}
        {typing && <div className="flex"><div className="rounded-2xl rounded-tl-sm bg-foreground/[.07] px-4 py-3"><span className="inline-flex gap-1">{[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />)}</span></div></div>}
        <div ref={end} />
      </div>
      <div className="sticky bottom-24 flex items-end gap-2 rounded-3xl glass p-2">
        <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder="Say anything..." className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none" />
        <button aria-label="Send" onClick={send} disabled={!text.trim() || typing} className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
