'use client'

import { Check, Moon, Sun } from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { CARD_STYLES, readableOn } from '@/lib/companion'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Settings } from '@/lib/types'

const SWATCHES = [
  { name: 'Teal', value: '#0f766e' },
  { name: 'Cobalt', value: '#1d4ed8' },
  { name: 'Violet', value: '#6d28d9' },
  { name: 'Rose', value: '#be123c' },
  { name: 'Amber', value: '#b45309' },
  { name: 'Ink', value: '#27272a' },
]


export function Appearance() {
  const { state, update } = useStore()
  const s = state.settings
  const set = (patch: Partial<Settings>) => update((st) => ({ ...st, settings: { ...st.settings, ...patch } }))

  return (
    <section aria-labelledby="appearance-heading" className="rounded-2xl border bg-card p-5 md:p-6">
      <h2 id="appearance-heading" className="font-semibold">
        Appearance
      </h2>
      <p className="text-sm text-muted-foreground">Applies to your card and the whole app.</p>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Color</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {SWATCHES.map((sw) => (
            <button
              key={sw.value}
              type="button"
              onClick={() => set({ brand: sw.value })}
              aria-label={sw.name}
              aria-pressed={s.brand === sw.value}
              className="flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-card aria-pressed:ring-2 aria-pressed:ring-foreground"
              style={{ backgroundColor: sw.value }}
            >
              {s.brand === sw.value && <Check className="size-4" style={{ color: readableOn(sw.value) }} aria-hidden />}
            </button>
          ))}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="color"
              value={s.brand}
              onChange={(e) => set({ brand: e.target.value })}
              className="size-9 cursor-pointer rounded-full border bg-transparent"
              aria-label="Custom color"
            />
            Custom
          </label>
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Card texture</legend>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {CARD_STYLES.map((st) => (
            <button
              key={st.id}
              type="button"
              aria-pressed={s.cardStyle === st.id}
              onClick={() => set({ cardStyle: st.id })}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border p-1.5 text-xs',
                s.cardStyle === st.id && 'border-primary bg-primary/10 font-medium text-primary',
              )}
            >
              <span className={cn('h-7 w-full rounded-md', `card-tex-${st.id}`)} aria-hidden />
              {st.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-muted p-3">
        <div>
          <Label htmlFor="match-ui">Match app to card</Label>
          <p className="text-xs text-muted-foreground">Tints light and dark mode with your card color.</p>
        </div>
        <Switch id="match-ui" checked={s.matchUiToCard} onCheckedChange={(v) => set({ matchUiToCard: v })} />
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Theme</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={s.theme === t}
              onClick={() => set({ theme: t })}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize',
                s.theme === t && 'border-primary bg-primary/10 font-medium text-primary',
              )}
            >
              {t === 'light' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
              {t}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  )
}
