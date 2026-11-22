'use client'

import { HoverHint } from '@/components/ui/hover-hint'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BluetoothSearching, BookmarkPlus, Check, Loader2, Mic, Nfc, Smartphone, Users, WalletCards, Wifi } from 'lucide-react'
import { toast } from 'sonner'
import { useOnline, useStore } from '@/lib/store'
import { MODE_META, activeEvent } from '@/lib/agents'
import { parseVCard } from '@/lib/vcard'
import { cn } from '@/lib/utils'
import { CompanionAvatar } from '@/components/companion-avatar'
import type { Contact, Mode, SavedCard } from '@/lib/types'

const MODES = Object.keys(MODE_META) as Mode[]

const DEMO_TAPS: Omit<SavedCard, 'id' | 'savedAt' | 'savedOn'>[] = [
  { name: 'Ines Okafor', headline: 'Product Lead', company: 'Lumen Labs', email: 'ines@lumenlabs.io' },
  { name: 'Dev Ramaswamy', headline: 'Recruiter', company: 'Northwind', phone: '+1 415 555 0182' },
  { name: 'Hana Sato', headline: 'Design Engineer', company: 'Fieldwork', email: 'hana@fieldwork.dev' },
]

type Screen = 'home' | 'recent' | 'saved'
type PairPhase = 'idle' | 'scanning' | 'connected' | 'failed'

export default function WatchPage() {
  const { state, update, setMode, log } = useStore()
  const online = useOnline()
  const [screen, setScreen] = useState<Screen>('home')
  const [reading, setReading] = useState(false)
  const [pairPhase, setPairPhase] = useState<PairPhase>('idle')

  const event = activeEvent(state.events)
  const next = MODES[(MODES.indexOf(state.settings.mode) + 1) % MODES.length]
  const { companion, brand } = state.settings

  async function connectWatch() {
    setPairPhase('scanning')
    log(6, 'Initiating Bluetooth pairing with smartwatch…')
    // Attempt Web Bluetooth if available; otherwise simulate
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      try {
        // @ts-expect-error Web Bluetooth API not yet in TS DOM lib
        await navigator.bluetooth.requestDevice({ acceptAllDevices: true })
        setPairPhase('connected')
        log(6, 'Smartwatch paired via Bluetooth.')
      } catch {
        setPairPhase('failed')
        log(6, 'Bluetooth pairing cancelled or failed.')
      }
    } else {
      // Simulate pairing flow in browsers without Web Bluetooth
      await new Promise((r) => setTimeout(r, 2200))
      setPairPhase('connected')
      log(6, 'Smartwatch paired (simulated).')
    }
  }

  function save(card: Omit<SavedCard, 'id' | 'savedAt' | 'savedOn'>) {
    const saved: SavedCard = { ...card, id: crypto.randomUUID(), savedAt: new Date().toISOString(), savedOn: 'watch' }
    update((s) => ({ ...s, watchSaved: [saved, ...s.watchSaved] }))
    log(6, `Saved ${card.name}'s card on watch${online ? '' : ' (offline — stored locally)'}.`)
    toast.success(`Saved ${card.name}`)
  }

  async function readCard() {
    setReading(true)
    try {
      if ('NDEFReader' in window) {
        // @ts-expect-error Web NFC is not yet in the TS DOM lib
        const reader = new window.NDEFReader()
        await reader.scan()
        await new Promise<void>((resolve) => {
          reader.onreading = (ev: { message: { records: { recordType: string; data: DataView }[] } }) => {
            for (const r of ev.message.records) {
              const text = new TextDecoder().decode(r.data)
              const p = parseVCard(text)
              if (p?.name) {
                save({ name: p.name, headline: p.headline ?? '', company: p.company ?? '', email: p.email, phone: p.phone })
                break
              }
            }
            resolve()
          }
        })
      } else {
        await new Promise((r) => setTimeout(r, 900))
        save(DEMO_TAPS[state.watchSaved.length % DEMO_TAPS.length])
      }
    } catch {
      toast.error('Could not read card')
    } finally {
      setReading(false)
    }
  }

  function syncToPhone() {
    const pending = state.watchSaved
    if (!pending.length) return
    update((s) => ({
      ...s,
      watchSaved: [],
      contacts: [
        ...pending.map(
          (c): Contact => ({
            id: c.id,
            name: c.name,
            headline: c.headline,
            company: c.company,
            email: c.email,
            phone: c.phone,
            links: [],
            source: 'nfc',
            capturedAt: c.savedAt,
            mode: s.settings.mode,
            what: ['Saved from watch — add notes on your phone.'],
            why: {
              context: event ? `Met at ${event.title}` : 'Met in person',
              evidence: event ? [`${event.source}: ${event.title} at ${event.venue}`] : ['Saved on watch'],
              confidence: event ? 0.8 : 0.4,
              confirmed: false,
              alternatives: [],
            },
            noteEntries: [],
            tags: ['watch'],
            followedUp: false,
            pendingEnrichment: true,
          }),
        ),
        ...s.contacts,
      ],
    }))
    log(6, `Synced ${pending.length} watch card${pending.length === 1 ? '' : 's'} to phone contacts.`)
    toast.success('Synced to phone')
  }

  const PAIR_LABEL: Record<PairPhase, string> = {
    idle: 'Connect to Smart Watch',
    scanning: 'Scanning…',
    connected: 'Connected',
    failed: 'Retry connection',
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-neutral-950 p-6 text-white">
      <HoverHint hint="Leaves the watch preview and returns to the phone app.">
        <Link href="/" className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden /> Back to phone app
        </Link>
      </HoverHint>

      {/* ── Connect button ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={pairPhase === 'connected' ? undefined : connectWatch}
        disabled={pairPhase === 'scanning'}
        aria-label={PAIR_LABEL[pairPhase]}
        className={cn(
          // Base: circular, centred icon + label
          'flex flex-col items-center justify-center gap-2 rounded-full font-semibold transition-all active:scale-95 disabled:cursor-not-allowed',
          // Mobile 3× size: 18rem diameter (base ~6rem * 3)
          'size-72 text-xl',
          // Desktop 2× size: 12rem diameter
          'md:size-48 md:text-base',
          // Colour states
          pairPhase === 'idle'    && 'bg-brand text-brand-foreground shadow-2xl shadow-brand/40',
          pairPhase === 'scanning' && 'bg-neutral-800 text-white',
          pairPhase === 'connected' && 'bg-emerald-600 text-white shadow-2xl shadow-emerald-600/40',
          pairPhase === 'failed'  && 'bg-red-700/80 text-white',
        )}
      >
        {pairPhase === 'idle'     && <BluetoothSearching className="size-16 md:size-10" aria-hidden />}
        {pairPhase === 'scanning' && <Loader2 className="size-16 animate-spin md:size-10" aria-hidden />}
        {pairPhase === 'connected' && <Wifi className="size-16 md:size-10" aria-hidden />}
        {pairPhase === 'failed'   && <BluetoothSearching className="size-16 md:size-10" aria-hidden />}
        <span>{PAIR_LABEL[pairPhase]}</span>
      </button>

      <div
        className="relative flex size-[19rem] flex-col items-center justify-center overflow-hidden rounded-[4.5rem] border-[10px] border-neutral-800 bg-black p-6 shadow-2xl"
        aria-label="Smartwatch companion preview"
      >
        {screen === 'home' && (
          <div className="flex w-full flex-col items-center gap-2.5 text-center">
            <div className="flex items-center gap-2">
              <CompanionAvatar companion={companion} fallbackColor={brand} mode={state.settings.mode} size="sm" />
              <p className="max-w-32 truncate text-[11px] uppercase tracking-widest text-neutral-400">
                {event?.title ?? 'Nearby'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  log(6, 'Shared card from watch via NFC.')
                  toast.success('Card shared from watch')
                }}
                className="flex size-24 flex-col items-center justify-center gap-1 rounded-full bg-brand text-brand-foreground active:scale-95"
              >
                <Nfc className="size-7" aria-hidden />
                <span className="text-[11px] font-semibold">Share</span>
              </button>
              <button
                type="button"
                onClick={readCard}
                disabled={reading}
                className="flex size-24 flex-col items-center justify-center gap-1 rounded-full border-2 border-brand text-white active:scale-95 disabled:opacity-60"
              >
                <BookmarkPlus className={cn('size-7', reading && 'animate-pulse')} aria-hidden />
                <span className="text-[11px] font-semibold">{reading ? 'Hold near' : 'Save card'}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setMode(next, 'changed on watch')}
              className="rounded-full bg-neutral-800 px-4 py-1.5 text-xs font-medium"
              aria-label={`Mode: ${MODE_META[state.settings.mode].label}. Switch to ${MODE_META[next].label}`}
            >
              {MODE_META[state.settings.mode].label} mode
            </button>
            <div className="flex gap-3">
              <WatchIcon
                label="Record voice memo"
                onClick={() => {
                  log(3, 'Voice memo recorded on watch — will transcribe into Who & What.')
                  toast('Voice memo saved')
                }}
              >
                <Mic className="size-4" aria-hidden />
              </WatchIcon>
              <WatchIcon label={`Saved cards (${state.watchSaved.length})`} onClick={() => setScreen('saved')}>
                <WalletCards className="size-4" aria-hidden />
                {state.watchSaved.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-brand-foreground">
                    {state.watchSaved.length}
                  </span>
                )}
              </WatchIcon>
              <WatchIcon label="Recent contacts" onClick={() => setScreen('recent')}>
                <Users className="size-4" aria-hidden />
              </WatchIcon>
            </div>
          </div>
        )}

        {screen === 'saved' && (
          <div className="flex h-full w-full flex-col gap-2 pt-1">
            <div className="flex items-center justify-between px-2">
              <button type="button" onClick={() => setScreen('home')} className="text-xs text-neutral-400">
                Back
              </button>
              <span className="text-xs font-medium">Saved on watch</span>
              <button
                type="button"
                onClick={syncToPhone}
                disabled={!state.watchSaved.length}
                className="text-neutral-300 disabled:opacity-30"
                aria-label="Sync saved cards to phone"
              >
                <Smartphone className="size-4" aria-hidden />
              </button>
            </div>
            {state.watchSaved.length === 0 ? (
              <p className="mt-8 px-4 text-center text-xs text-neutral-500">
                Tap &quot;Save card&quot; and hold near someone&apos;s card. Works offline.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5 overflow-y-auto">
                {state.watchSaved.map((c) => (
                  <li key={c.id} className="rounded-2xl bg-neutral-900 px-3 py-2">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-[11px] text-neutral-400">
                      {c.headline} · {c.company}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {screen === 'recent' && (
          <div className="flex h-full w-full flex-col gap-2 pt-2">
            <button type="button" onClick={() => setScreen('home')} className="self-center text-xs text-neutral-400">
              Done
            </button>
            <ul className="flex flex-col gap-1.5 overflow-y-auto">
              {state.contacts.slice(0, 6).map((c) => (
                <li key={c.id} className="rounded-2xl bg-neutral-900 px-3 py-2">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className={cn('flex items-center gap-1 truncate text-[11px]', c.followedUp ? 'text-neutral-500' : 'text-brand')}>
                    {c.followedUp && <Check className="size-3" aria-hidden />}
                    {c.followedUp ? c.company : 'Follow up'}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="max-w-xs text-center text-sm text-neutral-400">
        Companion layout for Wear OS and watchOS: share, save others&apos; cards offline, switch mode, record a memo,
        and sync saved cards back to your phone.
      </p>
    </main>
  )
}

function WatchIcon({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex size-10 items-center justify-center rounded-full bg-neutral-800"
      aria-label={label}
    >
      {children}
    </button>
  )
}
