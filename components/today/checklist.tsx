'use client'

import { useState } from 'react'
import { Briefcase, CheckCircle2, Circle, ListTodo, Plus, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileAvatar } from '@/components/companion-avatar'
import { SuggestionsTab } from '@/components/today/suggestions-tab'
import { toPublicAvatar } from '@/lib/companion'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function Checklist() {
  const { state, update, log } = useStore()
  const [goal, setGoal] = useState('')

  function toggleTodo(id: string) {
    update((s) => ({
      ...s,
      todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }))
  }

  function addGoal(e: React.FormEvent) {
    e.preventDefault()
    const value = goal.trim()
    if (!value) return
    update((s) => ({ ...s, settings: { ...s.settings, goals: [...s.settings.goals, value] } }))
    log(1, `New goal recorded: "${value}".`)
    setGoal('')
  }

  function removeGoal(g: string) {
    update((s) => ({
      ...s,
      settings: { ...s.settings, goals: s.settings.goals.filter((x) => x !== g) },
    }))
  }

  const companion = state.settings.companion
  const companionName = companion.name.trim() || 'Companion'
  const metCompanies = new Set(state.contacts.map((c) => c.company.toLowerCase()))

  return (
    <section aria-labelledby="checklist-heading" className="rounded-2xl border bg-card p-5 md:p-6">
      <Tabs defaultValue="plan" className="gap-0">
        <div className="flex items-center gap-3">
          <ProfileAvatar
            avatar={toPublicAvatar(companion, state.settings.brand, state.settings.mode)}
            name={companionName}
            size="sm"
          />
          <div className="min-w-0">
            <h2 id="checklist-heading" className="font-semibold">
              Your plan for today
            </h2>
            <p className="text-sm text-muted-foreground">Summarized from connected apps and your goals.</p>
          </div>
        </div>

        <TabsList variant="line" className="mt-4 h-9 w-full justify-center border-b pb-0">
          <TabsTrigger value="plan" className="flex-none px-3">
            Your plan
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="max-w-64 flex-none px-3">
            <span className="truncate">{companionName}&apos;s Suggestions</span>
            {state.suggestions.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                {state.suggestions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-5">
          <SuggestionsTab />
        </TabsContent>

        <TabsContent value="plan" className="mt-5">
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ListTodo className="size-3.5" aria-hidden /> To-dos
          </h3>
          <ul className="mt-2 flex flex-col">
            {state.todos.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggleTodo(t.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                  aria-pressed={t.done}
                >
                  {t.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className={cn('flex-1', t.done && 'text-muted-foreground line-through')}>{t.text}</span>
                  <span className="text-xs text-muted-foreground">{t.source}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Briefcase className="size-3.5" aria-hidden /> Areas to hit up · from your job search
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {state.jobs.map((j) => {
              const met = metCompanies.has(j.company.toLowerCase())
              return (
                <li key={j.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm">
                  <span>
                    <span className="font-medium">{j.company}</span>
                    <span className="text-muted-foreground"> · {j.role}</span>
                  </span>
                  {met ? <Badge>Met someone</Badge> : <Badge variant="outline">{j.source}</Badge>}
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <h3 className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Target className="size-3.5" aria-hidden /> Your goals
          </h3>
          <ul className="mt-2 flex flex-wrap justify-center gap-2">
            {state.settings.goals.map((g) => (
              <li key={g}>
                <button
                  type="button"
                  onClick={() => removeGoal(g)}
                  className="rounded-full border bg-background px-3 py-1 text-sm hover:border-destructive hover:text-destructive"
                  aria-label={`Remove goal: ${g}`}
                >
                  {g}
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addGoal} className="mt-3 flex gap-2">
            <label htmlFor="goal-input" className="sr-only">
              Add a goal
            </label>
            <Input
              id="goal-input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Find a co-founder"
            />
            <Button type="submit" variant="secondary" size="icon" aria-label="Add goal">
              <Plus className="size-4" aria-hidden />
            </Button>
          </form>
        </div>
      </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
