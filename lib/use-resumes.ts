'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useSession } from '@/lib/auth-client'
import {
  LAST_USER_KEY,
  getCachedResumes,
  putCachedResume,
  removeCachedResume,
} from '@/lib/resume-cache'
import type { ResumeDoc } from '@/lib/resume-actions'

type ServerDoc = Omit<ResumeDoc, 'offline'>

async function loadResumes(userId: string): Promise<ResumeDoc[]> {
  const cached = await getCachedResumes(userId)
  try {
    const res = await fetch('/api/resume')
    if (!res.ok) throw new Error('unavailable')
    const documents = ((await res.json()).documents ?? []) as ServerDoc[]

    const keep = new Set(documents.map((d) => d.id))
    await Promise.all(cached.filter((c) => !keep.has(c.id)).map((c) => removeCachedResume(c.id)))

    const have = new Set(cached.filter((c) => keep.has(c.id)).map((c) => c.id))
    const stored = new Set(have)
    await Promise.all(
      documents
        .filter((d) => !have.has(d.id))
        .map(async (d) => {
          try {
            const file = await fetch(`/api/resume/${d.id}`)
            if (!file.ok) return
            await putCachedResume({ ...d, userId, blob: await file.blob() })
            stored.add(d.id)
          } catch {}
        }),
    )
    return documents.map((d) => ({ ...d, offline: stored.has(d.id) }))
  } catch {
    return cached.map(({ blob: _blob, userId: _userId, ...d }) => ({ ...d, offline: true }))
  }
}

/**
 * The signed-in user's stored PDFs. When the network or session is unavailable the copies saved on this
 * device are used, so the last signed-in user can still share their documents offline.
 */
export function useResumes() {
  const { data: session, isPending } = useSession()
  const [lastUserId, setLastUserId] = useState<string | null>(null)
  const sessionUserId = session?.user?.id ?? null

  useEffect(() => {
    if (sessionUserId) localStorage.setItem(LAST_USER_KEY, sessionUserId)
    else if (!isPending) setLastUserId(localStorage.getItem(LAST_USER_KEY))
  }, [sessionUserId, isPending])

  const [online, setOnline] = useState(true)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const offlineUserId = !sessionUserId && !online ? lastUserId : null
  const userId = sessionUserId ?? offlineUserId
  const swr = useSWR(userId ? ['resumes', userId] : null, () => loadResumes(userId as string), {
    revalidateOnFocus: false,
  })

  const documents = swr.data ?? []
  return {
    ...swr,
    documents,
    userId,
    signedIn: Boolean(userId),
    canShare: Boolean(userId) && documents.length > 0,
  }
}
