'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { publishProfile, resolveUpdate } from '@/app/actions/sync'
import { useStore } from '@/lib/store'
import { activeProfile } from '@/lib/profile'
import { useAccount, usePendingUpdates } from '@/lib/use-account'
import { applyRemoteCard, CHANNEL_LABEL, contactFromRemote, toPublishedCard } from '@/lib/remote-contact'
import type { ContactChange, PendingUpdate, Priority } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

function describe(change: ContactChange) {
  switch (change.field) {
    case 'preferredChannel':
      return {
        label: 'Preferred contact',
        from: CHANNEL_LABEL[change.from as Priority] ?? change.from,
        to: CHANNEL_LABEL[change.to as Priority] ?? change.to,
      }
    case 'email':
      return { label: 'Email', from: change.from || 'none', to: change.to || 'removed' }
    case 'phone':
      return { label: 'Phone', from: change.from || 'none', to: change.to || 'removed' }
    case 'links':
      return { label: 'Links', from: 'previous links', to: 'updated links' }
  }
}

/** Agent 1 publishes your card on change; incoming changes from mutual connections land here. */
export function ContactUpdates() {
  const { state, update } = useStore()
  const { data: account } = useAccount()
  const { data: pending = [], mutate } = usePendingUpdates()
  const [open, setOpen] = useState(false)
  const seen = useRef<Set<number>>(new Set())

  const published = useMemo(
    () =>
      JSON.stringify({
        card: toPublishedCard(activeProfile(state), state.settings),
        channel: state.settings.priorities[0] ?? 'email',
      }),
    [state.profiles, state.settings],
  )
  const lastPublished = useRef<string | null>(null)
  const handle = account?.handle

  useEffect(() => {
    if (!handle) return
    if (lastPublished.current === null) {
      lastPublished.current = published
      return
    }
    if (lastPublished.current === published) return
    const timer = setTimeout(async () => {
      const { card, channel } = JSON.parse(published)
      const res = await publishProfile({ handle, card, preferredChannel: channel })
      lastPublished.current = published
      if (res.ok && res.notified > 0) {
        toast.success(`Notified ${res.notified} mutual connection${res.notified === 1 ? '' : 's'} of your update`)
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [handle, published])

  useEffect(() => {
    const fresh = pending.filter((p) => !seen.current.has(p.id))
    fresh.forEach((p) => seen.current.add(p.id))
    if (fresh.length && seen.current.size > fresh.length) {
      toast(`${fresh[0].fromName} updated their contact info`, {
        action: { label: 'Review', onClick: () => setOpen(true) },
      })
    }
  }, [pending])

  async function resolve(item: PendingUpdate, action: 'applied' | 'dismissed') {
    mutate(
      pending.filter((p) => p.id !== item.id),
      { revalidate: false },
    )
    if (action === 'applied') {
      update((s) => {
        const existing = s.contacts.find((c) => c.remoteUserId === item.fromUserId)
        return {
          ...s,
          contacts: existing
            ? s.contacts.map((c) =>
                c.remoteUserId === item.fromUserId ? applyRemoteCard(c, item.card, item.preferredChannel) : c,
              )
            : [contactFromRemote(item.fromUserId, item.card, item.preferredChannel, s.settings.mode), ...s.contacts],
        }
      })
    }
    await resolveUpdate(item.id, action)
    if (action === 'applied') toast.success(`${item.fromName}'s contact updated`)
  }

  if (!account) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="relative size-[3.5rem] rounded-xl" aria-label={`Contact updates, ${pending.length} pending`} />
        }
      >
        <Bell className="size-[2rem]" aria-hidden />
        {pending.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {pending.length}
          </span>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle>Contact updates</SheetTitle>
          <SheetDescription>Mutual connections who changed how they want to be reached.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">{"You're all caught up."}</p>}
          {pending.map((item) => (
            <article key={item.id} className="rounded-xl border p-4">
              <h3 className="font-medium">{item.fromName}</h3>
              <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {item.changes.map((change) => {
                  const d = describe(change)
                  return (
                    <li key={change.field} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-foreground">{d.label}:</span>
                      <span className="line-through opacity-60">{d.from}</span>
                      <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                      <span className="font-medium">{d.to}</span>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => resolve(item, 'applied')}>
                  Update contact
                </Button>
                <Button size="sm" variant="outline" onClick={() => resolve(item, 'dismissed')}>
                  Keep old info
                </Button>
              </div>
            </article>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
