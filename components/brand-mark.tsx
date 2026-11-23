'use client'

import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const DEFAULT_BRAND = '#0f766e'

/**
 * The RenKin "R". Shows the full-color primary logo while the app uses its
 * default teal. Once the user picks another UI color, the transparent monogram
 * is placed on a tile in that color so the logo always matches the interface.
 */
export function BrandMark({ className }: { className?: string }) {
  const { state } = useStore()
  const isDefault = state.settings.brand.toLowerCase() === DEFAULT_BRAND

  if (isDefault) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/brand/rk-primary-128.png"
        alt=""
        width={64}
        height={64}
        className={cn('size-8 shrink-0', className)}
      />
    )
  }

  return (
    <span
      aria-hidden
      className={cn('flex size-8 shrink-0 items-center justify-center rounded-[22%]', className)}
      style={{ backgroundColor: 'var(--brand)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/rk-monogram-256.png" alt="" width={128} height={128} className="size-full" />
    </span>
  )
}
