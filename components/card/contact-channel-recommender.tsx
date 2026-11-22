'use client'

import { useStore } from '@/lib/store'
import { MODE_META } from '@/lib/agents'
import { activeProfile, modeLabel } from '@/lib/profile'
import type { Priority } from '@/lib/types'
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

function reasonText(channel: Omit<RankedChannel, 'reason'>): string {
  const rankSuffix = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`)
  return `${rankSuffix(channel.priorityRank)} in your contact priority list.`
}

export function ContactChannelRecommender() {
  const { state } = useStore()
  const { settings } = state
  const profile = activeProfile(state)
  const currentMode = settings.mode
  const currentLabel = modeLabel(currentMode, settings.customModeName, MODE_META[currentMode].label)

  // Every channel on the active mode's card is shared in that mode
  const channels: Omit<RankedChannel, 'reason'>[] = []

  const addChannel = (key: string, label: string, value: string, kind: RankedChannel['kind']) => {
    const rank = priorityRank(kind, settings.priorities)
    channels.push({
      key,
      label,
      value,
      kind,
      activeInCurrentMode: true,
      priorityRank: rank,
      score: (10 - rank) * 10 + 50,
    })
  }

  if (profile.email) addChannel('email', 'Email', profile.email, 'email')
  if (profile.phone) addChannel('phone', 'Phone', profile.phone, 'phone')
  for (const link of profile.links) addChannel(link.id, link.label, link.url, link.kind)

  // Sort: active first, then by score desc, then by priority rank asc
  const ranked: RankedChannel[] = channels
    .map((c) => ({ ...c, reason: reasonText(c) }))
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
        <span className="font-medium text-foreground capitalize">{currentLabel}</span> mode.
      </div>

      {/* Ranked list */}
      <ol className="flex flex-col gap-3">
        {ranked.map((ch, i) => {
          const Icon = KIND_ICON[ch.kind]
          const barPct = Math.max(4, Math.round((ch.score / maxScore) * 100))
          return (
            <li key={ch.key}>
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
