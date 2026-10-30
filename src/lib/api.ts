const TK = "lagomo.token";
export const getToken = () => localStorage.getItem(TK);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK));
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const t = getToken();
  let r: Response;
  try { r = await fetch("/api/" + path, { method: opts.method ?? (opts.body ? "POST" : "GET"), headers: { "Content-Type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined }); }
  catch { throw new ApiError(0, "You seem to be offline. Check your connection and try again."); }
  const ct = r.headers.get("content-type") || "";
  const j = ct.includes("json") ? await r.json() : null;
  if (!r.ok) { if (r.status === 401 && t) { setToken(null); window.dispatchEvent(new Event("lagomo:signedout")); } throw new ApiError(r.status, j?.error || "Something went wrong. Please try again."); }
  return j as T;
}
