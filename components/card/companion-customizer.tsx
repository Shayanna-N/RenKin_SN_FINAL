'use client'

import { useRef, useState } from 'react'
import { ImagePlus, RotateCcw, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ANIMALS, BADGES, MAX_BADGES, resizeToAvatar, toggleBadge } from '@/lib/companion'
import { MODE_META } from '@/lib/agents'
import { AnimalSilhouette, CompanionAvatar } from '@/components/companion-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { CompanionConfig, Mode } from '@/lib/types'

const MODES = Object.keys(MODE_META) as Mode[]

export function CompanionCustomizer({ embedded }: { embedded?: boolean }) {
  const { state, update } = useStore()
  const c = state.settings.companion
  const brand = state.settings.brand
  const [badgeMode, setBadgeMode] = useState<Mode>(state.settings.mode)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (patch: Partial<CompanionConfig>) =>
    update((s) => ({
      ...s,
      settings: { ...s.settings, companion: { ...s.settings.companion, ...patch } },
    }))

  const selected = c.badges[badgeMode] ?? []
  const traits = ANIMALS.find((a) => a.id === c.animal)?.trait

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      set({ photo: await resizeToAvatar(file) })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not use that image')
    }
  }

  const inner = (
    <>
      <div className="flex items-start gap-4">
        <CompanionAvatar companion={c} fallbackColor={brand} mode={badgeMode} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 id="companion-heading" className="font-semibold">
            Companion &amp; Profile Customization
          </h2>
          <p className="text-sm text-muted-foreground text-pretty">
            Your companion doubles as your profile picture until you add a photo. It&apos;s what people see when they
            accept your card.
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            <Label htmlFor="companion-name">Companion name</Label>
            <Input
              id="companion-name"
              value={c.name}
              maxLength={20}
              onChange={(e) => set({ name: e.target.value })}
              className="max-w-48"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPhoto} tabIndex={-1} />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-4" aria-hidden />
          {c.photo ? 'Change photo' : 'Upload photo'}
        </Button>
        {c.photo && (
          <Button variant="ghost" size="sm" onClick={() => set({ photo: null })}>
            <Trash2 className="size-4" aria-hidden />
            Use companion instead
          </Button>
        )}
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium">Animal</legend>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {ANIMALS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={c.animal === a.id}
              onClick={() => set({ animal: a.id })}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition-colors hover:bg-accent',
                c.animal === a.id && 'border-primary bg-primary/10 font-medium text-primary',
              )}
            >
              <AnimalSilhouette animal={a.id} className="size-9" />
              {a.label}
            </button>
          ))}
        </div>
        {traits && <p className="mt-2 text-xs text-muted-foreground">{traits}</p>}
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium">Color</legend>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={c.color === null}
            onClick={() => set({ color: null })}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
              c.color === null && 'border-primary bg-primary/10 font-medium text-primary',
            )}
          >
            <span className="size-4 rounded-full" style={{ backgroundColor: brand }} aria-hidden />
            Match card
          </button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="color"
              value={c.color ?? brand}
              onChange={(e) => set({ color: e.target.value })}
              className="size-8 cursor-pointer rounded-full border bg-transparent"
              aria-label="Custom companion color"
            />
            Custom
          </label>
          {c.color !== null && (
            <button
              type="button"
              onClick={() => set({ color: null })}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" aria-hidden />
              Reset
            </button>
          )}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <legend className="text-sm font-medium">Interest badges</legend>
            <p className="text-xs text-muted-foreground text-pretty">
              Icons around your picture that hint at your interests — no text is shown to others. Pick up to{' '}
              {MAX_BADGES} per mode.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="badges-visible" className="text-xs">
              Show
            </Label>
            <Switch id="badges-visible" checked={c.badgesVisible} onCheckedChange={(v) => set({ badgesVisible: v })} />
          </div>
        </div>

        <div role="tablist" aria-label="Badge set for mode" className="mt-3 flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={badgeMode === m}
              onClick={() => setBadgeMode(m)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent',
                badgeMode === m && 'border-primary bg-primary text-primary-foreground hover:bg-primary',
              )}
            >
              {MODE_META[m].label}
              <span className="ml-1 opacity-70">{(c.badges[m] ?? []).length}</span>
            </button>
          ))}
        </div>

        <div className={cn('mt-3 flex flex-wrap gap-1.5', !c.badgesVisible && 'opacity-50')}>
          {BADGES.map((b) => {
            const on = selected.includes(b.id)
            const full = !on && selected.length >= MAX_BADGES
            const Icon = b.icon
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={on}
                disabled={full}
                onClick={() =>
                  set({ badges: { ...c.badges, [badgeMode]: toggleBadge(selected, b.id) } as CompanionConfig['badges'] })
                }
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40',
                  on && 'border-primary bg-primary/10 font-medium text-primary',
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {b.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {selected.length}/{MAX_BADGES} selected for {MODE_META[badgeMode].label}. Shown automatically when you switch
          to that mode.
        </p>
      </fieldset>

      <section aria-labelledby="companion-memories-heading" className="mt-6">
        <h3 id="companion-memories-heading" className="flex items-center gap-2 text-sm font-medium">
          <Star className="size-4 text-primary" aria-hidden /> {c.name.trim() || 'Companion'}&apos;s memories
        </h3>
        {state.memories.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Star a suggestion in your companion&apos;s Suggestions tab to keep it here.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {state.memories.map((m) => (
              <li key={m.id} className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p>{m.text}</p>
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
        )}
      </section>

      <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-muted p-3">
        <div>
          <Label htmlFor="show-on-card">Show silhouette on card</Label>
          <p className="text-xs text-muted-foreground">Places a small {c.animal} in the top-right corner.</p>
        </div>
        <Switch id="show-on-card" checked={c.showOnCard} onCheckedChange={(v) => set({ showOnCard: v })} />
      </div>
    </>
  )

  return embedded ? (
    <div aria-labelledby="companion-heading">{inner}</div>
  ) : (
    <section aria-labelledby="companion-heading" className="rounded-2xl border bg-card p-5 md:p-6">{inner}</section>
  )
}
