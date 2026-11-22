'use client'

import Link from 'next/link'
import { Watch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { activeProfile } from '@/lib/profile'
import { CardWidget } from '@/components/today/card-widget'
import { CaptureWidget } from '@/components/today/capture-widget'
import { ContextBanner } from '@/components/today/context-banner'
import { Checklist } from '@/components/today/checklist'
import { InsightsPanel } from '@/components/today/insights-panel'
export default function TodayPage() {
  const { state, hydrated } = useStore()
  const first = activeProfile(state).name.split(' ')[0]
  // Seed timestamps and "today" depend on the current time and timezone, which differ
  // between server and client, so the count is only rendered after client hydration.
  const today = hydrated
    ? state.contacts.filter(
        (c) => new Date(c.capturedAt).toDateString() === new Date().toDateString(),
      ).length
    : null

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
        {today === null
          ? 'Your agents are watching for context.'
          : `${today} new connection${today === 1 ? '' : 's'} today. Your agents are watching for context.`}
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
        /* Below lg the column wrappers use `contents` so every widget is a direct grid item
           and `order` can place Capture right under the card and greeting. */
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="order-1 min-w-0 lg:order-none lg:col-span-2">
            <CardWidget
              expanded={cardExpanded}
              onToggleExpand={() => setCardExpanded((v) => !v)}
            />
          </div>
          <div className="order-2 lg:order-none lg:col-span-2">{greeting}</div>
          <div className="order-4 lg:hidden">{watchButton}</div>
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
            <div className="order-5 min-w-0 lg:order-none">
              <ContextBanner />
            </div>
            <div className="order-6 min-w-0 lg:order-none">
              <Checklist />
            </div>
          </div>
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
            <div className="hidden lg:block">{watchButton}</div>
            <div className="order-7 min-w-0 lg:order-none">
              <InsightsPanel />
            </div>
            <div className="order-3 min-w-0 lg:order-none">
              <div data-tour="capture"><CaptureWidget /></div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Compact layout: card in left column, widgets in right column ── */
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
            <div className="order-1 min-w-0 lg:order-none">
              <CardWidget
                expanded={cardExpanded}
                onToggleExpand={() => setCardExpanded((v) => !v)}
              />
            </div>
            <div className="order-2 lg:order-none">{greeting}</div>
            <div className="order-4 lg:hidden">{watchButton}</div>
            <div className="order-5 min-w-0 lg:order-none">
              <ContextBanner />
            </div>
            <div className="order-6 min-w-0 lg:order-none">
              <Checklist />
            </div>
          </div>
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
            <div className="hidden lg:block">{watchButton}</div>
            <div className="order-7 min-w-0 lg:order-none">
              <InsightsPanel />
            </div>
            <div className="order-3 min-w-0 lg:order-none">
              <div data-tour="capture"><CaptureWidget /></div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
