import { useEffect } from "react";
import type { Face, Wear } from "@/components/RabbitFace";

const dk = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
/** A tiny rabbit face as the tab icon: happy once you have started, calm until then. Pure SVG, no files. */
const faviconFor = (started: boolean) => {
  const eyes = started ? `<path d="M7 11 q2 -3 4 0 M13 11 q2 -3 4 0" stroke="#17301f" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : `<circle cx="9" cy="11" r="1.5" fill="#17301f"/><circle cx="15" cy="11" r="1.5" fill="#17301f"/>`;
  const mouth = started ? `<path d="M9 14.5 q3 3 6 0" stroke="#17301f" stroke-width="1.5" fill="none" stroke-linecap="round"/>` : `<path d="M10 14.5 q2 1.6 4 0" stroke="#17301f" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><ellipse cx="9" cy="5" rx="2.4" ry="5" fill="#B7A7D9"/><ellipse cx="15" cy="5" rx="2.4" ry="5" fill="#B7A7D9"/><circle cx="12" cy="13" r="8" fill="#B7A7D9"/>${eyes}${mouth}${started ? `<circle cx="19.5" cy="19.5" r="3.2" fill="#447D58"/>` : ""}</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
};

/** Keeps the tab icon, the app badge and the small "widget" snapshot in step with how your day is going. */
export function usePresence(p: { name: string; started: boolean; streak: number; friendsStarted: number; wear: Wear; starts: number; face: Face }) {
  useEffect(() => {
    try {
      const link = (document.querySelector('link[rel="icon"]') as HTMLLinkElement | null) ?? Object.assign(document.head.appendChild(document.createElement("link")), { rel: "icon" });
      link.type = "image/svg+xml"; link.href = faviconFor(p.started);
      const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
      // A quiet dot on the app icon while today is still open. It clears itself the moment you start.
      if (p.started) nav.clearAppBadge?.().catch(() => undefined); else nav.setAppBadge?.(1).catch(() => undefined);
      localStorage.setItem("lagomo.widget", JSON.stringify({ name: p.name, day: dk(), active: p.started, streak: p.streak, friends: p.friendsStarted, wear: p.wear, starts: p.starts }));
    } catch { /* storage or badge not available */ }
  }, [p.name, p.started, p.streak, p.friendsStarted, p.wear, p.starts]);
}
