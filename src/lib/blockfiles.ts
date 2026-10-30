/** Attachments for planned blocks. They live in this browser only (IndexedDB), never on our server. */
const DB = "lagomo-block-files", ST = "files";
const open = () => new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const run = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => { const db = await open(); return new Promise<T>((res, rej) => { const tx = db.transaction(ST, mode); const rq = f(tx.objectStore(ST)); tx.oncomplete = () => { res(rq.result); db.close(); }; tx.onerror = () => { rej(tx.error); db.close(); }; }); };
export const MAX_FILE = 5 * 1024 * 1024, MAX_FILES = 5;
/** Phone photos are huge. Shrink them to 1600 px on the long side so they stay small and quick to open. GIFs and SVGs are left alone. */
export async function shrinkPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || /gif|svg/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file); const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)); if (scale === 1 && file.size < 600_000) return file;
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale); c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise(res => c.toBlob(res, "image/jpeg", 0.82)); if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return file; }
}
export async function saveBlockFile(file0: File): Promise<{ id: string; name: string; type: string; size: number }> {
  const file = await shrinkPhoto(file0);
  if (file.size > MAX_FILE) throw new Error("That file is too big. The limit is 5 MB.");
  const id = crypto.randomUUID(); await run("readwrite", s => s.put(file, id)); return { id, name: file.name.slice(0, 80), type: file.type || "application/octet-stream", size: file.size };
}
export const readBlockFile = (id: string) => run<Blob | undefined>("readonly", s => s.get(id));
export const deleteBlockFile = (id: string) => run("readwrite", s => s.delete(id)).catch(() => undefined);
