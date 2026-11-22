'use client'

import { HoverHint } from '@/components/ui/hover-hint'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, CreditCard, Loader2, Maximize2, Minimize2, ScanLine, Share2, X } from 'lucide-react'
import { DigitalCard } from '@/components/digital-card'
import { SharePanel } from '@/components/card/share-panel'
import { CardReader } from '@/components/scan/card-reader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { activeProfile } from '@/lib/profile'
import { buildVCard } from '@/lib/vcard'
import { cn } from '@/lib/utils'
import type { Contact } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type ShareTask =
  | { kind: 'nfc' }
  | { kind: 'wallet'; wallet: 'Apple Wallet' | 'Google Wallet' }
  | { kind: 'vcf' }

type TaskPhase = 'working' | 'done' | 'error'

interface ShareProgress {
  task: ShareTask
  phase: TaskPhase
  message: string
}

interface ReadProgress {
  phase: TaskPhase
  contact: Contact | null
  message: string
}

// ─── NFC writer interface ─────────────────────────────────────────────────────

interface NDEFWriter {
  write: (msg: { records: { recordType: string; mediaType?: string; data: Uint8Array | string }[] }) => Promise<void>
}

// ─── Progress step bar ────────────────────────────────────────────────────────

function StepBar({ phase, steps }: { phase: TaskPhase; steps: string[] }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (phase !== 'working') return
    const ids: ReturnType<typeof setTimeout>[] = []
    steps.forEach((_, i) => {
      if (i === 0) return
      ids.push(setTimeout(() => setActive(i), i * (1800 / steps.length)))
    })
    return () => ids.forEach(clearTimeout)
  }, [phase, steps])

  const finalStep = phase === 'done' ? steps.length : phase === 'error' ? -1 : active

  return (
    <ol className="flex w-full flex-col gap-2.5">
      {steps.map((label, i) => {
        const isDone = phase === 'done' || (phase === 'working' && i < active)
        const isCurrent = phase === 'working' && i === active
        const isError = phase === 'error' && i === active
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                isDone && 'bg-primary text-primary-foreground',
                isCurrent && 'bg-primary/20 text-primary',
                isError && 'bg-destructive/20 text-destructive',
                !isDone && !isCurrent && !isError && 'bg-muted text-muted-foreground',
              )}
            >
              {isDone ? <Check className="size-3.5" aria-hidden /> : isError ? <X className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                'text-sm transition-colors',
                isDone && 'text-foreground',
                isCurrent && 'font-medium text-foreground',
                isError && 'text-destructive',
                !isDone && !isCurrent && !isError && 'text-muted-foreground',
              )}
            >
              {label}
              {isCurrent && <span className="ml-1 inline-block animate-pulse">…</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function CardWidget({
  expanded = false,
  onToggleExpand,
}: {
  expanded?: boolean
  onToggleExpand?: () => void
} = {}) {
  const { state, log } = useStore()
  const vcard = buildVCard(activeProfile(state))

  const [shareProgress, setShareProgress] = useState<ShareProgress | null>(null)
  const [readProgress, setReadProgress] = useState<ReadProgress | null>(null)

  // ── Share handlers ──────────────────────────────────────────────────────────

  async function handleNfc() {
    setShareProgress({ task: { kind: 'nfc' }, phase: 'working', message: '' })
    const NDEF = (window as unknown as { NDEFReader?: new () => NDEFWriter }).NDEFReader
    if (!NDEF) {
      setShareProgress({
        task: { kind: 'nfc' },
        phase: 'error',
        message: 'NFC is not available in this browser. Use the native app, or show your QR code.',
      })
      return
    }
    try {
      await new NDEF().write({
        records: [{ recordType: 'mime', mediaType: 'text/vcard', data: new TextEncoder().encode(vcard) }],
      })
      log(6, `Shared ${state.settings.mode} card via NFC.`)
      setShareProgress({ task: { kind: 'nfc' }, phase: 'done', message: 'Card shared via NFC.' })
    } catch {
      setShareProgress({ task: { kind: 'nfc' }, phase: 'error', message: 'Hold the tag near the top of your phone and try again.' })
    }
  }

  function handleWallet(wallet: 'Apple Wallet' | 'Google Wallet') {
    setShareProgress({ task: { kind: 'wallet', wallet }, phase: 'working', message: '' })
    log(5, `Requested ${wallet} pass for ${state.settings.mode} card.`)
    // Simulate server-side signing delay
    setTimeout(() => {
      setShareProgress({
        task: { kind: 'wallet', wallet },
        phase: 'done',
        message: `${wallet} pass queued. Connect your pass issuer credentials to enable live download.`,
      })
    }, 2200)
  }

  function handleVcf() {
    setShareProgress({ task: { kind: 'vcf' }, phase: 'working', message: '' })
    try {
      const blob = new Blob([vcard], { type: 'text/vcard' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeProfile(state).name.replace(/\s+/g, '-').toLowerCase()}.vcf`
      a.click()
      URL.revokeObjectURL(url)
      log(6, 'Exported card as vCard.')
      setTimeout(() => {
        setShareProgress({ task: { kind: 'vcf' }, phase: 'done', message: 'Contact file saved.' })
      }, 800)
    } catch {
      setShareProgress({ task: { kind: 'vcf' }, phase: 'error', message: 'Could not create the file.' })
    }
  }

  // ── Read handler ────────────────────────────────────────────────────────────

  function handleCapture(contact: Contact) {
    setReadProgress({ phase: 'working', contact, message: '' })
    // Give agents a moment to finish enrichment animation, then show done
    setTimeout(() => {
      setReadProgress({ phase: 'done', contact, message: '' })
    }, 2400)
  }

  // ── Share progress sheet content ────────────────────────────────────────────

  const shareSteps: Record<ShareTask['kind'], string[]> = {
    nfc: ['Encoding contact data', 'Opening NFC channel', 'Writing to tag'],
    wallet: ['Building pass template', 'Signing pass server-side', 'Delivering to wallet'],
    vcf: ['Encoding vCard', 'Preparing download'],
  }

  // ── Read progress steps ──────────────────────────────────────────────────────

  const READ_STEPS = ['Reading card data', 'Parsing contact fields', 'Running Scribe agent', 'Saving contact']

  return (
    <>
      <section aria-label="My card" className="overflow-hidden rounded-2xl border bg-card">
        <Tabs defaultValue="my-card">
          <div className="flex items-center justify-between border-b px-5 pt-3">
            {/* Resize button — desktop only */}
            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                title={expanded ? 'Shrink card to column' : 'Expand card to full width'}
                className="hidden lg:flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                {expanded ? <Minimize2 className="size-3.5" aria-hidden /> : <Maximize2 className="size-3.5" aria-hidden />}
                {expanded ? 'Shrink' : 'Expand'}
              </button>
            )}
            {!onToggleExpand && <div />}
            <TabsList className="w-full sm:max-w-sm [&]:h-16 sm:[&]:h-8">
              <TabsTrigger value="my-card" className="flex-1 gap-1.5 text-sm sm:text-xs">
                <CreditCard className="size-5 sm:size-4" aria-hidden />
                My Card
              </TabsTrigger>
              <TabsTrigger value="share" className="flex-1 gap-1.5 text-sm sm:text-xs">
                <Share2 className="size-5 sm:size-4" aria-hidden />
                Share
              </TabsTrigger>
              <TabsTrigger value="read" className="flex-1 gap-1.5 text-sm sm:text-xs">
                <ScanLine className="size-5 sm:size-4" aria-hidden />
                Read
              </TabsTrigger>
            </TabsList>
            {/* Spacer to balance flex layout when resize button is shown */}
            {onToggleExpand && <div className="hidden lg:block w-20" />}
            {!onToggleExpand && <div />}
          </div>

          {/* ── My Card tab ─────────────────────────────────────────────── */}
          <TabsContent value="my-card" className="p-5">
            <HoverHint hint="Opens My card, where you can edit your details and style." className="flex">
              <Link href="/card" aria-label="Customise my card" className="block w-full rounded-2xl transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <DigitalCard
                  profile={activeProfile(state)}
                  mode={state.settings.mode}
                  style={state.settings.cardStyle}
                  companion={state.settings.companion}
                  customQrStyle={state.settings.customQrStyle}
                  customQrColor={state.settings.customQrColor}
                  customCardFields={state.settings.customCardFields}
                  customModeName={state.settings.customModeName}
                />
              </Link>
            </HoverHint>
          </TabsContent>

          <TabsContent value="share" className="p-5">
            <SharePanel
              onNfc={handleNfc}
              onWallet={handleWallet}
              onVcf={handleVcf}
            />
          </TabsContent>

          <TabsContent value="read" className="p-5">
            <CardReader onCapture={handleCapture} />
          </TabsContent>
        </Tabs>
      </section>

      {/* ── Share progress sheet ───────────────────────────────────────────── */}
      <Sheet open={!!shareProgress} onOpenChange={(o) => !o && setShareProgress(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[80dvh] overflow-y-auto sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-sm sm:border-l sm:border-t-0"
        >
          <SheetHeader>
            <SheetTitle>
              {shareProgress?.task.kind === 'nfc' && 'Sharing via NFC'}
              {shareProgress?.task.kind === 'wallet' && `Adding to ${(shareProgress.task as { wallet: string }).wallet}`}
              {shareProgress?.task.kind === 'vcf' && 'Saving contact file'}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-8 px-4 pb-10 pt-4">
            {/* Animated icon */}
            <div className="flex justify-center">
              <span
                className={cn(
                  'flex size-24 items-center justify-center rounded-full transition-colors',
                  shareProgress?.phase === 'working' && 'bg-primary/10 text-primary',
                  shareProgress?.phase === 'done' && 'bg-primary text-primary-foreground',
                  shareProgress?.phase === 'error' && 'bg-destructive/10 text-destructive',
                )}
              >
                {shareProgress?.phase === 'working' && <Loader2 className="size-10 animate-spin" aria-hidden />}
                {shareProgress?.phase === 'done' && <Check className="size-10" aria-hidden />}
                {shareProgress?.phase === 'error' && <X className="size-10" aria-hidden />}
              </span>
            </div>

            {/* Step progress */}
            {shareProgress && (
              <StepBar
                phase={shareProgress.phase}
                steps={shareSteps[shareProgress.task.kind]}
              />
            )}

            {/* Result message */}
            {shareProgress?.phase !== 'working' && shareProgress?.message && (
              <p className={cn('text-sm', shareProgress.phase === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                {shareProgress.message}
              </p>
            )}

            {/* Done / close */}
            {shareProgress?.phase === 'done' && (
              <Button onClick={() => setShareProgress(null)}>Done</Button>
            )}
            {shareProgress?.phase === 'error' && (
              <Button variant="outline" onClick={() => setShareProgress(null)}>Try again</Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Read progress sheet ────────────────────────────────────────────── */}
      <Sheet open={!!readProgress} onOpenChange={(o) => !o && setReadProgress(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[80dvh] overflow-y-auto sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-sm sm:border-l sm:border-t-0"
        >
          <SheetHeader>
            <SheetTitle>
              {readProgress?.phase === 'working' ? 'Reading card…' : readProgress?.phase === 'done' ? 'Card saved' : 'Could not read card'}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-8 px-4 pb-10 pt-4">
            {/* Animated icon */}
            <div className="flex justify-center">
              <span
                className={cn(
                  'flex size-24 items-center justify-center rounded-full transition-colors',
                  readProgress?.phase === 'working' && 'bg-primary/10 text-primary',
                  readProgress?.phase === 'done' && 'bg-primary text-primary-foreground',
                  readProgress?.phase === 'error' && 'bg-destructive/10 text-destructive',
                )}
              >
                {readProgress?.phase === 'working' && <Loader2 className="size-10 animate-spin" aria-hidden />}
                {readProgress?.phase === 'done' && <Check className="size-10" aria-hidden />}
                {readProgress?.phase === 'error' && <X className="size-10" aria-hidden />}
              </span>
            </div>

            {/* Step progress */}
            {readProgress && (
              <StepBar phase={readProgress.phase} steps={READ_STEPS} />
            )}

            {/* Saved contact summary */}
            {readProgress?.phase === 'done' && readProgress.contact && (
              <div className="rounded-2xl border bg-card p-4">
                <p className="font-semibold">{readProgress.contact.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {[readProgress.contact.headline, readProgress.contact.company].filter(Boolean).join(' · ') || 'Details recorded'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{readProgress.contact.why.context}</p>
              </div>
            )}

            {/* Actions */}
            {readProgress?.phase === 'done' && readProgress.contact && (
              <div className="flex flex-col gap-2">
                <HoverHint hint="Opens the Contacts page with this person's details." className="flex [&>*]:w-full">
                  <Button
                    nativeButton={false}
                    render={<Link href={`/contacts?open=${readProgress.contact.id}`} />}
                    onClick={() => setReadProgress(null)}
                  >
                    View contact
                  </Button>
                </HoverHint>
                <Button variant="outline" onClick={() => setReadProgress(null)}>Done</Button>
              </div>
            )}
            {readProgress?.phase === 'error' && (
              <Button variant="outline" onClick={() => setReadProgress(null)}>Try again</Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
