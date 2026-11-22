'use client'

import { useMemo, useState } from 'react'
import { Mic, Pencil, Search, SortAsc, Trash2, User, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}
declare const webkitSpeechRecognition: new () => SpeechRecognitionInstance
declare const SpeechRecognition: new () => SpeechRecognitionInstance

type SortKey = 'date-desc' | 'date-asc' | 'location' | 'title'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'location', label: 'Location' },
  { value: 'title', label: 'Title' },
]

function applySort(list: OrphanNote[], sort: SortKey): OrphanNote[] {
  return [...list].sort((a, b) => {
    switch (sort) {
      case 'date-asc': return new Date(a.at).getTime() - new Date(b.at).getTime()
      case 'location': return (a.location ?? '').localeCompare(b.location ?? '')
      case 'title': return a.title.localeCompare(b.title)
      default: return new Date(b.at).getTime() - new Date(a.at).getTime()
    }
  })
}

// ── Assign to contact sheet ───────────────────────────────────────────────────
function AssignSheet({
  open,
  note,
  onClose,
  onAssign,
}: {
  open: boolean
  note: OrphanNote | null
  onClose: () => void
  onAssign: (contactId: string) => void
}) {
  const { state } = useStore()
  const [search, setSearch] = useState('')
  const filtered = state.contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { setSearch(''); onClose() } }}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-sm sm:border-l sm:border-t-0">
        <SheetHeader>
          <SheetTitle>Assign to contact</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-10 pt-4">
          <Input
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <ul className="flex max-h-80 flex-col divide-y overflow-y-auto rounded-xl border">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-muted-foreground">No contacts found</li>
            )}
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left hover:bg-accent"
                  onClick={() => { setSearch(''); onAssign(c.id) }}
                >
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{[c.headline, c.company].filter(Boolean).join(' · ')}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Note detail sheet ─────────────────────────────────────────────────────────
function NoteDetail({
  note,
  onClose,
  onSave,
  onDelete,
  onAssign,
}: {
  note: OrphanNote | null
  onClose: () => void
  onSave: (id: string, body: string, title: string) => void
  onDelete: (id: string) => void
  onAssign: (note: OrphanNote) => void
}) {
  const [editBody, setEditBody] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [recording, setRecording] = useState(false)
  const recRef = { current: null as SpeechRecognitionInstance | null }

  // sync local edits when note changes
  if (note && editBody === '' && editTitle === '') {
    setEditBody(note.body)
    setEditTitle(note.title)
  }

  function startVoice() {
    const SR =
      typeof SpeechRecognition !== 'undefined'
        ? SpeechRecognition
        : typeof webkitSpeechRecognition !== 'undefined'
          ? webkitSpeechRecognition
          : null
    if (!SR) { toast('Voice not supported in this browser.'); return }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.continuous = false
    recRef.current = rec
    rec.onresult = (e) => {
      const chunk = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(' ').trim()
      if (chunk) setEditBody((b) => b ? `${b} ${chunk}` : chunk)
    }
    rec.onerror = () => { toast.error('Microphone error.'); setRecording(false) }
    rec.onend = () => setRecording(false)
    rec.start()
    setRecording(true)
  }

  function stopVoice() {
    recRef.current?.stop()
    setRecording(false)
  }

  return (
    <Sheet open={!!note} onOpenChange={(o) => { if (!o) { setEditBody(''); setEditTitle(''); onClose() } }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit note</SheetTitle>
        </SheetHeader>
        {note && (
          <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <button
                  type="button"
                  onClick={recording ? stopVoice : startVoice}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    recording
                      ? 'border-red-500/40 bg-red-500/10 text-red-600 animate-pulse'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Mic className="size-3.5" aria-hidden />
                  {recording ? 'Stop recording' : 'Voice edit'}
                </button>
              </div>
              <Textarea rows={6} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => { onSave(note.id, editBody, editTitle); setEditBody(''); setEditTitle(''); onClose() }}
                disabled={!editBody.trim()}
              >
                Save changes
              </Button>
              <Button
                variant="outline"
                onClick={() => onAssign(note)}
              >
                <User className="size-4" aria-hidden /> Assign to contact
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => { onDelete(note.id); setEditBody(''); setEditTitle(''); onClose() }}
              >
                <Trash2 className="size-4" aria-hidden /> Delete
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NotesPage() {
  const { state, updateOrphanNote, deleteOrphanNote, addNoteEntry } = useStore()
  const orphans = state.orphanNotes ?? []

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('date-desc')
  const [selectedNote, setSelectedNote] = useState<OrphanNote | null>(null)
  const [assigningNote, setAssigningNote] = useState<OrphanNote | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const matched = orphans.filter((n) =>
      [n.title, n.body, n.location].join(' ').toLowerCase().includes(q),
    )
    return applySort(matched, sort)
  }, [orphans, query, sort])

  function handleSave(id: string, body: string, title: string) {
    updateOrphanNote(id, { body, title })
    toast.success('Note saved')
  }

  function handleDelete(id: string) {
    deleteOrphanNote(id)
    toast('Note deleted')
  }

  function handleAssign(contactId: string) {
    if (!assigningNote) return
    const entry: NoteEntry = {
      id: crypto.randomUUID(),
      at: assigningNote.at,
      location: assigningNote.location,
      body: assigningNote.body,
      photos: assigningNote.photos ?? [],
    }
    addNoteEntry(contactId, entry)
    deleteOrphanNote(assigningNote.id)
    const contact = state.contacts.find((c) => c.id === contactId)
    toast.success(`Note assigned to ${contact?.name ?? 'contact'}`)
    setAssigningNote(null)
  }

  return (
    <>
      <PageHeader title="Unassigned Notes" description="Notes not yet linked to a contact." />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Search by title, location, or content…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative flex items-center gap-2">
          <SortAsc className="size-4 text-muted-foreground" aria-hidden />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {orphans.length === 0 ? 'No unassigned notes yet. Capture a voice or manual note from the Today page.' : 'No notes match your search.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className="w-full rounded-2xl border bg-card p-4 text-left hover:bg-accent/40 transition-colors"
                onClick={() => setSelectedNote(n)}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.location && (
                    <span className="shrink-0 text-xs text-muted-foreground">{n.location}</span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                {(n.photos ?? []).length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">{n.photos.length} photo{n.photos.length !== 1 ? 's' : ''}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <NoteDetail
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        onAssign={(n) => { setSelectedNote(null); setAssigningNote(n) }}
      />

      <AssignSheet
        open={!!assigningNote}
        note={assigningNote}
        onClose={() => setAssigningNote(null)}
        onAssign={handleAssign}
      />
    </>
  )
}
