// One-time move of this device's saved data to the new app name, so nobody loses their plans, rewards or sign-in.
// Old keys began with the previous app name; they are copied to the new prefix and removed. Safe to run on every load.
const OLD = ["cogni", "tune."].join(""), NEW = "lagomo.";
try {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(OLD)) keys.push(k); }
  for (const k of keys) { const nk = NEW + k.slice(OLD.length); if (localStorage.getItem(nk) === null) localStorage.setItem(nk, localStorage.getItem(k) as string); localStorage.removeItem(k); }
} catch { /* storage unavailable: nothing to move */ }
export {};
