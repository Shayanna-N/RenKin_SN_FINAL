'use client'

import { Check, Moon, Sun } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { StyledQr, normalizeQrUrl } from '@/components/styled-qr'
import { cn } from '@/lib/utils'
import { CARD_STYLES, readableOn } from '@/lib/companion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Settings } from '@/lib/types'

function useSaved() {
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flash = useCallback(() => {
    setSaved(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaved(false), 1800)
  }, [])
  return { saved, flash }
}

function SaveButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mt-5 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        saved
          ? 'bg-green-500/15 text-green-700 dark:text-green-400'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
      )}
    >
      {saved && <Check className="size-3.5" aria-hidden />}
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}

const QR_STYLE_OPTIONS: { value: Settings['customQrStyle']; label: string }[] = [
  { value: 'squares', label: 'Squares' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dots', label: 'Dots' },
]

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
  const { saved, flash } = useSaved()
  const qrUrl = normalizeQrUrl(s.customQrUrl ?? '')

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
        <legend className="text-sm font-medium">QR code</legend>

        {/* URL input */}
        <div className="mt-2 flex flex-col gap-1.5">
          <Label htmlFor="qr-url" className="text-xs text-muted-foreground">Link URL</Label>
          <Input
            id="qr-url"
            type="url"
            value={s.customQrUrl ?? ''}
            onChange={(e) => set({ customQrUrl: e.target.value })}
            placeholder="https://yoursite.com"
          />
          {!s.customQrUrl && (
            <p className="text-xs text-muted-foreground">Enter a URL to enable the QR code on your card.</p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {/* Shape */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Shape</span>
            <div className="flex gap-2">
              {QR_STYLE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={s.customQrStyle === o.value}
                  onClick={() => set({ customQrStyle: o.value })}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    s.customQrStyle === o.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Color</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={!s.customQrColor}
                onClick={() => set({ customQrColor: '' })}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  !s.customQrColor
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Auto
              </button>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="color"
                  value={s.customQrColor || readableOn(s.brand)}
                  onChange={(e) => set({ customQrColor: e.target.value })}
                  className={cn(
                    'size-9 cursor-pointer rounded-full border bg-transparent',
                    s.customQrColor && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
                  )}
                  aria-label="Custom QR code color"
                />
                Custom
              </label>
            </div>
          </div>

          {qrUrl && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Preview</span>
              <div className={cn('rounded-lg p-2', `card-tex-${s.cardStyle}`)}>
                <StyledQr
                  value={qrUrl}
                  shape={s.customQrStyle}
                  color={s.customQrColor || 'currentColor'}
                  margin={0}
                  className="size-20"
                />
              </div>
            </div>
          )}
        </div>
      </fieldset>

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

      <SaveButton saved={saved} onClick={flash} />
    </section>
  )
}
