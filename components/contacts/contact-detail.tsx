'use client'

import { useRef, useState } from 'react'
import { Check, Loader2, Mail, Mic, MicOff, Phone, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useOnline, useStore } from '@/lib/store'
import type { Contact } from '@/lib/types'

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

export function ContactDetail({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const { state, updateContact, log } = useStore()
  const online = useOnline()
  const [drafting, setDrafting] = useState(false)
  const [recording, setRecording] = useState(false)
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
        const newNotes = c.notes ? `${c.notes}\n${transcript}` : transcript
        updateContact(c.id, { notes: newNotes })
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

  async function draftFollowUp(c: Contact) {
    if (!online) {
      toast('Follow-ups need a connection', { description: 'The Doer agent will draft it when you reconnect.' })
      return
    }
    setDrafting(true)
    try {
      const res = await fetch('/api/agents/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: state.profile.name, headline: state.profile.headline, company: state.profile.company },
          contact: {
            name: c.name,
            headline: c.headline,
            company: c.company,
            what: c.what,
            notes: c.notes,
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
                  <a href={`mailto:${contact.email}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                    <Mail className="size-4" aria-hidden /> {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                    <Phone className="size-4" aria-hidden /> {contact.phone}
                  </a>
                )}
                {contact.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ size: 'sm', variant: 'outline', className: 'capitalize' })}
                  >
                    {l.kind}
                  </a>
                ))}
              </div>

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

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="notes">Your notes</Label>
                  <button
                    type="button"
                    onClick={() => toggleVoiceNote(contact)}
                    aria-label={recording ? 'Stop recording' : 'Start voice note'}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      recording
                        ? 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {recording ? <MicOff className="size-3.5" aria-hidden /> : <Mic className="size-3.5" aria-hidden />}
                    {recording ? 'Stop' : 'Voice note'}
                  </button>
                </div>
                <Textarea
                  id="notes"
                  rows={3}
                  value={contact.notes}
                  onChange={(e) => updateContact(contact.id, { notes: e.target.value })}
                  placeholder="Anything to remember about them"
                />
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
  )
}
