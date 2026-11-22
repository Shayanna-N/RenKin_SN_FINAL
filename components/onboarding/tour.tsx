'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Check, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { createDemoContact, DEMO_CONTACT_ID, TOUR_STEPS } from '@/lib/onboarding'
import { cn } from '@/lib/utils'

interface Box {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 8

function findTarget(name: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)
  for (const el of nodes) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

export function OnboardingTour() {
  const { state, hydrated, setOnboarding, addContact } = useStore()
  const pathname = usePathname()
  const router = useRouter()
  const { status, step } = state.onboarding
  const active = hydrated && status === 'active'
  const def = TOUR_STEPS[step]
  const onRoute = !!def && pathname === def.route

  const [box, setBox] = useState<Box | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const scrolledFor = useRef<number | null>(null)
  const hasDemo = state.contacts.some((c) => c.id === DEMO_CONTACT_ID)

  const finish = useCallback(
    (message?: string) => {
      setOnboarding({ status: 'done', step: 0 })
      if (message) toast.success(message)
    },
    [setOnboarding],
  )

  useEffect(() => {
    if (active && def && !onRoute) router.push(def.route)
  }, [active, def, onRoute, router])

  useEffect(() => {
    scrolledFor.current = null
    setBox(null)
  }, [step, status])

  useEffect(() => {
    if (!active || !onRoute || !def?.target) return
    const name = def.target
    function measure() {
      const el = findTarget(name)
      if (!el) return setBox((prev) => (prev ? null : prev))
      if (scrolledFor.current !== step) {
        scrolledFor.current = step
        const tall = el.getBoundingClientRect().height > window.innerHeight * 0.5
        el.scrollIntoView({ block: tall ? 'start' : 'center', behavior: 'smooth' })
      }
      const r = el.getBoundingClientRect()
      setBox((prev) =>
        prev &&
        Math.abs(prev.top - r.top) < 1 &&
        Math.abs(prev.left - r.left) < 1 &&
        Math.abs(prev.width - r.width) < 1 &&
        Math.abs(prev.height - r.height) < 1
          ? prev
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      )
    }
    measure()
    const id = window.setInterval(measure, 150)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [active, onRoute, def, step])

  useEffect(() => {
    if (active && onRoute) nextRef.current?.focus({ preventScroll: true })
  }, [active, onRoute, step])

  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, finish])

  if (!active || !def || !onRoute) return null

  const isLast = step === TOUR_STEPS.length - 1
  const lowerHalf = box ? box.top + box.height / 2 > window.innerHeight * 0.55 : false
  const centered = !def.target || !box

  function go(delta: number) {
    const next = step + delta
    if (next < 0) return
    setOnboarding({ step: next })
  }

  function addDemo() {
    addContact(createDemoContact())
    toast.success('Demo contact added. You will find it on the Contacts page.')
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-live="polite">
      {box ? (
        <div
          aria-hidden
          className="absolute rounded-2xl ring-2 ring-primary transition-all duration-200"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.6)',
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-black/60" />
      )}

      <section
        role="dialog"
        aria-label={`Tour: ${def.title}`}
        className={cn(
          'pointer-events-auto absolute w-[min(24rem,calc(100vw-2rem))] rounded-2xl border bg-popover p-5 text-popover-foreground shadow-xl',
          centered
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : cn(
                'left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0',
                lowerHalf ? 'top-20 md:top-36' : 'bottom-20 md:bottom-6',
              ),
        )}
      >
        <p className="text-xs font-medium text-muted-foreground">
          Step {step + 1} of {TOUR_STEPS.length}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-balance">{def.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">{def.body}</p>

        {def.demo && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={addDemo}
            disabled={hasDemo}
          >
            {hasDemo ? <Check className="size-4" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
            {hasDemo ? 'Demo contact added' : 'Add a demo contact'}
          </Button>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => finish()}>
            Skip tour
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => go(-1)}>
                Back
              </Button>
            )}
            <Button
              ref={nextRef}
              size="sm"
              onClick={() => (isLast ? finish('Tour complete. Replay it any time from Settings.') : go(1))}
            >
              {isLast ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
