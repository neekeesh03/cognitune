import { useState } from "react";
import { TalkTab } from "@/components/TalkTab";
import { JournalTab } from "@/components/JournalTab";
import type { JournalApi } from "@/store/useJournal";
export function TuneTab({ j, earnChat, earnJournal }: { j: JournalApi; earnChat: () => void; earnJournal: () => void }) {
  const [v, setV] = useState<"chat" | "journal">("chat");
  return (
    <div>
      <div className="mx-auto mb-4 flex w-fit gap-1 rounded-full bg-foreground/[.05] p-1">{([["chat", "Chat with Tune"], ["journal", "Journal"]] as const).map(([id, l]) => <button key={id} onClick={() => setV(id)} className={`rounded-full px-4 py-1.5 text-sm ${v === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>)}</div>
      {v === "chat" ? <TalkTab j={j} earn={earnChat} /> : <JournalTab j={j} earn={earnJournal} />}
    </div>
  );
}
