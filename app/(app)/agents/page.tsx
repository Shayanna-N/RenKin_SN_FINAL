'use client'

import { useState } from 'react'
import { ChevronDown, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { CompanionAvatar } from '@/components/companion-avatar'
import { CompanionMemoryList } from '@/components/companion-memories'
import { Badge } from '@/components/ui/badge'
import { useOnline, useStore } from '@/lib/store'
import { AGENTS, stewardPolicy } from '@/lib/agents'

const COMPANION_AGENT_ID = 6

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.round(mins / 60)
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

export default function AgentsPage() {
  const { state } = useStore()
  const online = useOnline()
  const policy = stewardPolicy(state.settings)
  const offline = !online
  const [memoriesOpen, setMemoriesOpen] = useState(false)

  function status(id: number) {
    if (id === COMPANION_AGENT_ID) return 'Active'
    if (offline && id !== 1) return 'Paused'
    if (id === 2 && !policy.passiveCollection) return 'Limited'
    return 'Active'
  }

  return (
    <>
      <PageHeader
        title="My activity"
        description="Six agents work together after every exchange. The Steward decides what each one is allowed to see."
      />

      {/* Activity log — full width at the top */}
      <section aria-labelledby="log-h" className="mb-6 rounded-2xl border bg-card p-5 md:p-6">
        <h2 id="log-h" className="font-semibold">Activity log</h2>
        <ol className="mt-3 flex max-h-[24rem] flex-col gap-3 overflow-y-auto">
          {state.log.map((l) => (
            <li key={l.id} className="flex gap-3 text-sm">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px]">
                {l.agent}
              </span>
              <span>
                <span className="text-pretty">{l.message}</span>
                <span className="block text-xs text-muted-foreground">{timeAgo(l.at)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Agent cards below */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a) => {
          const s = status(a.id)
          const last = state.log.find((l) => l.agent === a.id)
          if (a.id === COMPANION_AGENT_ID) {
            const companion = state.settings.companion
            const name = companion.name.trim() || 'Companion'
            return (
              <li key={a.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">Agent {a.id}</span>
                  <Badge variant={s === 'Active' ? 'default' : 'outline'}>{s}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <CompanionAvatar
                    companion={companion}
                    fallbackColor={state.settings.brand}
                    mode={state.settings.mode}
                    size="md"
                  />
                  <h2 className="text-lg font-semibold">{name}</h2>
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary">{a.role}</p>
                <p className="text-sm text-pretty text-muted-foreground">{a.description}</p>
                {last && (
                  <p className="border-t pt-2 text-xs text-muted-foreground">
                    <span className="text-foreground">{last.message}</span> · {timeAgo(last.at)}
                  </p>
                )}
                <div className="mt-auto border-t pt-2">
                  <button
                    type="button"
                    onClick={() => setMemoriesOpen((v) => !v)}
                    aria-expanded={memoriesOpen}
                    aria-controls="companion-memories"
                    className="flex w-full items-center justify-between gap-2 text-sm font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Star className="size-4 text-primary" aria-hidden />
                      {name}&apos;s memories ({state.memories.length})
                    </span>
                    <ChevronDown
                      className={cn('size-4 text-muted-foreground transition-transform', memoriesOpen && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                  {memoriesOpen && (
                    <div id="companion-memories" className="mt-2">
                      <CompanionMemoryList />
                    </div>
                  )}
                </div>
              </li>
            )
          }
          return (
            <li key={a.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground">Agent {a.id}</span>
                <Badge variant={s === 'Active' ? 'default' : 'outline'}>{s}</Badge>
              </div>
              <h2 className="text-lg font-semibold">{a.name}</h2>
              <p className="text-xs font-medium uppercase tracking-wider text-primary">{a.role}</p>
              <p className="text-sm text-pretty text-muted-foreground">{a.description}</p>
              {last && (
                <p className="mt-auto border-t pt-2 text-xs text-muted-foreground">
                  <span className="text-foreground">{last.message}</span> · {timeAgo(last.at)}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
