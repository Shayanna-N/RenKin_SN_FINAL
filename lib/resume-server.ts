import 'server-only'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export const MAX_RESUME_BYTES = 4 * 1024 * 1024
export const MAX_RESUMES_PER_USER = 10

export async function requireSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export function isPdf(bytes: Uint8Array) {
  return bytes.length > 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-'
}

export function cleanName(raw: string) {
  const base = raw.replace(/[\\/\u0000-\u001f]/g, '').trim().slice(0, 120)
  return base || 'Document.pdf'
}
