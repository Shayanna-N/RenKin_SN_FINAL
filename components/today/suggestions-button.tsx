'use client'

import { useRef, useState } from 'react'
import { ChevronDown, Lightbulb, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { activeEvent } from '@/lib/agents'
import { badgeById } from '@/lib/companion'
import { activeProfile } from '@/lib/profile'
import { useStore } from '@/lib/store'
import type { Suggestion, SuggestionAgent, SuggestionKind } from '@/lib/types'
import { cn } from '@/lib/utils'

type Candidate = Omit<Suggestion, 'savedAt'>

interface ApiResult {
  actions: { text: string; reason: string; agent: SuggestionAgent }[]
  starters: { text: string; reason: string }[]
}

const SECTIONS: { kind: SuggestionKind; title: string; hint: string }[] = [
  { kind: 'action', title: 'Suggested actions', hint: 'Built from your context, notes, plan and follow-ups' },
  { kind: 'starter', title: 'Conversation starters', hint: 'Built only from your own profile, goals and interests' },
]

export function SuggestionsButton({ className }: { className?: string }) {
  const { state, update, log } = useStore()
  const { companion, passiveCollection } = state.settings
  const name = companion.name.trim() || 'Your companion'

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [collapsed, setCollapsed] = useState<Set<SuggestionKind>>(new Set())
  const latestRequest = useRef(0)

  const keptTexts = new Set(state.suggestions.map((s) => s.text.toLowerCase()))
  const isKept = (c: Candidate) => keptTexts.has(c.text.toLowerCase())

  function buildPayload(avoid: string[]) {
    const profile = activeProfile(state)
    const { settings } = state
    const event = activeEvent(state.events)
    const bodyOf = (entries: { body: string }[]) =>
      entries
        .map((e) => e.body.trim())
        .filter(Boolean)
        .join(' ')
        .slice(0, 240)
    return {
      companionName: name,
      mode: settings.mode,
      user: {
        name: profile.name,
        headline: profile.headline,
        company: profile.company,
        bio: profile.bio.slice(0, 400),
        interests: (companion.badges[settings.mode] ?? [])
          .map((id) => badgeById(id)?.label)
          .filter((l): l is string => Boolean(l)),
        goals: settings.goals,
        preferences: settings.learnedPreferences,
        currentEvent: event?.title ?? null,
      },
      network: {
        todos: state.todos.map((t) => ({ text: t.text, done: t.done })),
        jobs: state.jobs.map((j) => ({ role: j.role, company: j.company })),
        contacts: state.contacts.slice(0, 8).map((c) => ({
          name: c.name,
          headline: c.headline,
          company: c.company,
          context: c.why.context,
          what: c.what.slice(0, 4),
          followedUp: c.followedUp,
          notes: bodyOf(c.noteEntries ?? []),
        })),
        notes: state.orphanNotes.slice(0, 5).map((n) => n.body.trim().slice(0, 200)),
      },
      avoid: avoid.slice(0, 40),
    }
  }

  async function generate(keep: Candidate[]) {
    const requestId = ++latestRequest.current
    setLoading(true)
    setError(null)
    const avoid = [...candidates.map((c) => c.text), ...state.suggestions.map((s) => s.text)]
    try {
      const res = await fetch('/api/agents/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(avoid)),
      })
      const data = (await res.json()) as ApiResult & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Could not generate suggestions.')
      if (requestId !== latestRequest.current) return
      const fresh: Candidate[] = [
        ...data.actions.map((a) => ({ id: crypto.randomUUID(), kind: 'action' as const, ...a })),
        ...data.starters.map((s) => ({
          id: crypto.randomUUID(),
          kind: 'starter' as const,
          agent: 'Context' as const,
          ...s,
        })),
      ].filter((c) => !keep.some((k) => k.text.toLowerCase() === c.text.toLowerCase()))
      setCandidates([...keep, ...fresh])
      log(6, `${name} drafted ${fresh.length} suggestions with the Context, Scribe, Organizer and Doer agents.`)
    } catch (e) {
      if (requestId !== latestRequest.current) return
      setError(e instanceof Error ? e.message : 'Could not generate suggestions.')
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }

  function openDialog() {
    setCandidates([])
    setCollapsed(new Set())
    setOpen(true)
    void generate([])
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) latestRequest.current++
    if (!next) setLoading(false)
  }

  function toggleKeep(c: Candidate, keep: boolean) {
    update((s) => ({
      ...s,
      suggestions: keep
        ? [{ ...c, savedAt: new Date().toISOString() }, ...s.suggestions]
        : s.suggestions.filter((x) => x.text.toLowerCase() !== c.text.toLowerCase()),
    }))
    if (keep) toast.success('Saved to suggestions', { description: `Find it under ${name}'s Suggestions.` })
  }

  function toggleSection(kind: SuggestionKind) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  const keptCount = candidates.filter(isKept).length

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={openDialog}
        disabled={!passiveCollection}
        aria-describedby={!passiveCollection ? 'suggestions-disabled-hint' : undefined}
        className={cn('h-auto min-h-9 justify-start whitespace-normal py-2 text-left', className)}
      >
        <Lightbulb className="size-4 shrink-0" aria-hidden />
        <span>{name}&apos;s Context Based Suggestions</span>
      </Button>
      {!passiveCollection && (
        <span id="suggestions-disabled-hint" className="sr-only">
          Turn on Passive collection to use context based suggestions.
        </span>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[85vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{name}&apos;s Context Based Suggestions</DialogTitle>
            <DialogDescription>
              Switch on the ones worth keeping. They&apos;ll be saved to {name}&apos;s Suggestions in your plan.
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-1 flex min-h-0 flex-col gap-3 overflow-y-auto px-1" aria-busy={loading}>
            {loading && candidates.length === 0 && (
              <div role="status" className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" aria-hidden />
                <p>{name} is checking with Context, Scribe, Organizer and Doer…</p>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive">
                {error}
              </p>
            )}

            {SECTIONS.map(({ kind, title, hint }) => {
              const items = candidates.filter((c) => c.kind === kind)
              if (items.length === 0) return null
              const isOpen = !collapsed.has(kind)
              const panelId = `suggestions-${kind}`
              return (
                <section key={kind} className="rounded-xl border">
                  <h3>
                    <button
                      type="button"
                      onClick={() => toggleSection(kind)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted"
                    >
                      <span>
                        <span className="block font-medium">
                          {title} <span className="text-muted-foreground">({items.length})</span>
                        </span>
                        <span className="block text-xs font-normal text-muted-foreground">{hint}</span>
                      </span>
                      <ChevronDown
                        className={cn('size-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
                        aria-hidden
                      />
                    </button>
                  </h3>
                  {isOpen && (
                    <ul id={panelId} className="flex flex-col divide-y border-t">
                      {items.map((c) => (
                        <li key={c.id} className="flex items-start justify-between gap-3 px-3 py-3">
                          <div className="min-w-0">
                            <p className="text-sm">{c.text}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {kind === 'action' && <span className="font-medium">{c.agent} · </span>}
                              {c.reason}
                            </p>
                          </div>
                          <Switch
                            checked={isKept(c)}
                            onCheckedChange={(on) => toggleKeep(c, on)}
                            aria-label={`Keep: ${c.text}`}
                            className="mt-0.5"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}

            {loading && candidates.length > 0 && (
              <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> Finding fresh ideas, your picks stay put…
              </p>
            )}
          </div>

          <DialogFooter className="sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">{keptCount} kept</span>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void generate(candidates.filter(isKept))}
              >
                <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden />
                Refresh suggestions
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
