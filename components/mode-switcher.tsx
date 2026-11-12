'use client'

import { Briefcase, CalendarDays, Coffee } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { MODE_META } from '@/lib/agents'
import type { Mode } from '@/lib/types'

export const MODE_ICONS: Record<Mode, typeof Coffee> = {
  everyday: Coffee,
  event: CalendarDays,
  custom: Briefcase,
}

export function ModeSwitcher({ className }: { className?: string }) {
  const { state, setMode } = useStore()
  const current = state.settings.mode
  const customLabel = state.settings.customModeName || 'Custom'

  function labelFor(mode: Mode) {
    return mode === 'custom' ? customLabel : MODE_META[mode].label
  }

  return (
    <div
      role="radiogroup"
      aria-label="Networking mode"
      className={cn('flex items-center gap-0.5 rounded-full border bg-card p-0.5', className)}
    >
      {(Object.keys(MODE_META) as Mode[]).map((mode) => {
        const Icon = MODE_ICONS[mode]
        const active = mode === current
        const label = labelFor(mode)
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            title={mode === 'custom' ? label : MODE_META[mode].blurb}
            onClick={() => setMode(mode)}
            className={cn(
              'flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
              active && 'bg-primary text-primary-foreground hover:text-primary-foreground',
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className={cn('truncate', !active && 'sr-only sm:not-sr-only')} style={{ maxWidth: '10ch' }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
