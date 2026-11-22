'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { pullContacts, pushContacts } from '@/app/actions/sync'
import { useStore } from '@/lib/store'

/** Two-way sync: uploads this device's contacts, then adds any the account has that this device lacks. */
export function useSyncNow() {
  const { state, update } = useStore()
  const [syncing, setSyncing] = useState(false)
  const contactsRef = useRef(state.contacts)

  useEffect(() => {
    contactsRef.current = state.contacts
  }, [state.contacts])

  const run = useCallback(async () => {
    setSyncing(true)
    try {
      const { synced } = await pushContacts(contactsRef.current.filter((c) => !c.demo))
      const remote = await pullContacts()
      const have = new Set(contactsRef.current.map((c) => c.id))
      const fresh = remote.filter((c) => !have.has(c.id))
      update((s) => {
        const known = new Set(s.contacts.map((c) => c.id))
        return {
          ...s,
          contacts: [...s.contacts, ...fresh.filter((c) => !known.has(c.id))],
          settings: { ...s.settings, lastSyncedAt: new Date().toISOString() },
        }
      })
      return { pushed: synced, added: fresh.length }
    } finally {
      setSyncing(false)
    }
  }, [update])

  return { run, syncing }
}
