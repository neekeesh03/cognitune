import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "@/lib/api";
import { installScope } from "@/lib/scope";
import type { AvatarSpec } from "@/engine/avatar";
export interface User { id: string; username: string; name: string; avatar: AvatarSpec }
interface AuthResp { token: string; user: User }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getToken());
  const enter = (u: User) => { installScope(u.id, u.name); setUser(u); };
  useEffect(() => {
    if (!getToken()) return;
    api<{ user: User }>("me").then(r => enter(r.user)).catch(() => setToken(null)).finally(() => setLoading(false));
    const out = () => { setUser(null); };
    window.addEventListener("cognitune:signedout", out); return () => window.removeEventListener("cognitune:signedout", out);
  }, []);
  const register = useCallback(async (b: { username: string; password: string; name: string; avatar: AvatarSpec }) => { const r = await api<AuthResp>("register", { body: b }); setToken(r.token); enter(r.user); }, []);
  const login = useCallback(async (b: { username: string; password: string }) => { const r = await api<AuthResp>("login", { body: b }); setToken(r.token); enter(r.user); }, []);
  const logout = useCallback(() => { setToken(null); setUser(null); location.reload(); }, []);
  const updateUser = useCallback((u: User) => setUser(u), []);
  return { user, loading, register, login, logout, updateUser };
}
export type AuthApi = ReturnType<typeof useAuth>;
