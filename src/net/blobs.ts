import { getToken } from "@/lib/api";
/** Downloads an attachment (needs your sign-in) and returns a local URL you can show or save. */
export async function fetchFileUrl(id: string): Promise<string | null> {
  const r = await fetch("/api/file?id=" + encodeURIComponent(id), { headers: { Authorization: "Bearer " + getToken() } }); if (!r.ok) return null;
  return URL.createObjectURL(await r.blob());
}
const toB64 = (buf: ArrayBuffer) => { let s = ""; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
export const MAX_B64 = 1_000_000;
/** Photos are shrunk to fit; other files can be up to about 700 KB. */
export async function filePayload(file: File): Promise<{ name: string; type: string; data: string }> {
  if (file.type.startsWith("image/") && !/gif|svg/.test(file.type)) {
    const bmp = await createImageBitmap(file); const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale); c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    for (const q of [0.82, 0.65, 0.5, 0.35]) { const blob: Blob = await new Promise(res => c.toBlob(b => res(b!), "image/jpeg", q)); const data = toB64(await blob.arrayBuffer()); if (data.length <= MAX_B64) return { name: file.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", data }; }
    throw new Error("That photo is too large even after shrinking.");
  }
  const data = toB64(await file.arrayBuffer()); if (data.length > MAX_B64) throw new Error("That file is too big. Files can be up to about 700 KB. Photos are shrunk automatically.");
  return { name: file.name, type: file.type || "application/octet-stream", data };
}
