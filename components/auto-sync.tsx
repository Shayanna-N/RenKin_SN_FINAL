'use client'

import { useEffect } from 'react'
import { pushContacts } from '@/app/actions/sync'
import { useSession } from '@/lib/auth-client'
import { useOnline, useStore } from '@/lib/store'

/** Backs up contacts shortly after they change, while signed in, online and auto-sync is on. */
export function AutoSync() {
  const { state, hydrated, update } = useStore()
  const { data: session } = useSession()
  const online = useOnline()
  const enabled = hydrated && Boolean(session?.user) && state.settings.autoSync && online
  const { contacts } = state

  useEffect(() => {
    if (!enabled) return
    const timer = setTimeout(async () => {
      try {
        await pushContacts(contacts)
        update((s) => ({ ...s, settings: { ...s.settings, lastSyncedAt: new Date().toISOString() } }))
      } catch {
        // Retries on the next change or when the connection returns.
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [enabled, contacts, update])

  return null
}
