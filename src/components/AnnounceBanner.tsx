import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, getToken } from "@/lib/api";

type Ann = { id: string; text: string; level: "info" | "important" };
// Shows a short message from the Lagomo team, until the person dismisses it.
export function AnnounceBanner() {
  const [a, setA] = useState<Ann | null>(null);
  useEffect(() => {
    if (!getToken()) return;
    const load = () => api<{ announce: Ann | null }>("me").then(r => { const seen = localStorage.getItem("lagomo.announce.seen"); setA(r.announce && r.announce.id !== seen ? r.announce : null); }).catch(() => {});
    load(); const t = setInterval(load, 5 * 60e3); return () => clearInterval(t);
  }, []);
  if (!a) return null;
  return (
    <div role="status" className={`mx-auto mt-3 flex max-w-5xl items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${a.level === "important" ? "border-accent bg-accent/10" : "border-border bg-secondary/60"}`}>
      <div className="flex-1"><span className="font-semibold">From the Lagomo team. </span>{a.text}</div>
      <button aria-label="Dismiss" className="text-muted-foreground hover:text-foreground" onClick={() => { localStorage.setItem("lagomo.announce.seen", a.id); setA(null); }}><X className="h-4 w-4" /></button>
    </div>
  );
}
