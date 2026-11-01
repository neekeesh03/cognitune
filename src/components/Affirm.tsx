import { useState } from "react";
import { VALUES, loadValue, saveValue } from "@/engine/director";

/** One tap on what matters to you, then a kind line. Shown only when the worry is "I will do it badly". */
export function Affirm() {
  const [v, setV] = useState<string | null>(loadValue); const [edit, setEdit] = useState(false);
  if (v && !edit) return (
    <div className="mt-3 rounded-2xl bg-secondary/50 p-3 text-sm">
      <div>You care about <b>{v.toLowerCase()}</b>. A rough first draft still moves that forward.</div>
      <button onClick={() => setEdit(true)} className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:underline">Change what matters</button>
    </div>);
  return (
    <div className="mt-3 rounded-2xl bg-secondary/50 p-3 text-sm">
      <div className="mb-2">What matters most to you? Pick one.</div>
      <div className="flex flex-wrap gap-2">{VALUES.map(x => <button key={x} onClick={() => { saveValue(x); setV(x); setEdit(false); }} className={`rounded-full border px-3 py-1.5 ${v === x ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary"}`}>{x}</button>)}</div>
    </div>);
}
