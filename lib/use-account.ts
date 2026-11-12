'use client'

import useSWR from 'swr'
import { getAccount, listPendingUpdates } from '@/app/actions/sync'
import { useSession } from '@/lib/auth-client'

export function useAccount() {
  const { data: session, isPending } = useSession()
  const swr = useSWR(session?.user ? ['account', session.user.id] : null, () => getAccount())
  return { ...swr, session, sessionPending: isPending }
}

export function usePendingUpdates() {
  const { data: session } = useSession()
  return useSWR(session?.user ? ['pending', session.user.id] : null, () => listPendingUpdates(), {
    refreshInterval: 15000,
  })
}
