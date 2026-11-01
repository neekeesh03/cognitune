import { useEffect, useState } from "react";
// Your rabbit: its name and coat. Kept on this device, and on your account so it follows you to a new phone.
export interface Pet { name: string; coat: string }
export const COATS: { id: string; label: string; filter: string }[] = [
  { id: "lavender", label: "Lavender", filter: "none" }, { id: "sage", label: "Sage", filter: "hue-rotate(-115deg) saturate(.8)" },
  { id: "honey", label: "Honey", filter: "hue-rotate(125deg) saturate(1.1)" }, { id: "sky", label: "Sky", filter: "hue-rotate(-55deg)" },
  { id: "rose", label: "Rose", filter: "hue-rotate(75deg) saturate(.9)" }, { id: "mist", label: "Mist", filter: "saturate(.2) brightness(1.08)" },
];
export const DEFAULT_PET: Pet = { name: "Lago", coat: "lavender" };
export const SUGGESTIONS = ["Mochi", "Pip", "Clover", "Biscuit", "Nori", "Juno", "Maple", "Tofu", "Bun", "Poppy", "Olive", "Sprout"];
const K = "lagomo.pet.v1", EV = "lagomo:pet";
export const loadPet = (): Pet | null => { try { const p = JSON.parse(localStorage.getItem(K) || "null"); return p && typeof p.name === "string" ? p : null; } catch { return null; } };
export const savePetLocal = (p: Pet) => { localStorage.setItem(K, JSON.stringify(p)); window.dispatchEvent(new Event(EV)); };
export const petNow = (): Pet => loadPet() ?? DEFAULT_PET;
export const coatFilter = (id?: string) => COATS.find(c => c.id === id)?.filter ?? "none";
// Light check for names. Whole words only, so ordinary names that merely contain a bad string are fine.
const BAD = new Set(["fuck", "fucker", "shit", "bitch", "cunt", "dick", "slut", "whore", "rape", "nazi", "nigger", "nigga", "faggot", "retard"]);
export function nameProblem(raw: string): string | null {
  const n = raw.replace(/\s+/g, " ").trim(); if (n.length < 1) return "Give your rabbit a name, or tap Surprise me.";
  if (n.length > 20) return "Keep it to 20 letters or fewer.";
  if (/@|https?:|www\./i.test(n) || /\d{6,}/.test(n.replace(/[\s-]/g, ""))) return "Pick a name without links, emails or long numbers.";
  const words = n.toLowerCase().replace(/[01345$@!]/g, c => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "$": "s", "@": "a", "!": "i" }[c] as string)).split(/[^a-z]+/).filter(Boolean);
  if (words.some(w => BAD.has(w))) return "Let's pick a kinder name.";
  return null;
}
export function usePet() {
  const [pet, setPet] = useState<Pet>(petNow);
  useEffect(() => { const f = () => setPet(petNow()); window.addEventListener(EV, f); return () => window.removeEventListener(EV, f); }, []);
  return pet;
}
