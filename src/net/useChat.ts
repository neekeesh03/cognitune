// One conversation with one friend. Messages live on the server, so they arrive even when your friend is away.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { summary, type PinkyEvt } from "@/engine/pinky";
import { filePayload } from "@/net/blobs";
import { openJson, sealBytes, sealJson, unb64 } from "@/lib/e2ee";
export interface ChatMsg { id: string; ts: number; from: string; kind: "text" | "file" | "session" | "session_join" | "react" | "plan" | "pinky" | "pinky_quiet"; text: string; plan?: SharedPlan; pinky?: PinkyEvt; react?: { to: string; e: string }; file?: { id: string; name: string; type: string; size: number; iv?: string }; session?: { id: string; dur: number; room?: boolean }; pending?: boolean }

export interface SharedPlan { id: string; title: string; day: string; start: number; dur: number; note?: string }
interface Raw { id: string; ts: number; from: string; kind: ChatMsg["kind"]; enc?: string; fileId?: string; text?: string; file?: ChatMsg["file"]; session?: ChatMsg["session"] }
interface Content { pinky?: PinkyEvt; plan?: SharedPlan; react?: { to: string; e: string }; text?: string; session?: ChatMsg["session"]; file?: { name: string; type: string; size: number; iv: string } }
const NEEDS_PK = "Your friend needs to open Lagomo and sign in once to turn on private messaging before you can message them.";

export function useChat(friendId: string | null, meId: string, friendPk: string | null = null) {
  const [messages, setMessages] = useState<ChatMsg[]>([]); const [online, setOnline] = useState(false); const [typing, setTyping] = useState(false); const [error, setError] = useState("");
  const last = useRef(0); const fid = useRef(friendId); fid.current = friendId; const pkRef = useRef(friendPk); pkRef.current = friendPk;
  const decode = useCallback(async (m: Raw): Promise<ChatMsg> => {
    if (!m.enc) return { id: m.id, ts: m.ts, from: m.from, kind: m.kind, text: m.text || "", file: m.file, session: m.session }; // sent before encryption existed
    try { if (!pkRef.current) throw new Error("no key"); const c = await openJson<Content>(meId, pkRef.current, m.enc); return { id: m.id, ts: m.ts, from: m.from, kind: c.react ? "react" : c.plan ? "plan" : c.pinky ? "pinky" : m.kind, text: c.text || "", react: c.react, plan: c.plan, pinky: c.pinky, session: c.session, file: c.file && m.fileId ? { id: m.fileId, ...c.file } : undefined }; }
    catch { return { id: m.id, ts: m.ts, from: m.from, kind: "text", text: "This message cannot be opened on this device." }; }
  }, [meId]);
  useEffect(() => { setMessages([]); last.current = 0; setError(""); }, [friendId, friendPk]);
  const pull = useCallback(async () => {
    const id = fid.current; if (!id) return;
    try {
      const r = await api<{ messages: Raw[]; online: boolean; typing: boolean }>(`messages?with=${id}&since=${last.current}`);
      if (id !== fid.current) return; setOnline(r.online); setTyping(r.typing);
      const got = await Promise.all(r.messages.map(decode));
      if (got.length) { last.current = Math.max(last.current, ...got.map(m => m.ts)); setMessages(prev => { const ids = new Set(prev.map(m => m.id)); const add = got.filter(m => !ids.has(m.id)); return add.length ? [...prev.filter(m => !m.pending), ...add].sort((a, b) => a.ts - b.ts) : prev; }); await api("read", { body: { with: id } }).catch(() => {}); }
    } catch (e) { setError((e as Error).message); }
  }, [decode]);
  useEffect(() => { if (!friendId) return; pull(); const t = setInterval(() => { if (!document.hidden) pull(); }, 3000); return () => clearInterval(t); }, [friendId, pull]);

  const post = useCallback(async (kind: ChatMsg["kind"], content: Content, file?: { data: string }, short = false) => {
    const id = fid.current; if (!id) return; setError("");
    try {
      if (!pkRef.current) throw new Error(NEEDS_PK);
      const enc = await sealJson(meId, pkRef.current, content);
      const r = await api<{ message: Raw }>("messages", { body: { to: id, kind, enc, ...(file ? { file } : {}), ...(short ? { short: true } : {}) } });
      const m = await decode(r.message); last.current = Math.max(last.current, m.ts); setMessages(p => (p.some(x => x.id === m.id) ? p : [...p, m])); return m;
    } catch (e) { setError((e as Error).message); throw e; }
  }, [meId, decode]);
  const sendText = useCallback((text: string) => post("text", { text }), [post]);
  const react = useCallback((to: string, e: string) => post("react", { react: { to, e: e.slice(0, 16) } }), [post]);
  const sendFile = useCallback(async (file: File, text = "") => {
    if (!pkRef.current) throw new Error(NEEDS_PK);
    const f = await filePayload(file); const bytes = unb64(f.data); const sealed = await sealBytes(meId, pkRef.current, bytes);
    return post("file", { text, file: { name: f.name, type: f.type, size: bytes.length, iv: sealed.iv } }, { data: sealed.data });
  }, [post, meId]);
  const invite = useCallback((dur: number) => { const sid = crypto.randomUUID(); return post("session", { text: `Let's focus together for ${dur} minutes.`, session: { id: sid, dur } }); }, [post]);
  const joinSession = useCallback((sid: string, dur: number, room?: boolean) => post("session_join", { text: "Joined the focus session.", session: { id: sid, dur, ...(room ? { room: true } : {}) } }), [post]);
  const sendPlan = useCallback((plan: SharedPlan) => post("plan", { text: `Planned: ${plan.title}`, plan }), [post]);
  /** Pinky moves travel as encrypted chat messages. Quiet ones (roll over, let go) never send a push alert. */
  const sendPinky = useCallback((pinky: PinkyEvt, quiet = false) => post(quiet ? "pinky_quiet" : "pinky", { text: summary(pinky), pinky }), [post]);
  /** A photo receipt: the picture is encrypted on this device and deleted from the server after 48 hours. */
  const sendPinkyPhoto = useCallback(async (blob: Blob, pinky: PinkyEvt) => {
    if (!pkRef.current) throw new Error(NEEDS_PK);
    const f = await filePayload(new File([blob], "pinky.jpg", { type: "image/jpeg" })); const bytes = unb64(f.data); const sealed = await sealBytes(meId, pkRef.current, bytes);
    return post("file", { text: summary(pinky), pinky, file: { name: "pinky.jpg", type: f.type, size: bytes.length, iv: sealed.iv } }, { data: sealed.data }, true);
  }, [post, meId]);
  const sendTyping = useCallback(() => { if (fid.current) api("typing", { body: { to: fid.current } }).catch(() => {}); }, []);
  return { messages, online, typing, error, sendText, react, sendFile, invite, joinSession, sendPlan, sendPinky, sendPinkyPhoto, sendTyping, meId };
}
export type ChatApi = ReturnType<typeof useChat>;
