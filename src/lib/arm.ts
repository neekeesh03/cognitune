// A quiet 10% holdout: these people get the plain app without the Director, so we can tell whether it helps.
// The arm comes from the account id, so it never changes. The server uses the same rule when it counts results.
const K = "lagomo.arm";
export const holdout = (id: string): boolean => { let h = 5381; for (let i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0; return h % 10 === 0; };
export const setArm = (id: string) => { try { const v = holdout(id) ? "off" : "on"; if (localStorage.getItem(K) !== v) localStorage.setItem(K, v); } catch { /* ignore */ } };
export const directorOn = (): boolean => { try { return localStorage.getItem(K) !== "off"; } catch { return true; } };
