import { useRef, useState } from "react";
import { FileText, Link2, Paperclip, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeUrl, type Block, type BlockFile } from "@/engine/plan";
import { MAX_FILES, deleteBlockFile, readBlockFile, saveBlockFile } from "@/lib/blockfiles";

export interface Draft { note: string; links: string[]; files: BlockFile[]; remind: number | null }
export const emptyDraft = (): Draft => ({ note: "", links: [], files: [], remind: null });
export const draftOf = (b: Block): Draft => ({ note: b.note ?? "", links: b.links ?? [], files: b.files ?? [], remind: b.remind ?? null });
export const draftToBlock = (d: Draft): Pick<Block, "note" | "links" | "files" | "remind"> => ({ note: d.note.trim() || undefined, links: d.links.length ? d.links : undefined, files: d.files.length ? d.files : undefined, remind: d.remind ?? undefined });
const REMINDERS: [number | null, string][] = [[null, "No reminder"], [0, "At the start"], [5, "5 min before"], [10, "10 min before"], [30, "30 min before"], [60, "1 hour before"]];
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const kb = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

export async function openFile(f: BlockFile) {
  const blob = await readBlockFile(f.id); if (!blob) return false;
  const url = URL.createObjectURL(new Blob([blob], { type: f.type }));
  if (/^(image\/|application\/pdf|text\/)/.test(f.type)) window.open(url, "_blank", "noopener"); else { const a = document.createElement("a"); a.href = url; a.download = f.name; a.click(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000); return true;
}

/** Shows what you planned to bring: note, links and files. */
export function ResourceList({ b }: { b: Pick<Block, "note" | "links" | "files"> }) {
  const [miss, setMiss] = useState("");
  if (!b.note && !b.links?.length && !b.files?.length) return null;
  return (
    <div className="space-y-2 rounded-2xl bg-secondary/50 p-3 text-sm">
      {b.note && <p className="whitespace-pre-wrap" translate="no" dir="auto">{b.note}</p>}
      {b.links?.map(u => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline"><Link2 className="h-4 w-4 shrink-0" /><span className="truncate" translate="no">{host(u)}</span></a>)}
      {b.files?.map(f => <button key={f.id} onClick={async () => { if (!(await openFile(f))) setMiss("That file is not on this device."); }} className="flex w-full items-center gap-2 text-start text-primary hover:underline"><FileText className="h-4 w-4 shrink-0" /><span className="truncate" translate="no">{f.name}</span><span className="shrink-0 text-xs text-muted-foreground">{kb(f.size)}</span></button>)}
      {miss && <p className="text-xs text-destructive" role="alert">{miss}</p>}
    </div>);
}

/** Add or change the note, links, files and reminder of a block. */
export function BringAlongEditor({ d, set, alertsOn }: { d: Draft; set: (d: Draft) => void; alertsOn?: boolean }) {
  const [url, setUrl] = useState(""); const [err, setErr] = useState(""); const fileRef = useRef<HTMLInputElement>(null);
  const addLink = () => { const u = safeUrl(url); if (!url.trim()) return; if (!u) { setErr("That does not look like a web link."); return; } if (d.links.length >= 8) { setErr("Up to 8 links."); return; } if (!d.links.includes(u)) set({ ...d, links: [...d.links, u] }); setUrl(""); setErr(""); };
  const addFiles = async (list: FileList | null) => {
    setErr(""); if (!list) return; let cur = d.files;
    for (const f of Array.from(list)) { if (cur.length >= MAX_FILES) { setErr("Up to 5 files."); break; } try { cur = [...cur, await saveBlockFile(f)]; } catch (e) { setErr((e as Error).message); } }
    set({ ...d, files: cur });
  };
  const dropFile = (f: BlockFile) => { deleteBlockFile(f.id); set({ ...d, files: d.files.filter(x => x.id !== f.id) }); };
  return (
    <div className="space-y-3 rounded-2xl border border-border p-3 text-sm">
      <textarea value={d.note} onChange={e => set({ ...d, note: e.target.value.slice(0, 500) })} rows={2} aria-label="Note for this block" placeholder="e.g. Chapter 3, page 40. The green notebook." className="w-full resize-none rounded-2xl bg-secondary/60 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30" />
      <div className="flex gap-2"><input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} aria-label="Paste a link" placeholder="Paste a link" className="h-10 min-w-0 flex-1 rounded-2xl bg-secondary/60 px-3 outline-none focus:ring-2 focus:ring-primary/30" /><Button type="button" size="sm" variant="outline" className="h-10 rounded-2xl" onClick={addLink}><Plus className="mr-1 h-4 w-4" />Add link</Button></div>
      {d.links.map(u => <div key={u} className="flex items-center gap-2"><Link2 className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate" translate="no">{host(u)}</span><button aria-label="Remove" onClick={() => set({ ...d, links: d.links.filter(x => x !== u) })} className="rounded-full p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>)}
      <div className="flex flex-wrap items-center gap-2"><input ref={fileRef} type="file" multiple hidden onChange={e => { addFiles(e.target.files); e.target.value = ""; }} /><Button type="button" size="sm" variant="outline" className="rounded-2xl" onClick={() => fileRef.current?.click()}><Paperclip className="mr-1 h-4 w-4" />Attach a file</Button><span className="text-xs text-muted-foreground">Files stay on this device only. Up to 5 files, 5 MB each.</span></div>
      {d.files.map(f => <div key={f.id} className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate" translate="no">{f.name}</span><span className="text-xs text-muted-foreground">{kb(f.size)}</span><button aria-label="Remove" onClick={() => dropFile(f)} className="rounded-full p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>)}
      <div className="flex flex-wrap items-center gap-2"><label className="font-medium" htmlFor="bring-remind">Reminder</label>
        <select id="bring-remind" value={d.remind ?? ""} onChange={e => set({ ...d, remind: e.target.value === "" ? null : Number(e.target.value) })} className="h-9 rounded-2xl border border-border bg-secondary/60 px-3">{REMINDERS.map(([v, l]) => <option key={String(v)} value={v ?? ""}>{l}</option>)}</select></div>
      {d.remind != null && alertsOn === false && <p className="text-xs text-muted-foreground">Reminders show up while Lagomo is open. Turn on alerts in Circle to get them when it is closed.</p>}
      {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
    </div>);
}

/** A small "Bring along" toggle used inside the add-block forms. */
export function BringAlongToggle({ d, set }: { d: Draft; set: (d: Draft) => void }) {
  const [open, setOpen] = useState(false);
  const n = (d.note ? 1 : 0) + d.links.length + d.files.length;
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-sm text-primary hover:underline"><Paperclip className="h-4 w-4" />{open ? "Hide" : "Bring along"}{!open && (n > 0 || d.remind != null) && <span className="rounded-full bg-primary/15 px-2 text-xs">{n > 0 ? n : "1"}</span>}</button>
      {open && <div className="mt-2"><BringAlongEditor d={d} set={set} /></div>}
    </div>);
}
