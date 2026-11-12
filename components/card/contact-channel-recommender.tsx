'use client'

import { useStore } from '@/lib/store'
import { stewardPolicy } from '@/lib/agents'
import { MODE_META } from '@/lib/agents'
import type { Mode, Priority } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  AtSign,
  ExternalLink,
  Link as LinkIcon,
  Phone,
  CalendarDays,
  Globe,
} from 'lucide-react'

// ── Channel scoring ────────────────────────────────────────────────────────────

interface RankedChannel {
  key: string
  label: string
  value: string
  kind: 'email' | 'phone' | 'linkedin' | 'website' | 'portfolio' | 'instagram' | 'x' | 'github' | 'calendly' | 'other'
  modesEnabled: Mode[]
  activeInCurrentMode: boolean
  priorityRank: number // 1 = top priority, higher = lower
  score: number
  reason: string
}

const KIND_ICON: Record<RankedChannel['kind'], typeof AtSign> = {
  email: AtSign,
  phone: Phone,
  linkedin: ExternalLink,
  website: Globe,
  portfolio: LinkIcon,
  instagram: ExternalLink,
  x: ExternalLink,
  github: ExternalLink,
  calendly: CalendarDays,
  other: ExternalLink,
}

/** Maps Priority type to the card-level channel kind */
const PRIORITY_TO_KIND: Record<Priority, RankedChannel['kind'][]> = {
  email: ['email'],
  phone: ['phone'],
  linkedin: ['linkedin'],
  website: ['website', 'portfolio'],
  social: ['instagram', 'x', 'github'],
}

function priorityRank(kind: RankedChannel['kind'], priorities: Priority[]): number {
  for (let i = 0; i < priorities.length; i++) {
    if (PRIORITY_TO_KIND[priorities[i]]?.includes(kind)) return i + 1
  }
  return priorities.length + 1
}

function reasonText(channel: Omit<RankedChannel, 'reason'>, totalModes: number): string {
  if (!channel.activeInCurrentMode) {
    return `Not shared in ${channel.modesEnabled.length > 0 ? channel.modesEnabled.join(', ') + ' mode' + (channel.modesEnabled.length > 1 ? 's only' : ' only') : 'any mode'}.`
  }
  const rankSuffix = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`)
  const modeCount = channel.modesEnabled.length
  const parts: string[] = []
  parts.push(`${rankSuffix(channel.priorityRank)} in your contact priority list.`)
  if (modeCount === totalModes) parts.push('Shared in all modes.')
  else parts.push(`Shared in ${channel.modesEnabled.join(', ')}.`)
  return parts.join(' ')
}

export function ContactChannelRecommender() {
  const { state } = useStore()
  const { profile, settings } = state
  const policy = stewardPolicy(settings)
  const currentMode = settings.mode
  const ALL_MODES = Object.keys(MODE_META) as Mode[]

  // Build the full list of available channels from the profile
  const channels: Omit<RankedChannel, 'reason'>[] = []

  // Email
  if (profile.email) {
    const modesEnabled = profile.share.email
    const active = modesEnabled.includes(currentMode)
    const rank = priorityRank('email', settings.priorities)
    channels.push({
      key: 'email',
      label: 'Email',
      value: profile.email,
      kind: 'email',
      modesEnabled,
      activeInCurrentMode: active,
      priorityRank: rank,
      score: active ? (10 - rank) * 10 + 50 : (10 - rank) * 2,
    })
  }

  // Phone
  if (profile.phone) {
    const modesEnabled = profile.share.phone
    const active = modesEnabled.includes(currentMode)
    const rank = priorityRank('phone', settings.priorities)
    channels.push({
      key: 'phone',
      label: 'Phone',
      value: profile.phone,
      kind: 'phone',
      modesEnabled,
      activeInCurrentMode: active,
      priorityRank: rank,
      score: active ? (10 - rank) * 10 + 50 : (10 - rank) * 2,
    })
  }

  // Profile links
  for (const link of profile.links) {
    const modesEnabled = link.modes
    const active = modesEnabled.includes(currentMode)
    const kind = link.kind as RankedChannel['kind']
    const rank = priorityRank(kind, settings.priorities)
    channels.push({
      key: link.id,
      label: link.label,
      value: link.url,
      kind,
      modesEnabled,
      activeInCurrentMode: active,
      priorityRank: rank,
      score: active ? (10 - rank) * 10 + 50 : (10 - rank) * 2,
    })
  }

  // Sort: active first, then by score desc, then by priority rank asc
  const ranked: RankedChannel[] = channels
    .map((c) => ({ ...c, reason: reasonText(c, ALL_MODES.length) }))
    .sort((a, b) => {
      if (a.activeInCurrentMode !== b.activeInCurrentMode)
        return a.activeInCurrentMode ? -1 : 1
      return b.score - a.score
    })

  const maxScore = ranked[0]?.score ?? 1

  if (ranked.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No contact methods on your card yet. Add them in the Card details tab.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Context banner */}
      <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Context agent · </span>
        Ranked for{' '}
        <span className="font-medium text-foreground capitalize">{MODE_META[currentMode].label}</span> mode.
        {' '}Channels not shared in this mode are shown below the divider.
      </div>

      {/* Ranked list */}
      <ol className="flex flex-col gap-3">
        {ranked.map((ch, i) => {
          const Icon = KIND_ICON[ch.kind]
          const barPct = Math.max(4, Math.round((ch.score / maxScore) * 100))
          const isFirstInactive = !ch.activeInCurrentMode && ranked[i - 1]?.activeInCurrentMode
          return (
            <li key={ch.key}>
              {isFirstInactive && (
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  Not shared in {MODE_META[currentMode].label} mode
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <div
                className={cn(
                  'flex flex-col gap-2 rounded-xl border p-3 transition-colors',
                  ch.activeInCurrentMode ? 'bg-card' : 'bg-muted/30 opacity-60',
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Rank badge */}
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      ch.activeInCurrentMode && i === 0
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {i + 1}
                  </span>

                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-none">{ch.label}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{ch.value}</p>
                  </div>

                  {ch.activeInCurrentMode && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Active
                    </span>
                  )}
                </div>

                {/* Likelihood bar */}
                {ch.activeInCurrentMode && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${barPct}%` }}
                        aria-label={`Likelihood ${barPct}%`}
                      />
                    </div>
                    <span className="w-8 text-right text-[10px] text-muted-foreground">{barPct}%</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">{ch.reason}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <p className="text-xs text-muted-foreground">
        Switch modes above to see how this ranking changes. Edit priorities in{' '}
        <span className="font-medium text-foreground">Settings → Contact priority</span>.
      </p>
    </div>
  )
}
