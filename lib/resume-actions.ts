import {
  getCachedResume,
  putCachedResume,
  removeCachedResume,
  type CachedResume,
} from '@/lib/resume-cache'

export interface ResumeDoc {
  id: string
  name: string
  size: number
  uploadedAt: string
  /** True once the PDF is stored on this device and works without a connection. */
  offline: boolean
}

export const MAX_BYTES = 4 * 1024 * 1024

export async function uploadResume(file: File, userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { ok: false, error: 'Only PDF files are supported' }
  }
  if (file.size > MAX_BYTES) return { ok: false, error: 'PDFs must be under 4 MB' }

  const body = new FormData()
  body.append('file', file)
  try {
    const res = await fetch('/api/resume', { method: 'POST', body })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: json.error ?? 'Upload failed' }
    const doc = json.document as Omit<ResumeDoc, 'offline'>
    await putCachedResume({ ...doc, userId, blob: new Blob([await file.arrayBuffer()], { type: 'application/pdf' }) })
    return { ok: true }
  } catch {
    return { ok: false, error: 'You are offline. Connect to the internet to upload a new document.' }
  }
}

export async function deleteResume(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/resume/${id}`, { method: 'DELETE' })
    if (!res.ok) return false
    await removeCachedResume(id)
    return true
  } catch {
    return false
  }
}

/** The PDF bytes, from this device when possible so it works offline. */
export async function getResumeBlob(doc: Pick<ResumeDoc, 'id' | 'name' | 'size' | 'uploadedAt'>, userId: string) {
  const cached = await getCachedResume(doc.id)
  if (cached) return cached.blob
  const res = await fetch(`/api/resume/${doc.id}`)
  if (!res.ok) throw new Error('Could not load document')
  const blob = await res.blob()
  const entry: CachedResume = { ...doc, userId, blob }
  await putCachedResume(entry)
  return blob
}

function pdfFileName(name: string) {
  return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = pdfFileName(name)
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadResume(doc: ResumeDoc, userId: string) {
  saveBlob(await getResumeBlob(doc, userId), doc.name)
}

/** Opens the system share sheet with the PDF attached, or downloads it where that is not supported. */
export async function shareResume(doc: ResumeDoc, userId: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await getResumeBlob(doc, userId)
  const file = new File([blob], pdfFileName(doc.name), { type: 'application/pdf' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: doc.name })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  saveBlob(blob, doc.name)
  return 'downloaded'
}

export function formatUploaded(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

export function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
