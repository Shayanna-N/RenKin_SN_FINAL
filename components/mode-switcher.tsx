'use client'

import { Briefcase, CalendarDays, Coffee, CloudOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { MODE_META } from '@/lib/agents'
import type { Mode } from '@/lib/types'

export const MODE_ICONS: Record<Mode, typeof Coffee> = {
  casual: Coffee,
  business: Briefcase,
  event: CalendarDays,
  offline: CloudOff,
}

export function ModeSwitcher({ className }: { className?: string }) {
  const { state, setMode } = useStore()
  const current = state.settings.mode

  return (
    <div
      role="radiogroup"
      aria-label="Networking mode"
      className={cn('flex items-center gap-0.5 rounded-full border bg-card p-0.5', className)}
    >
      {(Object.keys(MODE_META) as Mode[]).map((mode) => {
        const Icon = MODE_ICONS[mode]
        const active = mode === current
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            title={MODE_META[mode].blurb}
            onClick={() => setMode(mode)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
              active && 'bg-primary text-primary-foreground hover:text-primary-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span className={cn(!active && 'sr-only sm:not-sr-only')}>{MODE_META[mode].label}</span>
          </button>
        )
      })}
    </div>
  )
}
