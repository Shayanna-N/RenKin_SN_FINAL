'use client'

import { MapPin, Radar } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { SuggestionsButton } from '@/components/today/suggestions-button'
import { useStore } from '@/lib/store'
import { activeEvent, stewardPolicy, statusLine } from '@/lib/agents'

export function ContextBanner() {
  const { state, update, log } = useStore()
  const event = activeEvent(state.events)
  const policy = stewardPolicy(state.settings)

  function togglePassive(on: boolean) {
    update((s) => ({ ...s, settings: { ...s.settings, passiveCollection: on } }))
    log(1, `Passive data collection ${on ? 'enabled' : 'paused'} by user.`)
  }

  return (
    <section
      aria-labelledby="context-heading"
      className="rounded-2xl border bg-card"
    >
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Context agent
            </p>
            <h2 id="context-heading" className="mt-0.5 text-lg font-semibold text-balance">
              {event ? `You're at ${event.title}` : 'No event detected nearby'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {event
                ? `${event.venue} · matched via ${event.source}${event.ticketed ? ' ticket' : ''}`
                : 'Agents will prompt you when you arrive somewhere relevant.'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Broadcasting: <span className="text-foreground">{statusLine(state)}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <label className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
              <Radar className="size-4 text-primary" aria-hidden />
              Passive collection
              <Switch
                checked={state.settings.passiveCollection}
                onCheckedChange={togglePassive}
                aria-label="Passive data collection"
              />
            </label>
            <SuggestionsButton />
          </div>
          {!state.settings.passiveCollection && (
            <p className="text-xs text-muted-foreground">Turn on Passive collection to get suggestions.</p>
          )}
          {!policy.passiveCollection && state.settings.passiveCollection && (
            <p className="text-xs text-muted-foreground">Paused by Steward in {state.settings.mode} mode</p>
          )}
        </div>
      </div>
    </section>
  )
}
