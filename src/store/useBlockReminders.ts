import { useEffect, useRef } from "react";
import type { PlanApi } from "@/store/usePlan";
import { blockStartMs, hasResources } from "@/engine/plan";
import { notify } from "@/lib/notify";
import { api } from "@/lib/api";
import { alertState } from "@/lib/push";

/** Fires block reminders while the app is open, and tells the server when to send a push alert if it is closed. The server never sees the title, note, links or files. */
export function useBlockReminders(plan: PlanApi) {
  const ref = useRef(plan); ref.current = plan;
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      for (const b of ref.current.blocks) {
        if (b.remind == null || b.done || b.notified) continue;
        const start = blockStartMs(b), fire = start - b.remind * 60000;
        if (now >= fire && now < start + b.dur * 60000) {
          ref.current.patchBlock(b.id, { notified: true });
          notify({ id: "block:" + b.id, tag: "block:" + b.id, windowMs: 3600000, title: b.title, body: (now >= start ? "Starting now." : "Starting soon.") + (hasResources(b) ? " Your resources are ready." : "") });
        }
      }
    };
    tick(); const t = setInterval(tick, 20000); document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, []);
  // Tell the server only when to nudge. Skipped if alerts are off on this device.
  const sig = JSON.stringify(plan.blocks.filter(b => b.remind != null && !b.done && !b.notified).map(b => [b.id, blockStartMs(b) - (b.remind ?? 0) * 60000]).filter(x => (x[1] as number) > Date.now() - 600000));
  useEffect(() => {
    const t = setTimeout(async () => { try { if ((await alertState()) !== "on") return; await api("block-remind", { body: { items: (JSON.parse(sig) as [string, number][]).slice(0, 50).map(([id, at]) => ({ id, at })) } }); } catch { /* offline */ } }, 2000);
    return () => clearTimeout(t);
  }, [sig]);
}
