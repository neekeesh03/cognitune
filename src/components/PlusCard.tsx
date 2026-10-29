import { useState } from "react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";

// Price test. Nothing is for sale yet: this only records which monthly price feels fair.
export function PlusCard() {
  const [open, setOpen] = useState(false); const [done, setDone] = useState(false);
  const pick = (price: string) => { track("plus_price", { price }); setDone(true); };
  return (
    <div className="glass rounded-3xl p-5 text-sm">
      <div className="mb-1 text-lg font-semibold">Cognitune Plus (not ready yet)</div>
      <p className="text-muted-foreground">Cognitune stays free for starting, Tune and your circle. We may add a paid Plus later for extras like bigger groups, themes and backups. No card, no tricks.</p>
      {done ? <p className="mt-3 font-medium text-primary">Thank you. That helps us pick a fair price.</p> : !open ? <Button size="sm" variant="outline" className="mt-3 rounded-full" onClick={() => { setOpen(true); track("plus_open"); }}>Tell us what feels fair</Button> : (
        <div className="mt-3 space-y-2"><div>What would feel fair per month, if it had things you wanted?</div>
          <div className="flex flex-wrap gap-2">{[["3", "$3"], ["5", "$5"], ["8", "$8"], ["none", "I would not pay"]].map(([k, l]) => <Button key={k} size="sm" variant="outline" className="rounded-full" onClick={() => pick(k)}>{l}</Button>)}</div></div>)}
    </div>);
}
