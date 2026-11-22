'use client'

import { HoverHint } from '@/components/ui/hover-hint'
import { useRef, useState } from 'react'
import { Check, ChevronDown, FileText, Loader2, Mail, Mic, MicOff, Phone, Send, Sparkles, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useOnline, useStore } from '@/lib/store'
import { activeProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'
import type { Contact, NoteEntry } from '@/lib/types'

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

// ── Full note popup ───────────────────────────────────────────────────────────
function FullNoteSheet({
  open,
  onClose,
  contact,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  contact: Contact
  onDelete: (entryId: string, mode: 'this-and-after' | 'all-before') => void
}) {
  const entries = contact.noteEntries ?? []
  const [contextMenu, setContextMenu] = useState<{ entryId: string } | null>(null)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Full notes · {contact.name}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4 pb-8 pt-4">
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
          {entries.map((entry, idx) => (
            <div key={entry.id}>
              {/* Stamp line */}
              <div className="relative">
                <button
                  type="button"
                  className="mt-3 w-full rounded-md bg-primary/10 px-3 py-1.5 text-left text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                  onClick={() => setContextMenu(contextMenu?.entryId === entry.id ? null : { entryId: entry.id })}
                >
                  {fmtStamp(entry.at, entry.location)}
                </button>
                {contextMenu?.entryId === entry.id && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border bg-card shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent"
                      onClick={() => { setContextMenu(null); onDelete(entry.id, 'this-and-after') }}
                    >
                      <Trash2 className="size-3.5 text-destructive" aria-hidden />
                      Delete this note entry &amp; all after
                    </button>
                    {idx > 0 && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent"
                        onClick={() => { setContextMenu(null); onDelete(entry.id, 'all-before') }}
                      >
                        <Trash2 className="size-3.5 text-destructive" aria-hidden />
                        Delete all entries before this
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent"
                      onClick={() => setContextMenu(null)}
                    >
                      <X className="size-3.5" aria-hidden />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {/* Body */}
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{entry.body}</p>
              {/* Photos */}
              {entry.photos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.photos.map((src, pi) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={pi} src={src} alt={`Photo ${pi + 1}`} className="h-20 rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ContactDetail({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const { state, updateContact, removeContact, addNoteEntry, log } = useStore()
  const online = useOnline()
  const [drafting, setDrafting] = useState(false)
  const [recording, setRecording] = useState(false)
  const [fullNoteOpen, setFullNoteOpen] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  function toggleVoiceNote(c: Contact) {
    if (recording) {
      recognitionRef.current?.stop()
      setRecording(false)
      return
    }
    const SR =
      typeof SpeechRecognition !== 'undefined'
        ? SpeechRecognition
        : typeof webkitSpeechRecognition !== 'undefined'
          ? webkitSpeechRecognition
          : null

    if (!SR) {
      toast('Voice notes not supported', {
        description: 'Try Chrome or Safari on a supported device.',
      })
      return
    }

    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.continuous = false
    recognitionRef.current = rec

    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(' ').trim()
      if (transcript) {
        const entry: NoteEntry = {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          location: c.why?.context ?? '',
          body: transcript,
          photos: [],
        }
        addNoteEntry(c.id, entry)
        log(3, `Voice note appended for ${c.name}.`)
      }
    }
    rec.onerror = () => {
      toast.error('Could not capture audio. Check microphone permissions.')
      setRecording(false)
    }
    rec.onend = () => setRecording(false)

    rec.start()
    setRecording(true)
  }

  function handleManualNote(c: Contact, text: string) {
    const entry: NoteEntry = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      location: c.why?.context ?? '',
      body: text,
      photos: [],
    }
    addNoteEntry(c.id, entry)
  }

  function handleDeleteEntry(c: Contact, entryId: string, mode: 'this-and-after' | 'all-before') {
    const entries = c.noteEntries ?? []
    const idx = entries.findIndex((e) => e.id === entryId)
    if (idx === -1) return
    let next: NoteEntry[]
    if (mode === 'this-and-after') {
      next = entries.slice(0, idx)
    } else {
      next = entries.slice(idx)
    }
    updateContact(c.id, { noteEntries: next })
    log(3, `Deleted note entries for ${c.name}.`)
  }

  async function handleQuickSummary(c: Contact) {
    const allText = (c.noteEntries ?? []).map((e) => e.body).filter(Boolean).join('\n')
    if (!allText.trim()) {
      toast('No notes to summarize yet.')
      return
    }
    if (!online) {
      toast('Quick Summary needs a connection.')
      return
    }
    setSummarizing(true)
    setSummary(null)
    try {
      // Use the Scribe agent endpoint (same as what/notes generation)
      const res = await fetch('/api/agents/scribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: { name: c.name, notes: allText, what: c.what },
          task: 'summary',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary ?? allText.slice(0, 300))
      } else {
        // Fallback: show most recent entry body
        const last = [...(c.noteEntries ?? [])].reverse().find((e) => e.body)
        setSummary(last?.body?.slice(0, 300) ?? allText.slice(0, 300))
      }
    } catch {
      const last = [...(c.noteEntries ?? [])].reverse().find((e) => e.body)
      setSummary(last?.body?.slice(0, 300) ?? allText.slice(0, 300))
    } finally {
      setSummarizing(false)
    }
  }

  async function draftFollowUp(c: Contact) {
    if (!online) {
      toast('Follow-ups need a connection', { description: 'The Doer agent will draft it when you reconnect.' })
      return
    }
    setDrafting(true)
    try {
      const allNotes = (c.noteEntries ?? []).map((e) => e.body).filter(Boolean).join('\n')
      const res = await fetch('/api/agents/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: activeProfile(state).name, headline: activeProfile(state).headline, company: activeProfile(state).company },
          contact: {
            name: c.name,
            headline: c.headline,
            company: c.company,
            what: c.what,
            notes: allNotes,
            context: c.why.context,
          },
          mode: state.settings.mode,
          goals: state.settings.goals,
          preferences: state.settings.learnedPreferences,
        }),
      })
      if (!res.ok) throw new Error()
      const { followUp } = await res.json()
      updateContact(c.id, { followUp })
      log(5, `Drafted follow-up for ${c.name}: "${followUp.subject}".`)
    } catch {
      toast.error('Could not draft a follow-up. Try again.')
    } finally {
      setDrafting(false)
    }
  }

  function send(c: Contact) {
    if (!c.followUp) return
    const href = `mailto:${c.email ?? ''}?subject=${encodeURIComponent(c.followUp.subject)}&body=${encodeURIComponent(c.followUp.body)}`
    window.open(href, '_blank')
    updateContact(c.id, { followedUp: true })
    log(5, `Marked follow-up to ${c.name} as sent.`)
  }

  return (
    <>
      <Sheet open={!!contact} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {contact && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">{contact.name}</SheetTitle>
                <SheetDescription>
                  {[contact.headline, contact.company].filter(Boolean).join(' · ')}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-6 px-4 pb-8">
                <div className="flex flex-wrap gap-2">
                  {contact.email && (
                    <HoverHint hint="Opens your email app with a new message to this contact." align="start">
                      <a href={`mailto:${contact.email}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                        <Mail className="size-4" aria-hidden /> {contact.email}
                      </a>
                    </HoverHint>
                  )}
                  {contact.phone && (
                    <HoverHint hint="Starts a call using your phone app." align="start">
                      <a href={`tel:${contact.phone}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                        <Phone className="size-4" aria-hidden /> {contact.phone}
                      </a>
                    </HoverHint>
                  )}
                  {contact.links.map((l) => (
                    <HoverHint
                      key={l.url}
                      hint={l.kind === 'phone' ? 'Starts a call using your phone app.' : `Opens this contact's ${l.kind} page in a new tab.`}
                      align="start"
                    >
                      <a
                        href={l.url}
                        {...(l.kind === 'phone' ? {} : { target: '_blank', rel: 'noreferrer' })}
                        className={buttonVariants({ size: 'sm', variant: 'outline', className: 'capitalize' })}
                      >
                        {l.kind}
                      </a>
                    </HoverHint>
                  ))}
                </div>

                {contact.demo && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed bg-muted/40 p-3">
                    <p className="text-sm text-muted-foreground">
                      <Badge variant="secondary" className="mr-2">Demo</Badge>
                      Added by the tour. Not synced or exported.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        removeContact(contact.id)
                        onClose()
                        toast.success('Demo contact removed')
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden /> Remove
                    </Button>
                  </div>
                )}

                <section aria-labelledby="why-h" className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 id="why-h" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Why · Context agent
                    </h3>
                    <Badge variant={contact.why.confirmed ? 'default' : 'outline'}>
                      {contact.why.confirmed ? 'Confirmed' : `${Math.round(contact.why.confidence * 100)}% sure`}
                    </Badge>
                  </div>
                  <p className="mt-2 font-medium">{contact.why.context}</p>
                  {contact.why.evidence.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {contact.why.evidence.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
                  {!contact.why.confirmed && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          updateContact(contact.id, { why: { ...contact.why, confirmed: true } })
                          log(2, `User confirmed context for ${contact.name}.`)
                        }}
                      >
                        <Check className="size-4" aria-hidden /> Correct
                      </Button>
                      {contact.why.alternatives.map((alt) => (
                        <Button
                          key={alt}
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateContact(contact.id, {
                              why: { ...contact.why, context: alt, confirmed: true, confidence: 1 },
                            })
                            log(2, `Corrected context for ${contact.name} to "${alt}" — learning from this.`)
                          }}
                        >
                          {alt}
                        </Button>
                      ))}
                    </div>
                  )}
                </section>

                <section aria-labelledby="what-h">
                  <h3 id="what-h" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    What · Scribe agent
                  </h3>
                  {contact.what.length ? (
                    <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                      {contact.what.map((w) => (
                        <li key={w} className="rounded-lg bg-muted px-3 py-2">
                          {w}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No notes yet.</p>
                  )}
                </section>

                {/* ── Notes section ───────────────────────────────────────── */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Your notes</Label>
                    <div className="flex items-center gap-2">
                      {/* Quick Summary */}
                      <button
                        type="button"
                        onClick={() => handleQuickSummary(contact)}
                        disabled={summarizing || (contact.noteEntries ?? []).length === 0}
                        className="flex items-center gap-1.5 rounded-full border bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                      >
                        {summarizing ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
                        Quick Summary
                      </button>
                      {/* Full Note */}
                      <button
                        type="button"
                        onClick={() => setFullNoteOpen(true)}
                        disabled={(contact.noteEntries ?? []).length === 0}
                        className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
                      >
                        <FileText className="size-3.5" aria-hidden />
                        Full Note
                      </button>
                      {/* Voice note */}
                      <button
                        type="button"
                        onClick={() => toggleVoiceNote(contact)}
                        aria-label={recording ? 'Stop recording' : 'Start voice note'}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          recording
                            ? 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        {recording ? <MicOff className="size-3.5" aria-hidden /> : <Mic className="size-3.5" aria-hidden />}
                        {recording ? 'Stop' : 'Voice note'}
                      </button>
                    </div>
                  </div>

                  {/* Summary dismissible card */}
                  {summary && (
                    <div className="relative rounded-xl border bg-primary/5 px-4 py-3">
                      <p className="pr-6 text-sm text-foreground">{summary}</p>
                      <button
                        type="button"
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setSummary(null)}
                        aria-label="Dismiss summary"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  )}

                  {/* Most recent note entry preview */}
                  {(() => {
                    const entries = contact.noteEntries ?? []
                    const last = entries.at(-1)
                    if (!last) {
                      return (
                        <ManualNoteInput
                          onSave={(text) => handleManualNote(contact, text)}
                        />
                      )
                    }
                    return (
                      <div className="flex flex-col gap-2">
                        <div className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                          {fmtStamp(last.at, last.location)}
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">{last.body}</p>
                        {entries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFullNoteOpen(true)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <ChevronDown className="size-3.5" aria-hidden />
                            {entries.length - 1} earlier {entries.length === 2 ? 'entry' : 'entries'}
                          </button>
                        )}
                        <ManualNoteInput onSave={(text) => handleManualNote(contact, text)} />
                      </div>
                    )
                  })()}
                </div>

                <section aria-labelledby="follow-h" className="rounded-xl border p-4">
                  <h3 id="follow-h" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Follow-up · Doer agent
                  </h3>
                  {contact.followUp ? (
                    <div className="mt-2 flex flex-col gap-3 text-sm">
                      <p className="font-medium">{contact.followUp.subject}</p>
                      <p className="whitespace-pre-line text-pretty text-muted-foreground">{contact.followUp.body}</p>
                      <ul className="list-inside list-disc text-muted-foreground">
                        {contact.followUp.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => send(contact)} disabled={contact.followedUp}>
                          <Send className="size-4" aria-hidden />
                          {contact.followedUp ? 'Sent' : 'Review & send'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => draftFollowUp(contact)} disabled={drafting}>
                          Redraft
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button className="mt-3" onClick={() => draftFollowUp(contact)} disabled={drafting}>
                      {drafting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                      Draft follow-up
                    </Button>
                  )}
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {contact && (
        <FullNoteSheet
          open={fullNoteOpen}
          onClose={() => setFullNoteOpen(false)}
          contact={contact}
          onDelete={(entryId, mode) => handleDeleteEntry(contact, entryId, mode)}
        />
      )}
    </>
  )
}

// ── Inline manual note input ──────────────────────────────────────────────────
function ManualNoteInput({ onSave }: { onSave: (text: string) => void }) {
  const [text, setText] = useState('')
  function submit() {
    const t = text.trim()
    if (!t) return
    onSave(t)
    setText('')
  }
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new note…"
        className="rounded-[11px] pb-28"
      />
      <Button size="sm" onClick={submit} disabled={!text.trim()}>
        Save note
      </Button>
    </div>
  )
}
