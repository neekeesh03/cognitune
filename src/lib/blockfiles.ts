/** Attachments for planned blocks. They live in this browser only (IndexedDB), never on our server. */
const DB = "lagomo-block-files", ST = "files";
const open = () => new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const run = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => { const db = await open(); return new Promise<T>((res, rej) => { const tx = db.transaction(ST, mode); const rq = f(tx.objectStore(ST)); tx.oncomplete = () => { res(rq.result); db.close(); }; tx.onerror = () => { rej(tx.error); db.close(); }; }); };
export const MAX_FILE = 5 * 1024 * 1024, MAX_FILES = 5;
export async function saveBlockFile(file: File): Promise<{ id: string; name: string; type: string; size: number }> {
  if (file.size > MAX_FILE) throw new Error("That file is too big. The limit is 5 MB.");
  const id = crypto.randomUUID(); await run("readwrite", s => s.put(file, id)); return { id, name: file.name.slice(0, 80), type: file.type || "application/octet-stream", size: file.size };
}
export const readBlockFile = (id: string) => run<Blob | undefined>("readonly", s => s.get(id));
export const deleteBlockFile = (id: string) => run("readwrite", s => s.delete(id)).catch(() => undefined);
