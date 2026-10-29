// Cute generated creatures. Every combination is unique per account (the server enforces it).
export interface AvatarSpec { s: number; p: number; e: number; m: number; a: number; c: number }
export const AV_RANGE = { s: 10, p: 8, e: 6, m: 5, a: 8, c: 4 } as const;
export const SPECIES = ["Kitty", "Bunny", "Bear", "Froggy", "Owlet", "Foxy", "Ghosty", "Shroom", "Droplet", "Cloudy"];
export const PALETTES = [
  { body: "#C7D9CC", inner: "#F2F7F3", cheek: "#DB832A", bg: "#DEEDE0" }, { body: "#689F7A", inner: "#DEEDE0", cheek: "#F0D397", bg: "#F2F7F3" },
  { body: "#E8B761", inner: "#FDF8ED", cheek: "#C1611E", bg: "#F8EACD" }, { body: "#B7A7D9", inner: "#F2F2F2", cheek: "#E29F3D", bg: "#ECE7F6" },
  { body: "#C1611E", inner: "#F8EACD", cheek: "#F0D397", bg: "#F0D397" }, { body: "#447D58", inner: "#C0DAC6", cheek: "#E8B761", bg: "#C7D9CC" },
  { body: "#8d8b88", inner: "#F2F2F2", cheek: "#E29F3D", bg: "#F2F2F2" }, { body: "#F8EACD", inner: "#FFFFFF", cheek: "#DB832A", bg: "#DEEDE0" },
];
export const randomAvatar = (): AvatarSpec => ({ s: r(10), p: r(8), e: r(6), m: r(5), a: r(8), c: r(4) });
function r(n: number) { return Math.floor(Math.random() * n); }
export const avatarKey = (a: AvatarSpec) => `${a.s}-${a.p}-${a.e}-${a.m}-${a.a}-${a.c}`;
/** deterministic fallback from a string, for people who have not set one */
export function avatarFromSeed(seed: string): AvatarSpec { let h = 7; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const g = (n: number) => { h = (h * 1103515245 + 12345) >>> 0; return (h >>> 8) % n; }; return { s: g(10), p: g(8), e: g(6), m: g(5), a: g(8), c: g(4) }; }
