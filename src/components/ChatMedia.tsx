import { useEffect, useState } from "react";
import { Download, FileText, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchFileUrl } from "@/net/blobs";
import type { ChatMsg } from "@/net/useChat";

const size = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const when = (ts: number) => new Date(ts).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

/** Decrypts one attachment on this device and gives back a temporary local URL. */
function useFileUrl(m: ChatMsg, meId: string, pk: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let u: string | null = null, live = true; if (m.file) fetchFileUrl(m.file, meId, pk).then(x => { if (x && live) { u = x; setUrl(x); } }); return () => { live = false; if (u) URL.revokeObjectURL(u); }; }, [m.file?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return url;
}
function Thumb({ m, meId, pk, onOpen }: { m: ChatMsg; meId: string; pk: string | null; onOpen: (url: string) => void }) {
  const url = useFileUrl(m, meId, pk);
  return <button onClick={() => url && onOpen(url)} aria-label={`Open ${m.file!.name}`} className="aspect-square overflow-hidden rounded-xl bg-secondary/60">{url ? <img src={url} alt={m.file!.name} loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted-foreground">...</span>}</button>;
}
function Row({ m, meId, pk, mine, first, onJump }: { m: ChatMsg; meId: string; pk: string | null; mine: boolean; first: string; onJump: (id: string) => void }) {
  const url = useFileUrl(m, meId, pk);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-secondary/40 p-3 text-sm"><FileText className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1"><div className="truncate font-medium">{m.file!.name}</div><div className="text-xs text-muted-foreground">{size(m.file!.size)} · {mine ? "You" : first} · {when(m.ts)}</div></div>
      <button onClick={() => onJump(m.id)} className="shrink-0 text-xs underline">Show</button>
      {url ? <a href={url} download={m.file!.name} aria-label={`Download ${m.file!.name}`} className="shrink-0 rounded-full p-2 hover:bg-foreground/10"><Download className="h-4 w-4" /></a> : <span className="w-8" />}
    </div>
  );
}

/** Everything sent in this chat, in one place: photos in a grid and other files in a list. */
export function SharedMedia({ open, onClose, msgs, meId, pk, first, onJump }: { open: boolean; onClose: () => void; msgs: ChatMsg[]; meId: string; pk: string | null; first: string; onJump: (id: string) => void }) {
  const files = msgs.filter(m => m.kind === "file" && m.file).slice().reverse();
  const photos = files.filter(m => m.file!.type.startsWith("image/")); const others = files.filter(m => !m.file!.type.startsWith("image/"));
  const [tab, setTab] = useState<"photos" | "files">("photos"); const [big, setBig] = useState<string | null>(null);
  useEffect(() => { if (open && photos.length === 0 && others.length > 0) setTab("files"); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const jump = (id: string) => { onClose(); setTimeout(() => onJump(id), 200); };
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { setBig(null); onClose(); } }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Photos and files</DialogTitle><DialogDescription>Shared in this chat. They are decrypted on your device.</DialogDescription></DialogHeader>
        {big ? (
          <div className="space-y-2"><img src={big} alt="Shared photo" className="max-h-[60vh] w-full rounded-xl object-contain" /><div className="flex gap-2"><button onClick={() => setBig(null)} className="rounded-full border border-border px-4 py-2 text-sm">Back</button><a href={big} download="photo.jpg" className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Download</a></div></div>
        ) : files.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nothing shared yet. Photos and files you send or receive appear here.</p> : <>
          <div className="flex gap-2" role="tablist">{([["photos", `Photos (${photos.length})`, ImageIcon], ["files", `Files (${others.length})`, FileText]] as const).map(([id, label, I]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${tab === id ? "bg-primary text-primary-foreground" : "bg-secondary/60"}`}><I className="h-4 w-4" />{label}</button>)}</div>
          {tab === "photos" ? (photos.length ? <div className="grid grid-cols-3 gap-2">{photos.slice(0, 90).map(m => <Thumb key={m.id} m={m} meId={meId} pk={pk} onOpen={setBig} />)}</div> : <p className="py-6 text-center text-sm text-muted-foreground">No photos yet.</p>)
            : (others.length ? <div className="space-y-2">{others.map(m => <Row key={m.id} m={m} meId={meId} pk={pk} mine={m.from === meId} first={first} onJump={jump} />)}</div> : <p className="py-6 text-center text-sm text-muted-foreground">No other files yet.</p>)}
        </>}
      </DialogContent>
    </Dialog>
  );
}
