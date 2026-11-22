'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, Copy, ListPlus, MessageCircle, Sparkles, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/lib/store'
import type { Suggestion, SuggestionKind } from '@/lib/types'
import { cn } from '@/lib/utils'

// Conversation starters sit above the actions, separated by a horizontal bar.
const GROUPS: { kind: SuggestionKind; title: string; icon: typeof Sparkles }[] = [
  { kind: 'starter', title: 'Conversation starters', icon: MessageCircle },
  { kind: 'action', title: 'Suggested actions', icon: Sparkles },
]

export function SuggestionsTab() {
  const { state, update, log } = useStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const name = state.settings.companion.name.trim() || 'Your companion'
  const favoriteCount = state.suggestions.filter((s) => s.favorite).length

  function remove(id: string) {
    update((s) => ({ ...s, suggestions: s.suggestions.filter((x) => x.id !== id) }))
    setExpandedId(null)
  }

  function toggleFavorite(s: Suggestion) {
    const next = !s.favorite
    update((prev) => ({
      ...prev,
      suggestions: prev.suggestions.map((x) => (x.id === s.id ? { ...x, favorite: next } : x)),
      memories: next
        ? prev.memories.some((m) => m.text.toLowerCase() === s.text.toLowerCase())
          ? prev.memories
          : [
              {
                id: crypto.randomUUID(),
                kind: s.kind,
                text: s.text,
                reason: s.reason,
                savedAt: new Date().toISOString(),
              },
              ...prev.memories,
            ]
        : prev.memories.filter((m) => m.text.toLowerCase() !== s.text.toLowerCase()),
    }))
    if (next) {
      log(6, `${name} added a favorite to its memories.`)
      toast.success(`Saved to ${name}'s memories`)
    } else {
      toast(`Removed from ${name}'s memories`)
    }
  }

  async function copy(s: Suggestion) {
    try {
      await navigator.clipboard.writeText(s.text)
      toast.success('Copied')
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.')
    }
  }

  function add(s: Suggestion) {
    const text = s.kind === 'starter' ? `Start a conversation: ${s.text}` : s.text
    update((prev) => ({
      ...prev,
      todos: [{ id: crypto.randomUUID(), text, done: false, source: name }, ...prev.todos],
      suggestions: prev.suggestions.filter((x) => x.id !== s.id),
    }))
    log(6, `${name} moved a suggestion into your to-dos.`)
    toast.success('Added to your to-dos')
    setExpandedId(null)
  }

  function deleteAll() {
    update((prev) => ({ ...prev, suggestions: [] }))
    setDeleteOpen(false)
    setExpandedId(null)
    toast('Cleared all suggestions', { description: 'Starred ones stay in memories.' })
  }

  function deleteUnfavorited() {
    update((prev) => ({ ...prev, suggestions: prev.suggestions.filter((s) => s.favorite) }))
    setDeleteOpen(false)
    setExpandedId(null)
    toast('Cleared unfavorited suggestions')
  }

  if (state.suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
        <Sparkles className="size-5 text-muted-foreground" aria-hidden />
        <p className="font-medium">Nothing kept yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Use {name}&apos;s Context Based Suggestions on the Context card and switch on the ones you want to keep.
        </p>
      </div>
    )
  }

  const visibleGroups = GROUPS.map((g) => ({ ...g, items: state.suggestions.filter((s) => s.kind === g.kind) })).filter(
    (g) => g.items.length > 0,
  )

  return (
    <div className="flex flex-col gap-4">
      {visibleGroups.map(({ kind, title, icon: Icon, items }, index) => (
        <Fragment key={kind}>
          {index > 0 && <Separator />}
          <div>
            <h3 className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Icon className="size-3.5" aria-hidden /> {title}
            </h3>
            <ul className="mt-2 flex flex-col">
              {items.map((s) => {
                const expanded = expandedId === s.id
                return (
                  <li key={s.id} className={cn('rounded-lg', expanded && 'bg-muted')}>
                    <div className="flex items-start gap-1">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : s.id)}
                        aria-expanded={expanded}
                        className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span>{s.text}</span>
                        <span className="text-xs text-muted-foreground">
                          {kind === 'action' ? `${s.agent} · ` : ''}
                          {s.reason}
                        </span>
                      </button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleFavorite(s)}
                        aria-pressed={!!s.favorite}
                        aria-label={s.favorite ? `Remove from ${name}'s memories` : `Favorite and save to ${name}'s memories`}
                        className="mt-0.5 shrink-0"
                      >
                        <Star
                          className={cn('size-4', s.favorite ? 'fill-primary text-primary' : 'text-muted-foreground')}
                          aria-hidden
                        />
                      </Button>
                    </div>
                    {expanded && (
                      <div className="flex flex-wrap justify-center gap-2 px-2 pb-2 pt-1">
                        <Button type="button" size="sm" onClick={() => add(s)}>
                          <ListPlus className="size-4" aria-hidden /> Add
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => void copy(s)}>
                          <Copy className="size-4" aria-hidden /> Copy
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => remove(s.id)}>
                          <X className="size-4" aria-hidden /> Delete
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </Fragment>
      ))}

      <div className="relative flex justify-end pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setDeleteOpen((v) => !v)}
          aria-expanded={deleteOpen}
          aria-controls="suggestions-delete-menu"
        >
          <Trash2 className="size-4" aria-hidden /> Delete
          <ChevronDown className={cn('size-3.5 transition-transform', deleteOpen && 'rotate-180')} aria-hidden />
        </Button>
        {deleteOpen && (
          <div
            id="suggestions-delete-menu"
            className="absolute bottom-full right-0 z-10 mb-2 flex w-56 flex-col gap-1 rounded-xl border bg-popover p-1 shadow-md"
          >
            <Button type="button" size="sm" variant="ghost" className="justify-start" onClick={deleteAll}>
              Delete all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="justify-start"
              onClick={deleteUnfavorited}
              disabled={favoriteCount === state.suggestions.length}
            >
              Delete unfavorited
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
