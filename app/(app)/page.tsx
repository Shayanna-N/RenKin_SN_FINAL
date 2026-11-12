'use client'

import Link from 'next/link'
import { Watch } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/page-header'
import { CardWidget } from '@/components/today/card-widget'
import { ContextBanner } from '@/components/today/context-banner'
import { Checklist } from '@/components/today/checklist'
import { InsightsPanel } from '@/components/today/insights-panel'
import { CompanionChat } from '@/components/today/companion-chat'

export default function TodayPage() {
  const { state } = useStore()
  const first = state.profile.name.split(' ')[0]
  const today = state.contacts.filter(
    (c) => new Date(c.capturedAt).toDateString() === new Date().toDateString(),
  ).length

  const watchButton = (
    <Link
      href="/watch"
      aria-label="Launch watch companion"
      className="flex items-center justify-center gap-3 rounded-xl border bg-card px-8 py-4 text-xl font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Watch className="size-6" aria-hidden />
      <span>Smart Watch</span>
    </Link>
  )

  return (
    <>
      <PageHeader
        title={`Hi ${first}`}
        description={`${today} new connection${today === 1 ? '' : 's'} today. Your agents are watching for context.`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <CardWidget />
          {/* Watch button: visible on mobile only, sits below the card widget */}
          <div className="lg:hidden">{watchButton}</div>
          <ContextBanner />
          <Checklist />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          {/* Watch button: visible on desktop only, sits above the organizer widget */}
          <div className="hidden lg:block">{watchButton}</div>
          <InsightsPanel />
          <CompanionChat />
        </div>
      </div>
    </>
  )
}
