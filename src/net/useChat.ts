// One conversation with one friend. Messages live on the server, so they arrive even when your friend is away.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { filePayload } from "@/net/blobs";
export interface ChatMsg { id: string; ts: number; from: string; kind: "text" | "file" | "session" | "session_join" | "tune"; text: string; file?: { id: string; name: string; type: string; size: number }; session?: { id: string; dur: number }; pending?: boolean }

export function useChat(friendId: string | null, meId: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]); const [online, setOnline] = useState(false); const [typing, setTyping] = useState(false); const [error, setError] = useState("");
  const last = useRef(0); const fid = useRef(friendId); fid.current = friendId;
  useEffect(() => { setMessages([]); last.current = 0; setError(""); }, [friendId]);
  const pull = useCallback(async () => {
    const id = fid.current; if (!id) return;
    try {
      const r = await api<{ messages: ChatMsg[]; online: boolean; typing: boolean }>(`messages?with=${id}&since=${last.current}`);
      if (id !== fid.current) return; setOnline(r.online); setTyping(r.typing);
      if (r.messages.length) { last.current = Math.max(last.current, ...r.messages.map(m => m.ts)); setMessages(prev => { const ids = new Set(prev.map(m => m.id)); const add = r.messages.filter(m => !ids.has(m.id)); return add.length ? [...prev.filter(m => !m.pending), ...add].sort((a, b) => a.ts - b.ts) : prev; }); await api("read", { body: { with: id } }).catch(() => {}); }
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { if (!friendId) return; pull(); const t = setInterval(() => { if (!document.hidden) pull(); }, 3000); return () => clearInterval(t); }, [friendId, pull]);

  const post = useCallback(async (body: Record<string, unknown>) => {
    const id = fid.current; if (!id) return; setError("");
    try { const r = await api<{ message: ChatMsg }>("messages", { body: { to: id, ...body } }); last.current = Math.max(last.current, r.message.ts); setMessages(p => (p.some(m => m.id === r.message.id) ? p : [...p, r.message])); return r.message; }
    catch (e) { setError((e as Error).message); throw e; }
  }, []);
  const sendText = useCallback((text: string) => post({ kind: "text", text }), [post]);
  const sendFile = useCallback(async (file: File, text = "") => { const f = await filePayload(file); return post({ kind: "file", text, file: f }); }, [post]);
  const sendTune = useCallback((text: string) => post({ kind: "tune", text }), [post]);
  const invite = useCallback((dur: number) => { const sid = crypto.randomUUID(); return post({ kind: "session", text: `Let's focus together for ${dur} minutes.`, session: { id: sid, dur } }); }, [post]);
  const joinSession = useCallback((sid: string, dur: number) => post({ kind: "session_join", text: "Joined the focus session.", session: { id: sid, dur } }), [post]);
  const sendTyping = useCallback(() => { if (fid.current) api("typing", { body: { to: fid.current } }).catch(() => {}); }, []);
  return { messages, online, typing, error, sendText, sendFile, sendTune, invite, joinSession, sendTyping, meId };
}
export type ChatApi = ReturnType<typeof useChat>;
