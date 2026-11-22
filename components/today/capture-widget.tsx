'use client'

import { useRef, useState } from 'react'
import {
  Camera,
  Check,
  ChevronDown,
  Mic,
  MicOff,
  Pause,
  PenLine,
  Play,
  Square,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { NoteEntry, OrphanNote } from '@/lib/types'

// ── Web Speech API types ──────────────────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: { [i: number]: { [j: number]: { transcript: string } }; length: number }
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}
declare const webkitSpeechRecognition: new () => SpeechRecognitionInstance
declare const SpeechRecognition: new () => SpeechRecognitionInstance

// ── Helper: format a stamp label ─────────────────────────────────────────────
function fmtStamp(isoAt: string, location: string): string {
  const d = new Date(isoAt)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours() % 12 || 12).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'AM' : 'PM'
  const timePart = `${hh}:${min} ${ampm}`
  return location ? `${mm}/${dd}/${yy} · ${location} · ${timePart}` : `${mm}/${dd}/${yy} · ${timePart}`
}

// ── Assign sheet ──────────────────────────────────────────────────────────────
type AssignAction = 'contact-existing' | 'contact-new' | 'keep' | 'delete'

function AssignSheet({
  open,
  onClose,
  entry,
  onAssign,
}: {
  open: boolean
  onClose: () => void
  entry: { body: string; at: string; location: string; photos: string[] } | null
  onAssign: (action: AssignAction, contactId?: string, newName?: string, newEmail?: string) => void
}) {
  const { state } = useStore()
  const [step, setStep] = useState<'choose' | 'existing' | 'new'>('choose')
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const filtered = state.contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )

  function reset() { setStep('choose'); setSearch(''); setNewName(''); setNewEmail('') }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-sm sm:border-l sm:border-t-0">
        <SheetHeader>
          <SheetTitle>Save note</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-10 pt-4">
          {step === 'choose' && (
            <>
              <p className="text-sm text-muted-foreground">What would you like to do with this note?</p>
              <Button
                className="justify-start gap-3"
                variant="outline"
                onClick={() => setStep('existing')}
              >
                <User className="size-4 shrink-0" aria-hidden />
                Assign to existing contact
              </Button>
              <Button
                className="justify-start gap-3"
                variant="outline"
                onClick={() => setStep('new')}
              >
                <User className="size-4 shrink-0" aria-hidden />
                Assign to new contact info
              </Button>
              <Button
                className="justify-start gap-3"
                variant="outline"
                onClick={() => { reset(); onAssign('keep') }}
              >
                <Check className="size-4 shrink-0" aria-hidden />
                Keep in Notes (unassigned)
              </Button>
              <Button
                className="justify-start gap-3 text-destructive hover:text-destructive"
                variant="outline"
                onClick={() => { reset(); onAssign('delete') }}
              >
                <Trash2 className="size-4 shrink-0" aria-hidden />
                Delete note
              </Button>
            </>
          )}

          {step === 'existing' && (
            <>
              <button type="button" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setStep('choose')}>
                ← Back
              </button>
              <Input
                placeholder="Search contacts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <ul className="flex max-h-64 flex-col divide-y overflow-y-auto rounded-xl border">
                {filtered.length === 0 && (
                  <li className="px-3 py-3 text-sm text-muted-foreground">No contacts found</li>
                )}
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 text-left hover:bg-accent"
                      onClick={() => { reset(); onAssign('contact-existing', c.id) }}
                    >
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{[c.headline, c.company].filter(Boolean).join(' · ')}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {step === 'new' && (
            <>
              <button type="button" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setStep('choose')}>
                ← Back
              </button>
              <div className="flex flex-col gap-3">
                <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                <Input placeholder="Email (optional)" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <Button
                disabled={!newName.trim()}
                onClick={() => { reset(); onAssign('contact-new', undefined, newName.trim(), newEmail.trim()) }}
              >
                Save note to new contact
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Saved notes tab (tab 2) ───────────────────────────────────────────────────
function NotesTab() {
  const { state } = useStore()
  const orphans = state.orphanNotes ?? []
  return (
    <div className="flex flex-col gap-3">
      {orphans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No unassigned notes yet. Use the Voice or Manual tab to capture one.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {orphans.slice(0, 5).map((n) => (
            <li key={n.id} className="rounded-xl border bg-muted/40 px-3 py-2.5 text-sm">
              <p className="text-xs font-medium text-muted-foreground">{n.title}</p>
              <p className="mt-0.5 line-clamp-2 text-foreground">{n.body}</p>
            </li>
          ))}
          {orphans.length > 5 && (
            <a href="/notes" className="text-xs text-primary hover:underline">
              See all {orphans.length} unassigned notes →
            </a>
          )}
        </ul>
      )}
      {orphans.length > 0 && (
        <a
          href="/notes"
          className="mt-1 flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          See all Unassigned Notes
          <ChevronDown className="size-4 -rotate-90" aria-hidden />
        </a>
      )}
    </div>
  )
}

// ── Voice capture tab ─────────────────────────────────────────────────────────
function VoiceTab({ onDone }: { onDone: (entry: { body: string; at: string; location: string; photos: string[] }) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'paused' | 'done'>('idle')
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  function getSR() {
    if (typeof SpeechRecognition !== 'undefined') return SpeechRecognition
    if (typeof webkitSpeechRecognition !== 'undefined') return webkitSpeechRecognition
    return null
  }

  function startRecording() {
    const SR = getSR()
    if (!SR) {
      toast('Voice notes not supported', { description: 'Try Chrome or Safari.' })
      return
    }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.continuous = true
    recognitionRef.current = rec
    rec.onresult = (e) => {
      const chunk = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(' ').trim()
      if (chunk) setTranscript((t) => (t ? `${t} ${chunk}` : chunk))
    }
    rec.onerror = () => {
      toast.error('Could not capture audio. Check microphone permissions.')
      setPhase('idle')
    }
    rec.onend = () => {
      if (phase === 'recording') setPhase('paused')
    }
    rec.start()
    setPhase('recording')
  }

  function pauseRecording() {
    recognitionRef.current?.stop()
    setPhase('paused')
  }

  function resumeRecording() {
    startRecording()
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setPhase('done')
  }

  function handleDone() {
    if (!transcript.trim()) return
    onDone({ body: transcript.trim(), at: new Date().toISOString(), location: '', photos: [] })
    setTranscript('')
    setPhase('idle')
  }

  function handleDiscard() {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setTranscript('')
    setPhase('idle')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {phase === 'idle' && (
          <Button onClick={startRecording} className="gap-2">
            <Mic className="size-4" aria-hidden /> Start recording
          </Button>
        )}
        {phase === 'recording' && (
          <>
            <Button variant="outline" onClick={pauseRecording} className="gap-2">
              <Pause className="size-4" aria-hidden /> Pause
            </Button>
            <Button variant="destructive" onClick={stopRecording} className="gap-2">
              <Square className="size-4" aria-hidden /> Stop
            </Button>
          </>
        )}
        {phase === 'paused' && (
          <>
            <Button variant="outline" onClick={resumeRecording} className="gap-2">
              <Play className="size-4" aria-hidden /> Resume
            </Button>
            <Button variant="destructive" onClick={stopRecording} className="gap-2">
              <Square className="size-4" aria-hidden /> Stop
            </Button>
          </>
        )}
        {phase === 'done' && (
          <>
            <Button onClick={handleDone} disabled={!transcript.trim()} className="gap-2">
              <Check className="size-4" aria-hidden /> Done
            </Button>
            <Button variant="outline" onClick={handleDiscard} className="gap-2">
              <Trash2 className="size-4" aria-hidden /> Discard
            </Button>
          </>
        )}
        {phase === 'recording' && (
          <span className="flex items-center gap-1.5 text-xs text-red-500">
            <span className="size-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
            Recording…
          </span>
        )}
        {phase === 'paused' && (
          <span className="text-xs text-muted-foreground">Paused</span>
        )}
      </div>

      {/* Live transcript */}
      {(phase !== 'idle') && (
        <Textarea
          rows={5}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Transcribed text will appear here…"
        />
      )}
      {phase === 'idle' && (
        <p className="text-center text-sm text-muted-foreground">
          Press Start to record. Your speech will be transcribed automatically. Press Stop when finished.
        </p>
      )}
    </div>
  )
}

// ── Manual capture tab ────────────────────────────────────────────────────────
function ManualTab({ onDone }: { onDone: (entry: { body: string; at: string; location: string; photos: string[] }) => void }) {
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setPhotos((prev) => [...prev, ev.target!.result as string])
      }
    }
    reader.readAsDataURL(file)
    // reset so same file can be re-picked
    e.target.value = ''
  }

  function handleDone() {
    if (!body.trim()) return
    onDone({ body: body.trim(), at: new Date().toISOString(), location: '', photos })
    setBody('')
    setPhotos([])
  }

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        rows={5}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your note here…"
        autoFocus
      />

      {/* Photos row */}
      <div className="flex flex-wrap items-center gap-2">
        {photos.map((src, i) => (
          <div key={i} className="relative size-14 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white"
              onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
              aria-label="Remove photo"
            >
              <X className="size-2.5" aria-hidden />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex size-14 items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Add photo"
        >
          <Camera className="size-5" aria-hidden />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
      </div>

      <Button onClick={handleDone} disabled={!body.trim()} className="gap-2">
        <Check className="size-4" aria-hidden /> Done
      </Button>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────
export function CaptureWidget() {
  const { state, addNoteEntry, addOrphanNote, addContact } = useStore()
  const [pendingEntry, setPendingEntry] = useState<{ body: string; at: string; location: string; photos: string[] } | null>(null)

  function handleCaptureDone(entry: { body: string; at: string; location: string; photos: string[] }) {
    setPendingEntry(entry)
  }

  function handleAssign(action: AssignAction, contactId?: string, newName?: string, newEmail?: string) {
    if (!pendingEntry) return
    const { body, at, location, photos } = pendingEntry

    if (action === 'delete') {
      setPendingEntry(null)
      toast('Note discarded')
      return
    }

    if (action === 'keep') {
      const stamp = fmtStamp(at, location)
      const orphan: OrphanNote = {
        id: crypto.randomUUID(),
        at,
        location,
        title: stamp,
        body,
        photos,
      }
      addOrphanNote(orphan)
      setPendingEntry(null)
      toast.success('Note saved to unassigned notes')
      return
    }

    if (action === 'contact-existing' && contactId) {
      const contact = state.contacts.find((c) => c.id === contactId)
      if (!contact) return
      const entry: NoteEntry = { id: crypto.randomUUID(), at, location, body, photos }
      addNoteEntry(contactId, entry)
      setPendingEntry(null)
      toast.success(`Note added to ${contact.name}`)
      return
    }

    if (action === 'contact-new' && newName) {
      const now = new Date().toISOString()
      const newContact = {
        id: crypto.randomUUID(),
        name: newName,
        headline: '',
        company: '',
        ...(newEmail ? { email: newEmail } : {}),
        links: [],
        source: 'manual' as const,
        capturedAt: now,
        mode: state.settings.mode,
        what: [],
        why: { context: '', evidence: [], confidence: 0, confirmed: false, alternatives: [] },
        noteEntries: [{ id: crypto.randomUUID(), at, location, body, photos }],
        tags: [],
        followedUp: false,
        pendingEnrichment: false,
      }
      addContact(newContact)
      setPendingEntry(null)
      toast.success(`Note saved and new contact "${newName}" created`)
      return
    }
  }

  return (
    <>
      <section aria-label="Conversation capture" className="overflow-hidden rounded-2xl border bg-card">
        <Tabs defaultValue="voice">
          <div className="border-b px-5 pt-3">
            <div className="flex items-center justify-center gap-2 pb-3">
              <PenLine className="size-4 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium">Conversation Capture</span>
            </div>
            <TabsList className="mx-auto w-full sm:w-auto">
              <TabsTrigger value="voice" className="flex-1 gap-1.5 sm:flex-none">
                <Mic className="size-4" aria-hidden />
                Voice
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1 gap-1.5 sm:flex-none">
                <PenLine className="size-4" aria-hidden />
                Manual
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 gap-1.5 sm:flex-none">
                Notes
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="voice" className="p-5">
            <VoiceTab onDone={handleCaptureDone} />
          </TabsContent>

          <TabsContent value="manual" className="p-5">
            <ManualTab onDone={handleCaptureDone} />
          </TabsContent>

          <TabsContent value="notes" className="p-5">
            <NotesTab />
          </TabsContent>
        </Tabs>
      </section>

      <AssignSheet
        open={!!pendingEntry}
        onClose={() => setPendingEntry(null)}
        entry={pendingEntry}
        onAssign={handleAssign}
      />
    </>
  )
}
