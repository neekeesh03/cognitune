import { useState } from "react";
import { track } from "@/lib/track";

const K = "lagomo.install.dismissed";
type BIP = Event & { prompt: () => Promise<void> };
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
/** After a first Start: put Lagomo on the home screen. On iPhone this is also what makes alerts work. */
export function InstallNudge({ started }: { started: boolean }) {
  const [gone, setGone] = useState(() => !!localStorage.getItem(K));
  if (!started || gone || standalone()) return null;
  const bip = (window as unknown as { __bip?: BIP }).__bip; const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!bip && !ios) return null;
  const hide = () => { localStorage.setItem(K, "1"); setGone(true); };
  return (
    <div className="glass flex items-center justify-between gap-3 rounded-3xl px-5 py-4">
      <div className="min-w-0"><div className="font-semibold">Keep Lagomo one tap away</div>
        <div className="text-sm text-muted-foreground">{bip ? "Add it to your home screen." : "Tap Share, then Add to Home Screen. Alerts on iPhone need this."}</div></div>
      <div className="flex shrink-0 items-center gap-2">{bip && <button onClick={async () => { track("install_tap"); try { await bip.prompt(); } catch { /* ignore */ } hide(); }} className="rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground">Add</button>}
        <button onClick={hide} className="text-xs text-muted-foreground hover:text-foreground">Not now</button></div>
    </div>);
}
