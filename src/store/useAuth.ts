import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "@/lib/api";
import { installScope } from "@/lib/scope";
import { ensureKeys, forgetKey, hasKey, prepareKeys, type KeyBundle } from "@/lib/e2ee";
import { toast } from "sonner";
import type { AvatarSpec } from "@/engine/avatar";
export interface User { id: string; username: string; name: string; avatar: AvatarSpec }
interface AuthResp { token: string; user: User; keys?: KeyBundle | null }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [locked, setLocked] = useState(false);
  const [needsAvatar, setNeedsAvatar] = useState(false);
  const [loading, setLoading] = useState<boolean>(!!getToken());
  const enter = (u: User) => { installScope(u.id, u.name); setUser(u); hasKey(u.id).then(h => setLocked(!h)).catch(() => setLocked(true)); };
  useEffect(() => {
    if (!getToken()) return;
    api<{ user: User }>("me").then(r => enter(r.user)).catch(() => setToken(null)).finally(() => setLoading(false));
    const out = () => { setUser(null); };
    window.addEventListener("cognitune:signedout", out); return () => window.removeEventListener("cognitune:signedout", out);
  }, []);
  const register = useCallback(async (b: { username: string; password: string; name: string; avatar?: AvatarSpec }) => { const k = await prepareKeys(b.password); const r = await api<AuthResp>("register", { body: { ...b, pk: k.bundle.pk, wk: k.bundle.wk } }); await k.keep(r.user.id); setToken(r.token); setNeedsAvatar(true); enter(r.user); }, []);
  const unlockWith = async (r: AuthResp, password: string) => {
    const k = await ensureKeys(r.user.id, password, r.keys ?? null);
    if (k.upload) await api("keys", { body: k.upload });
    if (k.fresh) toast("Your encryption keys were reset with your password, so older private messages cannot be opened.", { duration: 9000 });
  };
  const login = useCallback(async (b: { username: string; password: string }) => { const r = await api<AuthResp>("login", { body: b }); setToken(r.token); await unlockWith(r, b.password); enter(r.user); }, []);
  /** For someone who is already signed in but has no key on this device yet: ask for the password once. */
  const unlock = useCallback(async (password: string) => {
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user!.username, password }) });
    const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(j.error || "That password is not right.");
    setToken(j.token); await unlockWith(j as AuthResp, password); setLocked(false);
  }, [user]);
  const logout = useCallback(async () => { if (user) await forgetKey(user.id); setToken(null); setUser(null); location.reload(); }, [user]);
  const updateUser = useCallback((u: User) => setUser(u), []);
  const finishOnboarding = useCallback(() => setNeedsAvatar(false), []);
  return { user, loading, locked, needsAvatar, finishOnboarding, register, login, unlock, logout, updateUser };
}
export type AuthApi = ReturnType<typeof useAuth>;
