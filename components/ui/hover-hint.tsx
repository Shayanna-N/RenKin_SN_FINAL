import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface HoverHintProps {
  hint: string
  children: ReactNode
  align?: 'center' | 'start' | 'end'
  side?: 'top' | 'bottom'
  className?: string
}

const ALIGN = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-0',
  end: 'right-0',
} as const

const SIDE = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
} as const

export function HoverHint({ hint, children, align = 'center', side = 'top', className }: HoverHintProps) {
  return (
    <span className={cn('group/hint relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 hidden w-max max-w-56 rounded-lg border bg-popover px-3 py-2 text-left text-xs font-normal normal-case text-popover-foreground shadow-md group-hover/hint:block group-focus-within/hint:block',
          ALIGN[align],
          SIDE[side],
        )}
      >
        {hint}
      </span>
    </span>
  )
}
