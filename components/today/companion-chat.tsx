'use client'

import { useRef, useState } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { CompanionAvatar } from '@/components/companion-avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useOnline, useStore } from '@/lib/store'
import { activeEvent } from '@/lib/agents'
import { cn } from '@/lib/utils'
import type { ChatMessage, Mode, Priority } from '@/lib/types'

type Action =
  | { type: 'set_mode'; mode: Mode }
  | { type: 'add_goal'; goal: string }
  | { type: 'set_priorities'; priorities: Priority[] }
  | { type: 'learn_preference'; preference: string }

const SUGGESTIONS = [
  'Who should I follow up with first?',
  'Prioritize LinkedIn over email',
  'Switch me to casual mode',
]

export function CompanionChat() {
  const { state, update, setMode, log } = useStore()
  const online = useOnline()
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  function applyActions(actions: Action[]) {
    for (const a of actions) {
      if (a.type === 'set_mode') setMode(a.mode, 'asked Companion')
      if (a.type === 'add_goal') {
        update((s) => ({ ...s, settings: { ...s.settings, goals: [...s.settings.goals, a.goal] } }))
        log(1, `Goal added via Companion: "${a.goal}".`)
      }
      if (a.type === 'set_priorities') {
        update((s) => ({ ...s, settings: { ...s.settings, priorities: a.priorities } }))
        log(4, `Re-sorted contacts by ${a.priorities.join(' > ')}.`)
      }
      if (a.type === 'learn_preference') {
        update((s) => ({
          ...s,
          settings: {
            ...s.settings,
            learnedPreferences: [...s.settings.learnedPreferences, a.preference],
          },
        }))
        log(1, `Learned preference: "${a.preference}".`)
      }
    }
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || pending) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content }
    const history = [...state.chat, userMsg]
    update((s) => ({ ...s, chat: history }))
    setInput('')
    setPending(true)
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }))

    let reply = ''
    try {
      if (!online) throw new Error('offline')
      const res = await fetch('/api/agents/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.slice(-20).map(({ role, content }) => ({ role, content })),
          snapshot: {
            name: state.profile.name,
            mode: state.settings.mode,
            activeEvent: activeEvent(state.events)?.title ?? null,
            priorities: state.settings.priorities,
            goals: state.settings.goals,
            contacts: state.contacts.slice(0, 25).map((c) => ({
              name: c.name,
              company: c.company,
              context: c.why.context,
              followedUp: c.followedUp,
              what: c.what,
            })),
            todos: state.todos.filter((t) => !t.done).map((t) => t.text),
            jobs: state.jobs.map((j) => `${j.role} at ${j.company}`),
          },
        }),
      })
      if (!res.ok) throw new Error('failed')
      const data = (await res.json()) as { reply: string; actions: Action[] }
      reply = data.reply
      applyActions(data.actions)
    } catch (e) {
      reply =
        e instanceof Error && e.message === 'offline'
          ? "I'm offline right now, but the Offline agent is still saving every card you read. I'll catch up when you reconnect."
          : 'Something went wrong reaching me. Please try again.'
    } finally {
      setPending(false)
    }
    update((s) => ({
      ...s,
      chat: [...s.chat, { id: crypto.randomUUID(), role: 'assistant', content: reply }],
    }))
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }))
  }

  return (
    <section aria-labelledby="companion-heading" className="flex h-[32rem] flex-col rounded-2xl border bg-card">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <CompanionAvatar companion={state.settings.companion} fallbackColor={state.settings.brand} mode={state.settings.mode} size="sm" />
        <div>
          <h2 id="companion-heading" className="text-sm font-semibold">
            {state.settings.companion.name || 'Companion'}
          </h2>
          <p className="text-xs text-muted-foreground">Ask, or tell me what to change</p>
        </div>
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {state.chat.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm text-pretty',
              m.role === 'user' ? 'self-end bg-primary text-primary-foreground' : 'self-start bg-muted',
            )}
          >
            {m.content}
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 self-start rounded-2xl bg-muted px-3.5 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> Thinking
          </div>
        )}
      </div>

      <div className="border-t p-3">
        {state.chat.length <= 2 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-end gap-2"
        >
          <label htmlFor="companion-input" className="sr-only">
            Message Companion
          </label>
          <Textarea
            id="companion-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return
                e.preventDefault()
                send(input)
              }
            }}
            rows={1}
            placeholder="Message Companion"
            className="max-h-32 min-h-10 resize-none"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || pending} aria-label="Send">
            <ArrowUp className="size-4" aria-hidden />
          </Button>
        </form>
      </div>
    </section>
  )
}
