'use client'

import { HoverHint } from '@/components/ui/hover-hint'
import Link from 'next/link'
import { Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { insights } from '@/lib/agents'

export function InsightsPanel() {
  const { state, log, hydrated } = useStore()
  // Seed timestamps are derived from the current time, so the server and client disagree on
  // which contacts count as "today". Only compute suggestions once the client store is ready.
  const items = hydrated ? insights(state) : null

  function blockTime() {
    log(5, 'Blocked 4:30 – 5:00 PM on Google Calendar for follow-ups.')
    toast.success('Follow-up block added', { description: 'Today, 4:30 – 5:00 PM' })
  }

  return (
    <section aria-labelledby="insights-heading" className="rounded-2xl border bg-card p-5 text-center md:p-6">
      <h2 id="insights-heading" className="flex items-center justify-center gap-2 font-semibold">
        <Lightbulb className="size-4 text-primary" aria-hidden /> Organizer suggestions
      </h2>
      {items === null ? (
        <div className="mt-3 flex flex-col gap-3" aria-busy="true">
          <span className="sr-only">Loading suggestions</span>
          <div className="h-16 animate-pulse rounded-xl bg-muted/60" />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{"You're all caught up."}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {items.map((i) => (
            <li key={i.id} className="flex flex-col items-center gap-2 rounded-xl bg-muted/60 p-3 text-sm">
              <p className="text-pretty">{i.text}</p>
              <div>
                {i.action === 'block-followups' && (
                  <Button size="sm" onClick={blockTime}>
                    Block time
                  </Button>
                )}
                {(i.action === 'confirm-why' || i.action === 'enrich') && (
                  <HoverHint hint="Opens Contacts so you can review this suggestion." align="end">
                    <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/contacts" />}>
                      Review
                    </Button>
                  </HoverHint>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
