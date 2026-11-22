'use client'

import { useState } from 'react'
import { Copy, ListPlus, MessageCircle, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import type { Suggestion, SuggestionKind } from '@/lib/types'
import { cn } from '@/lib/utils'

const GROUPS: { kind: SuggestionKind; title: string; icon: typeof Sparkles }[] = [
  { kind: 'action', title: 'Suggested actions', icon: Sparkles },
  { kind: 'starter', title: 'Conversation starters', icon: MessageCircle },
]

export function SuggestionsTab() {
  const { state, update, log } = useStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const name = state.settings.companion.name.trim() || 'Your companion'

  function remove(id: string) {
    update((s) => ({ ...s, suggestions: s.suggestions.filter((x) => x.id !== id) }))
    setExpandedId(null)
  }

  async function copy(s: Suggestion) {
    try {
      await navigator.clipboard.writeText(s.text)
      toast.success('Copied')
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.')
    }
  }

  function act(s: Suggestion) {
    update((prev) => ({
      ...prev,
      todos: [{ id: crypto.randomUUID(), text: s.text, done: false, source: name }, ...prev.todos],
      suggestions: prev.suggestions.filter((x) => x.id !== s.id),
    }))
    log(6, `${name} moved a suggestion into your to-dos.`)
    toast.success('Added to your to-dos')
    setExpandedId(null)
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

  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map(({ kind, title, icon: Icon }) => {
        const items = state.suggestions.filter((s) => s.kind === kind)
        if (items.length === 0) return null
        return (
          <div key={kind}>
            <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Icon className="size-3.5" aria-hidden /> {title}
            </h3>
            <ul className="mt-2 flex flex-col">
              {items.map((s) => {
                const expanded = expandedId === s.id
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : s.id)}
                      aria-expanded={expanded}
                      className={cn(
                        'flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted',
                        expanded && 'bg-muted',
                      )}
                    >
                      <span>{s.text}</span>
                      <span className="text-xs text-muted-foreground">
                        {kind === 'action' ? `${s.agent} · ` : ''}
                        {s.reason}
                      </span>
                    </button>
                    {expanded && (
                      <div className="flex flex-wrap gap-2 px-2 pb-2 pt-1">
                        {kind === 'action' && (
                          <Button type="button" size="sm" onClick={() => act(s)}>
                            <ListPlus className="size-4" aria-hidden /> Act
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="secondary" onClick={() => void copy(s)}>
                          <Copy className="size-4" aria-hidden /> Copy
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => remove(s.id)}>
                          <X className="size-4" aria-hidden /> Dismiss
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
