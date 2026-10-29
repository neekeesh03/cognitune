import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
const K = "cognitune.feedback.v1", KS = "cognitune.share.v1";
export interface Fb { id: string; ts: number; rating: "up" | "down"; reason?: string; flow: string; step: string; prev: string; user: string; reply: string }
const load = (): Fb[] => { try { return JSON.parse(localStorage.getItem(K) || "[]"); } catch { return []; } };
export function useFeedback() {
  const [items, setItems] = useState<Fb[]>(load);
  const [share, setShareState] = useState<boolean | null>(() => { const v = localStorage.getItem(KS); return v == null ? null : v === "1"; });
  useEffect(() => { localStorage.setItem(K, JSON.stringify(items.slice(-500))); }, [items]);
  const setShare = useCallback((v: boolean) => { localStorage.setItem(KS, v ? "1" : "0"); setShareState(v); }, []);
  const upload = useCallback((f: Fb) => api("feedback", { body: { consent: true, rating: f.rating, reason: f.reason, flow: f.flow, step: f.step, prev: f.prev, user: f.user, reply: f.reply } }).catch(() => {}), []);
  const rate = useCallback((f: Fb) => { setItems(a => [...a.filter(x => x.id !== f.id), f]); if (share) upload(f); }, [share, upload]);
  const rated = useCallback((id: string) => items.find(x => x.id === id), [items]);
  const clear = useCallback(() => setItems([]), []);
  return { items, share, setShare, rate, rated, clear, upload };
}
export type FeedbackApi = ReturnType<typeof useFeedback>;
