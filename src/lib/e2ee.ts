// End-to-end encryption for friend chat, using the browser's built-in Web Crypto. No third-party code.
// - Each account has an ECDH P-256 key pair made on the device.
// - The public key is shared. The private key is locked with a key made from your password (PBKDF2) before a
//   copy is stored on the server, so you can read your chats on a new device. The server cannot open it.
// - Two friends combine their keys (ECDH) into a secret only they know. Messages and files use AES-256-GCM.
const enc = new TextEncoder(), dec = new TextDecoder();
const subtle = crypto.subtle;
const ITER = 310_000;
export const b64 = (buf: ArrayBuffer | Uint8Array) => { const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
export const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export interface Wrapped { salt: string; iv: string; ct: string }
export interface KeyBundle { pk: string; wk: Wrapped }

// ---- where the unlocked private key lives on this device (IndexedDB, not extractable) ----
const DB = "cognitune-keys";
const idb = () => new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore("k"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function idbGet<T>(key: string): Promise<T | undefined> { const db = await idb(); return new Promise((res, rej) => { const q = db.transaction("k").objectStore("k").get(key); q.onsuccess = () => res(q.result as T); q.onerror = () => rej(q.error); }); }
async function idbSet(key: string, v: unknown) { const db = await idb(); return new Promise<void>((res, rej) => { const t = db.transaction("k", "readwrite"); t.objectStore("k").put(v, key); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
async function idbDel(key: string) { const db = await idb(); return new Promise<void>((res, rej) => { const t = db.transaction("k", "readwrite"); t.objectStore("k").delete(key); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
interface Stored { priv: CryptoKey; pk: string }
const mem = new Map<string, Stored>();
export async function loadKey(userId: string): Promise<Stored | null> { if (mem.has(userId)) return mem.get(userId)!; const s = await idbGet<Stored>(userId).catch(() => undefined); if (s) mem.set(userId, s); return s ?? null; }
export async function hasKey(userId: string) { return !!(await loadKey(userId)); }
export async function forgetKey(userId: string) { mem.delete(userId); secrets.clear(); await idbDel(userId).catch(() => {}); }

// ---- password lock ----
async function pwKey(password: string, salt: Uint8Array) { const base = await subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]); return subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); }
async function wrapJwk(jwk: JsonWebKey, password: string): Promise<Wrapped> { const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await subtle.encrypt({ name: "AES-GCM", iv }, await pwKey(password, salt), enc.encode(JSON.stringify(jwk))); return { salt: b64(salt), iv: b64(iv), ct: b64(ct) }; }
async function unwrapJwk(w: Wrapped, password: string): Promise<JsonWebKey> { const pt = await subtle.decrypt({ name: "AES-GCM", iv: unb64(w.iv) }, await pwKey(password, unb64(w.salt)), unb64(w.ct)); return JSON.parse(dec.decode(pt)); }
const pubOf = (jwk: JsonWebKey) => JSON.stringify({ kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y });
async function keep(userId: string, jwk: JsonWebKey) { const priv = await subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey", "deriveBits"]); const s = { priv, pk: pubOf(jwk) }; await idbSet(userId, s); mem.set(userId, s); secrets.clear(); return s; }

/** Makes a brand new key pair, locks the private half with the password, keeps it on this device. */
export async function createKeys(userId: string, password: string): Promise<KeyBundle> {
  const kp = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
  const jwk = await subtle.exportKey("jwk", kp.privateKey); const wk = await wrapJwk(jwk, password); await keep(userId, jwk); return { pk: pubOf(jwk), wk };
}
/** For sign-up, before the account has an id: returns what to send, and a function to keep the key once the id is known. */
export async function prepareKeys(password: string) {
  const kp = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
  const jwk = await subtle.exportKey("jwk", kp.privateKey); const wk = await wrapJwk(jwk, password);
  return { bundle: { pk: pubOf(jwk), wk } as KeyBundle, keep: (userId: string) => keep(userId, jwk) };
}
/** After sign-in: unlock the saved key with the password, or make new keys if there are none or they cannot be opened. */
export async function ensureKeys(userId: string, password: string, server: Partial<KeyBundle> | null): Promise<{ upload: KeyBundle | null; fresh: boolean }> {
  if (server?.wk && server.pk) {
    try { const jwk = await unwrapJwk(server.wk, password); if (pubOf(jwk) === server.pk) { await keep(userId, jwk); return { upload: null, fresh: false }; } } catch { /* password was reset: old keys cannot be opened */ }
    return { upload: await createKeys(userId, password), fresh: true };
  }
  return { upload: await createKeys(userId, password), fresh: false };
}
/** Re-locks the private key with a new password (used when the password changes). */
export async function rewrap(server: KeyBundle, oldPw: string, newPw: string): Promise<Wrapped> { return wrapJwk(await unwrapJwk(server.wk, oldPw), newPw); }

// ---- messages and files ----
const secrets = new Map<string, CryptoKey>();
async function secretFor(userId: string, theirPk: string) {
  const mine = await loadKey(userId); if (!mine) throw new Error("locked");
  const id = userId + "|" + theirPk; let k = secrets.get(id); if (k) return k;
  const their = await subtle.importKey("jwk", JSON.parse(theirPk), { name: "ECDH", namedCurve: "P-256" }, false, []);
  k = await subtle.deriveKey({ name: "ECDH", public: their }, mine.priv, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); secrets.set(id, k); return k;
}
/** Encrypts any small JSON value into one string. */
export async function sealJson(userId: string, theirPk: string, value: unknown): Promise<string> { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await subtle.encrypt({ name: "AES-GCM", iv }, await secretFor(userId, theirPk), enc.encode(JSON.stringify(value))); return `1.${b64(iv)}.${b64(ct)}`; }
export async function openJson<T = unknown>(userId: string, theirPk: string, sealed: string): Promise<T> { const [, iv, ct] = sealed.split("."); const pt = await subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await secretFor(userId, theirPk), unb64(ct)); return JSON.parse(dec.decode(pt)); }
export async function sealBytes(userId: string, theirPk: string, bytes: Uint8Array): Promise<{ iv: string; data: string }> { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await subtle.encrypt({ name: "AES-GCM", iv }, await secretFor(userId, theirPk), bytes); return { iv: b64(iv), data: b64(ct) }; }
export async function openBytes(userId: string, theirPk: string, iv: string, ct: ArrayBuffer): Promise<ArrayBuffer> { return subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await secretFor(userId, theirPk), ct); }

/** A short code both friends can compare out loud to be sure no one is in the middle. */
export async function safetyCode(a: string, b: string): Promise<string> { const h = new Uint8Array(await subtle.digest("SHA-256", enc.encode([a, b].sort().join("|")))); const n = Array.from(h.slice(0, 10), x => String(x % 10)).join(""); return `${n.slice(0, 5)} ${n.slice(5)}`; }
