'use client'

import Link from 'next/link'
import { Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { insights } from '@/lib/agents'

export function InsightsPanel() {
  const { state, log } = useStore()
  const items = insights(state)

  function blockTime() {
    log(5, 'Blocked 4:30 – 5:00 PM on Google Calendar for follow-ups.')
    toast.success('Follow-up block added', { description: 'Today, 4:30 – 5:00 PM' })
  }

  return (
    <section aria-labelledby="insights-heading" className="rounded-2xl border bg-card p-5 md:p-6">
      <h2 id="insights-heading" className="flex items-center gap-2 font-semibold">
        <Lightbulb className="size-4 text-primary" aria-hidden /> Organizer suggestions
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{"You're all caught up."}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {items.map((i) => (
            <li key={i.id} className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3 text-sm">
              <p className="text-pretty">{i.text}</p>
              <div>
                {i.action === 'block-followups' && (
                  <Button size="sm" onClick={blockTime}>
                    Block time
                  </Button>
                )}
                {(i.action === 'confirm-why' || i.action === 'enrich') && (
                  <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/contacts" />}>
                    Review
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
