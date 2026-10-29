// Keeps each account's personal data (journal, plans, rewards...) separate on a shared browser.
const SHARED = new Set(["cognitune.token", "cognitune.theme", "cognitune.migrated"]);
const LEGACY = ["cognitune.history.v2", "cognitune.entries.v1", "cognitune.settings.v1", "cognitune.game.v1", "cognitune.tasks.v1", "cognitune.blocks.v1"];
let uid: string | null = null; let patched = false;
const orig = { get: Storage.prototype.getItem, set: Storage.prototype.setItem, del: Storage.prototype.removeItem };
const scoped = (k: string) => (uid && k.startsWith("cognitune.") && !SHARED.has(k) ? `${k}@${uid}` : k);
function patch() {
  if (patched) return; patched = true;
  Storage.prototype.getItem = function (k: string) { return orig.get.call(this, this === localStorage ? scoped(k) : k); };
  Storage.prototype.setItem = function (k: string, v: string) { return orig.set.call(this, this === localStorage ? scoped(k) : k, v); };
  Storage.prototype.removeItem = function (k: string) { return orig.del.call(this, this === localStorage ? scoped(k) : k); };
}
/** Call once after sign-in, before any store loads. The first account on a device inherits data saved before accounts existed. */
export function installScope(userId: string, displayName: string) {
  patch(); uid = userId;
  if (!orig.get.call(localStorage, "cognitune.migrated")) {
    LEGACY.forEach(k => { const v = orig.get.call(localStorage, k); if (v && !orig.get.call(localStorage, `${k}@${userId}`)) orig.set.call(localStorage, `${k}@${userId}`, v); });
    orig.set.call(localStorage, "cognitune.migrated", userId);
  }
  const sk = "cognitune.settings.v1";
  if (!localStorage.getItem(sk)) localStorage.setItem(sk, JSON.stringify({ name: displayName, resolved: [], shuffle: {} }));
}
export function clearScope() { uid = null; }
