'use client'

import { useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CloudOff, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useStore } from '@/lib/store'
import { groupByContext, organize } from '@/lib/agents'
import { cn } from '@/lib/utils'
import { ContactDetail } from './contact-detail'
import { ContactAvatar } from '@/components/companion-avatar'

type View = 'context' | 'priority' | 'pending'

export function ContactsView() {
  const { state } = useStore()
  const params = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('context')
  const openId = params.get('open')
  const open = state.contacts.find((c) => c.id === openId) ?? null

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const list = state.contacts.filter((c) =>
      [c.name, c.company, c.headline, c.why.context, ...c.tags].join(' ').toLowerCase().includes(q),
    )
    return organize(
      view === 'pending' ? list.filter((c) => !c.followedUp) : list,
      state.settings.priorities,
    )
  }, [state.contacts, state.settings.priorities, query, view])

  const groups = view === 'context' ? groupByContext(filtered) : [['', filtered] as const]

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <label htmlFor="contact-search" className="sr-only">
            Search contacts
          </label>
          <Input
            id="contact-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, companies, events"
            className="pl-9"
          />
        </div>
        <div role="radiogroup" aria-label="Organize by" className="flex gap-1 rounded-lg border bg-card p-1 text-sm">
          {(
            [
              ['context', 'By event'],
              ['priority', 'By priority'],
              ['pending', 'Needs follow-up'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={view === id}
              onClick={() => setView(id)}
              className={cn('rounded-md px-3 py-1.5', view === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && <p className="py-12 text-center text-muted-foreground">No contacts match.</p>}

      <div className="flex flex-col gap-8">
        {groups.map(([group, list]) => (
          <section key={group || 'all'} aria-label={group || 'Contacts'}>
            {group && <h2 className="mb-2 text-sm font-medium text-muted-foreground">{group}</h2>}
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => router.replace(`/contacts?open=${c.id}`, { scroll: false })}
                    className="flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/40"
                  >
                    <ContactAvatar name={c.name} avatar={c.avatar} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {[c.headline, c.company].filter(Boolean).join(' · ')}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1">
                        {!c.why.confirmed && <Badge variant="outline">Confirm context</Badge>}
                        {c.pendingEnrichment && (
                          <Badge variant="secondary">
                            <CloudOff className="size-3" aria-hidden /> Offline
                          </Badge>
                        )}
                        {c.followedUp ? <Badge variant="secondary">Followed up</Badge> : <Badge>Follow up</Badge>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <ContactDetail contact={open} onClose={() => router.replace('/contacts', { scroll: false })} />
    </>
  )
}
