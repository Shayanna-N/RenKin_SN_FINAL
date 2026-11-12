'use client'

import { useRef, useState } from 'react'
import { Camera, Keyboard, Loader2, Nfc } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCapture } from '@/lib/use-capture'
import { parseVCard } from '@/lib/vcard'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import type { Contact } from '@/lib/types'

interface NDEFRecordLike {
  recordType: string
  mediaType?: string
  data: DataView
}
interface NDEFReaderLike {
  scan: () => Promise<void>
  onreading: ((e: { message: { records: NDEFRecordLike[] } }) => void) | null
}
interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>
}

type Method = 'tap' | 'photo' | 'type'

const METHODS: { id: Method; label: string; hint: string; icon: typeof Nfc }[] = [
  { id: 'tap', label: 'Tap a card', hint: 'NFC card, phone or watch', icon: Nfc },
  { id: 'photo', label: 'Take a photo', hint: 'Paper card, QR code or flier', icon: Camera },
  { id: 'type', label: 'Type it in', hint: 'Works with no signal', icon: Keyboard },
]

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Full read UI rendered inline inside the Read tab.
 * `onCapture` is called when a contact is successfully captured —
 * the parent opens the progress/result sheet.
 */
export function CardReader({ onCapture }: { onCapture: (contact: Contact) => void }) {
  const { capture, busy, online } = useCapture()
  const { state } = useStore()
  const [method, setMethod] = useState<Method>(state.settings.defaultReadMethod ?? 'tap')
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function startTap() {
    const NDEF = (window as unknown as { NDEFReader?: new () => NDEFReaderLike }).NDEFReader
    if (!NDEF) {
      toast('NFC reading is not available here', {
        description: 'Use Chrome on Android, or the native app. You can take a photo or type the card instead.',
      })
      return
    }
    try {
      const reader = new NDEF()
      await reader.scan()
      setListening(true)
      reader.onreading = async (e) => {
        setListening(false)
        const decoder = new TextDecoder()
        const raw = e.message.records.map((r) => decoder.decode(r.data)).join('\n')
        const person = parseVCard(raw)
        const contact = await capture(person ? { source: 'nfc', person } : { source: 'nfc', text: raw })
        if (contact) onCapture(contact)
      }
    } catch {
      setListening(false)
      toast.error('NFC permission was denied.')
    }
  }

  async function onPhoto(file: File) {
    const Detector = (window as unknown as { BarcodeDetector?: new (o: object) => BarcodeDetectorLike })
      .BarcodeDetector
    if (Detector) {
      try {
        const bitmap = await createImageBitmap(file)
        const codes = await new Detector({ formats: ['qr_code'] }).detect(bitmap)
        const person = codes[0] && parseVCard(codes[0].rawValue)
        if (person) {
          const contact = await capture({ source: 'qr', person })
          if (contact) onCapture(contact)
          return
        }
      } catch {
        // Fall through to the Scribe agent's image reading.
      }
    }
    if (!online) {
      toast('Saved the photo step for later', {
        description: "You're offline, so please type the name and details from the card.",
      })
      setMethod('type')
      return
    }
    const image = await fileToDataUrl(file)
    const contact = await capture({ source: 'photo', image })
    if (contact) onCapture(contact)
  }

  async function onType(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    const contact = await capture({ source: 'manual', text })
    if (contact) {
      onCapture(contact)
      setText('')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="How to read the card" className="grid gap-3 sm:grid-cols-3">
        {METHODS.map(({ id, label, hint, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={method === id}
            onClick={() => setMethod(id)}
            className={cn(
              'flex items-center gap-4 rounded-2xl border bg-card p-5 text-left transition-colors sm:flex-col sm:items-start',
              method === id && 'border-primary ring-2 ring-primary/20',
            )}
          >
            <span
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted',
                method === id && 'bg-primary text-primary-foreground',
              )}
            >
              <Icon className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block text-lg font-semibold">{label}</span>
              <span className="block text-sm text-muted-foreground">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="rounded-2xl border bg-card p-6">
        {method === 'tap' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span
              className={cn(
                'flex size-28 items-center justify-center rounded-full bg-primary/10 text-primary',
                listening && 'animate-pulse',
              )}
            >
              <Nfc className="size-12" aria-hidden />
            </span>
            <p className="max-w-sm text-pretty text-muted-foreground">
              {listening
                ? 'Ready. Hold the card or phone against the back of your phone.'
                : 'Press the button, then hold the other card or phone against yours.'}
            </p>
            <Button size="lg" className="h-14 px-8 text-lg" onClick={startTap} disabled={listening || busy}>
              {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Nfc className="size-5" aria-hidden />}
              {listening ? 'Listening…' : 'Start reading'}
            </Button>
          </div>
        )}

        {method === 'photo' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="max-w-sm text-pretty text-muted-foreground">
              Snap a business card, a QR code, or an event flier. The Scribe agent reads it for you.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label="Card photo"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onPhoto(f)
                e.target.value = ''
              }}
            />
            <Button size="lg" className="h-14 px-8 text-lg" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Camera className="size-5" aria-hidden />}
              {busy ? 'Reading card…' : 'Open camera'}
            </Button>
          </div>
        )}

        {method === 'type' && (
          <form onSubmit={onType} className="flex flex-col gap-3">
            <Label htmlFor="card-text" className="text-base">
              Type or paste what&apos;s on the card
            </Label>
            <Textarea
              id="card-text"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'Jordan Lee\nProduct Designer, Acme\njordan@acme.com\n(555) 010-2030'}
              className="text-base"
            />
            <p className="text-sm text-muted-foreground">
              {online
                ? 'One detail per line is easiest. Agents will tidy it up.'
                : 'Offline: saved on this device and enriched automatically when you reconnect.'}
            </p>
            <Button type="submit" size="lg" className="h-12 text-base" disabled={busy || !text.trim()}>
              {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
              Save contact
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
