/** On-device copy of the user's PDFs so they can be opened, shared and downloaded with no connection. */

export interface CachedResume {
  id: string
  userId: string
  name: string
  size: number
  uploadedAt: string
  blob: Blob
}

const DB_NAME = 'renkin-resumes'
const STORE = 'documents'
export const LAST_USER_KEY = 'renkin:resume-user'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => {
      db.close()
      resolve(req.result)
    }
    tx.onerror = tx.onabort = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function getCachedResumes(userId: string): Promise<CachedResume[]> {
  try {
    const all = await run('readonly', (s) => s.getAll() as IDBRequest<CachedResume[]>)
    return all.filter((d) => d.userId === userId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  } catch {
    return []
  }
}

export async function getCachedResume(id: string): Promise<CachedResume | null> {
  try {
    return ((await run('readonly', (s) => s.get(id) as IDBRequest<CachedResume | undefined>)) ?? null) as CachedResume | null
  } catch {
    return null
  }
}

export async function putCachedResume(doc: CachedResume) {
  try {
    await run('readwrite', (s) => s.put(doc))
  } catch {
    // Storage can be full or blocked (private browsing); the cloud copy still works online.
  }
}

export async function removeCachedResume(id: string) {
  try {
    await run('readwrite', (s) => s.delete(id))
  } catch {}
}

export async function clearCachedResumes() {
  try {
    await run('readwrite', (s) => s.clear())
  } catch {}
}
