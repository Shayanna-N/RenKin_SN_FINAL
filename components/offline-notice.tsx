'use client'

import { useEffect, useRef, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOnline } from '@/lib/store'

/** A bar that fades in and out at the top of the screen whenever the app goes offline or comes back. */
export function OfflineNotice() {
  const online = useOnline()
  const previous = useRef(online)
  const [notice, setNotice] = useState<{ kind: 'offline' | 'online'; key: number } | null>(null)

  useEffect(() => {
    if (previous.current === online) return
    previous.current = online
    const key = Date.now()
    setNotice({ kind: online ? 'online' : 'offline', key })
    const timer = setTimeout(() => setNotice((n) => (n?.key === key ? null : n)), 4000)
    return () => clearTimeout(timer)
  }, [online])

  if (!notice) return null
  const offline = notice.kind === 'offline'

  return (
    <div
      key={notice.key}
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-50 md:top-3 flex justify-center px-4"
    >
      <div
        className={cn(
          'status-bar-fade flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur',
          offline
            ? 'border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300'
            : 'border-primary/30 bg-primary/10 text-primary',
        )}
      >
        {offline ? <WifiOff className="size-4" aria-hidden /> : <Wifi className="size-4" aria-hidden />}
        {offline
          ? "You're offline. Your Companion is saving everything on this device."
          : "You're back online. Saved cards will be enriched now."}
      </div>
    </div>
  )
}
