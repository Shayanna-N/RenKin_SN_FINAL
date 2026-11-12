'use client'

import { useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CloudOff, ChevronDown, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useStore } from '@/lib/store'
import { groupByContext, organize } from '@/lib/agents'
import { cn } from '@/lib/utils'
import { ContactDetail } from './contact-detail'
import { ContactAvatar } from '@/components/companion-avatar'
import type { Contact } from '@/lib/types'

type SortKey = 'recent' | 'az' | 'za' | 'title' | 'company'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'az', label: 'A → Z' },
  { value: 'za', label: 'Z → A' },
  { value: 'title', label: 'Title' },
  { value: 'company', label: 'Company' },
]

const VIEW_BUTTONS: { id: 'context' | 'pending'; label: string; tooltip: string }[] = [
  { id: 'context', label: 'By event', tooltip: 'Group contacts by where or how you met them.' },
  { id: 'pending', label: 'Needs follow-up', tooltip: "Show only contacts you haven't followed up with yet." },
]

function applySort(list: Contact[], sort: SortKey): Contact[] {
  return [...list].sort((a, b) => {
    switch (sort) {
      case 'az': return a.name.localeCompare(b.name)
      case 'za': return b.name.localeCompare(a.name)
      case 'title': return (a.headline ?? '').localeCompare(b.headline ?? '')
      case 'company': return (a.company ?? '').localeCompare(b.company ?? '')
      default: return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
    }
  })
}

export function ContactsView() {
  const { state } = useStore()
  const params = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState('')
  // Independent toggles — both can be active simultaneously
  const [byEvent, setByEvent] = useState(true)
  const [pendingOnly, setPendingOnly] = useState(false)
  const [connectivity, setConnectivity] = useState(false)
  const [sort, setSort] = useState<SortKey>(state.settings.defaultContactSort ?? 'az')
  const openId = params.get('open')
  const open = state.contacts.find((c) => c.id === openId) ?? null

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    // 1. Search filter
    let list = state.contacts.filter((c) =>
      [c.name, c.company, c.headline, c.why.context, ...c.tags].join(' ').toLowerCase().includes(q),
    )
    // 2. "Needs follow-up" filter (view layer — first priority)
    if (pendingOnly) list = list.filter((c) => !c.followedUp)
    // 3. Connectivity weighting
    const organized = organize(list, connectivity ? state.settings.priorities : [])
    // 4. Dropdown sort (applied within groups later, but sort the flat list here too)
    return applySort(organized, sort)
  }, [state.contacts, state.settings.priorities, query, pendingOnly, connectivity, sort])

  // Groups: "By event" groups within the already-sorted list
  const groups = byEvent ? groupByContext(filtered) : [['', filtered] as const]

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 appearance-none rounded-md border bg-card pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Sort contacts"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          </div>
          {/* Search */}
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="contact-search" className="sr-only">Search contacts</label>
            <Input
              id="contact-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people, companies, events"
              className="pl-9"
            />
          </div>
          {/* Connectivity toggle */}
          <div className="group relative flex shrink-0 items-center gap-1.5">
            <span className="select-none text-sm text-muted-foreground">Connectivity:</span>
            <button
              type="button"
              role="switch"
              aria-checked={connectivity}
              onClick={() => setConnectivity((v) => !v)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                connectivity ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200',
                  connectivity ? 'translate-x-5' : 'translate-x-0.5',
                )}
              />
            </button>
            <div className="pointer-events-none absolute bottom-full left-0 mb-2 hidden w-56 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md group-hover:block">
              Sort contacts by how many ways you can reach them, weighted by your channel priorities.
            </div>
          </div>
        </div>

        {/* View toggles — independent, both can be active */}
        <div className="flex gap-1 rounded-lg border bg-card p-1 text-sm">
          {VIEW_BUTTONS.map(({ id, label, tooltip }) => {
            const active = id === 'context' ? byEvent : pendingOnly
            const toggle = id === 'context'
              ? () => setByEvent((v) => !v)
              : () => setPendingOnly((v) => !v)
            return (
              <div key={id} className="group relative">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={toggle}
                  className={cn(
                    'rounded-md px-3 py-1.5 transition-colors',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
                <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden w-48 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md group-hover:block">
                  {tooltip}
                </div>
              </div>
            )
          })}
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
