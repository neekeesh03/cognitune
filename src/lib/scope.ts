// Keeps each account's personal data (journal, plans, rewards...) separate on a shared browser.
const SHARED = new Set(["lagomo.token", "lagomo.theme", "lagomo.migrated"]);
const LEGACY = ["lagomo.history.v2", "lagomo.entries.v1", "lagomo.settings.v1", "lagomo.game.v1", "lagomo.tasks.v1", "lagomo.blocks.v1"];
let uid: string | null = null; let patched = false;
const orig = { get: Storage.prototype.getItem, set: Storage.prototype.setItem, del: Storage.prototype.removeItem };
const scoped = (k: string) => (uid && k.startsWith("lagomo.") && !SHARED.has(k) ? `${k}@${uid}` : k);
function patch() {
  if (patched) return; patched = true;
  Storage.prototype.getItem = function (k: string) { return orig.get.call(this, this === localStorage ? scoped(k) : k); };
  Storage.prototype.setItem = function (k: string, v: string) { return orig.set.call(this, this === localStorage ? scoped(k) : k, v); };
  Storage.prototype.removeItem = function (k: string) { return orig.del.call(this, this === localStorage ? scoped(k) : k); };
}
/** Call once after sign-in, before any store loads. The first account on a device inherits data saved before accounts existed. */
export function installScope(userId: string, displayName: string) {
  patch(); uid = userId;
  if (!orig.get.call(localStorage, "lagomo.migrated")) {
    LEGACY.forEach(k => { const v = orig.get.call(localStorage, k); if (v && !orig.get.call(localStorage, `${k}@${userId}`)) orig.set.call(localStorage, `${k}@${userId}`, v); });
    orig.set.call(localStorage, "lagomo.migrated", userId);
  }
  const sk = "lagomo.settings.v1";
  if (!localStorage.getItem(sk)) localStorage.setItem(sk, JSON.stringify({ name: displayName, resolved: [], shuffle: {} }));
}
export function clearScope() { uid = null; }
