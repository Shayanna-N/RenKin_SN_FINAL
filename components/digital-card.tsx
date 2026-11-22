'use client'

import { Globe, Link2, Mail, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StyledQr, normalizeQrUrl } from '@/components/styled-qr'
import { visibleProfile } from '@/lib/vcard'
import { MODE_META } from '@/lib/agents'
import { AnimalSilhouette } from '@/components/companion-avatar'
import type { CompanionConfig, Mode, Profile, Settings } from '@/lib/types'

export function DigitalCard({
  profile,
  mode,
  style,
  companion,
  customQrUrl,
  customQrStyle = 'squares',
  customQrColor = '',
  customCardFields = [],
  customModeName,
  className,
}: {
  profile: Profile
  mode: Mode
  style: Settings['cardStyle']
  companion?: CompanionConfig
  customQrUrl?: string
  customQrStyle?: Settings['customQrStyle']
  customQrColor?: string
  customCardFields?: Settings['customCardFields']
  customModeName?: string
  className?: string
}) {
  const v = visibleProfile(profile, mode)
  const initials = profile.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
  const minimal = style === 'minimal'
  const showAnimal = companion?.showOnCard

  // Safe label lookup — falls back gracefully if stored mode key is stale
  const modeLabel =
    mode === 'custom' && customModeName
      ? customModeName
      : (MODE_META[mode]?.label ?? mode)

  const qrUrl = normalizeQrUrl(customQrUrl ?? '')

  return (
    <div
      className={cn(
        'relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl p-5 shadow-lg ring-1 ring-black/5 sm:p-6',
        `card-tex-${style}`,
        className,
      )}
      aria-label={`Digital card for ${profile.name}`}
    >
      {qrUrl && (
        <StyledQr
          value={qrUrl}
          shape={customQrStyle}
          color={customQrColor || 'currentColor'}
          margin={0}
          className="pointer-events-none absolute bottom-9 right-5 aspect-square h-[42%] sm:bottom-10 sm:right-6"
        />
      )}

      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{v.name}</p>
            <p className={cn('truncate text-sm', minimal ? 'text-muted-foreground' : 'opacity-80')}>
              {v.headline} · {v.company}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            {showAnimal && companion ? (
              <AnimalSilhouette
                animal={companion.animal}
                className="size-12 opacity-90 sm:size-14"
                style={companion.color ? { color: companion.color } : undefined}
              />
            ) : (
              <span
                className={cn(
                  'flex size-11 items-center justify-center rounded-full text-sm font-semibold',
                  minimal ? 'bg-primary text-primary-foreground' : 'bg-white/15',
                )}
                aria-hidden
              >
                {initials}
              </span>
            )}
          </div>
        </div>

        <ul className={cn('flex flex-col gap-1 text-xs sm:text-sm', qrUrl && 'pr-[32%]')}>
          {v.email && (
            <li className="flex items-center gap-2 truncate">
              <Mail className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {v.email}
            </li>
          )}
          {v.phone && (
            <li className="flex items-center gap-2 truncate">
              <Phone className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {v.phone}
            </li>
          )}
          {v.links.slice(0, 2).map((l) => (
            <li key={l.id} className="flex items-center gap-2 truncate">
              {l.kind === 'website' || l.kind === 'portfolio' ? (
                <Globe className="size-3.5 shrink-0 opacity-80" aria-hidden />
              ) : (
                <Link2 className="size-3.5 shrink-0 opacity-80" aria-hidden />
              )}
              {l.url.replace(/^https?:\/\//, '')}
            </li>
          ))}
          {mode === 'custom' && customCardFields.slice(0, 5).map((f, i) => (
            <li key={i} className="flex items-center gap-2 truncate opacity-90">
              <span className="opacity-70">{f.label}:</span>
              <span>{f.value}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-widest opacity-70">
          <span>{modeLabel} card</span>
          <span className="font-mono">Renkin · Tap</span>
        </div>
      </div>
    </div>
  )
}
