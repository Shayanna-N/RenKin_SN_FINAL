'use client'

import { Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'

export function CompanionMemoryList() {
  const { state, update } = useStore()

  if (state.memories.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Star a suggestion in the Suggestions tab on Today to keep it here.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {state.memories.map((m) => (
        <li key={m.id} className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="text-pretty">{m.text}</p>
            <p className="text-xs text-muted-foreground">
              {m.kind === 'starter' ? 'Conversation starter' : 'Action'} · {m.reason}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              update((s) => ({
                ...s,
                memories: s.memories.filter((x) => x.id !== m.id),
                suggestions: s.suggestions.map((x) =>
                  x.text.toLowerCase() === m.text.toLowerCase() ? { ...x, favorite: false } : x,
                ),
              }))
            }
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label={`Forget: ${m.text}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  )
}
