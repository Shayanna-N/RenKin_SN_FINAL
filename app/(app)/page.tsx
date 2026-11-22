'use client'

import Link from 'next/link'
import { Watch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { CardWidget } from '@/components/today/card-widget'
import { CaptureWidget } from '@/components/today/capture-widget'
import { ContextBanner } from '@/components/today/context-banner'
import { Checklist } from '@/components/today/checklist'
import { InsightsPanel } from '@/components/today/insights-panel'
export default function TodayPage() {
  const { state } = useStore()
  const first = state.profile.name.split(' ')[0]
  const today = state.contacts.filter(
    (c) => new Date(c.capturedAt).toDateString() === new Date().toDateString(),
  ).length

  // false = column-width (default/compact), true = full-width
  const [cardExpanded, setCardExpanded] = useState(false)

  // Fade-out the greeting as the user scrolls down
  const greetingRef = useRef<HTMLDivElement>(null)
  const [opacity, setOpacity] = useState(1)
  useEffect(() => {
    function onScroll() {
      const el = greetingRef.current
      if (!el) return
      const h = el.offsetHeight
      const scrollY = window.scrollY
      setOpacity(Math.max(0, 1 - scrollY / (h * 0.8)))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const greeting = (
    <div
      ref={greetingRef}
      style={{ opacity }}
      className="pointer-events-none mt-3 transition-opacity duration-75"
      aria-hidden={opacity === 0}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
        Hi {first}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {today} new connection{today === 1 ? '' : 's'} today. Your agents are watching for context.
      </p>
    </div>
  )

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
      {cardExpanded ? (
        /* ── Expanded layout: card full-width, widgets in a row below ── */
        <div className="flex flex-col gap-6">
          <CardWidget
            expanded={cardExpanded}
            onToggleExpand={() => setCardExpanded((v) => !v)}
          />
          {greeting}
          <div className="lg:hidden">{watchButton}</div>
          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="flex min-w-0 flex-col gap-6">
              <ContextBanner />
              <Checklist />
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              <div className="hidden lg:block">{watchButton}</div>
              <InsightsPanel />
              <CaptureWidget />
            </div>
          </div>
        </div>
      ) : (
        /* ── Compact layout: card in left column, widgets in right column ── */
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <CardWidget
              expanded={cardExpanded}
              onToggleExpand={() => setCardExpanded((v) => !v)}
            />
            {greeting}
            <div className="lg:hidden">{watchButton}</div>
            <ContextBanner />
            <Checklist />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <div className="hidden lg:block">{watchButton}</div>
            <InsightsPanel />
            <CaptureWidget />
          </div>
        </div>
      )}
    </>
  )
}
