'use client'

import { useState } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore } from '@/lib/store'
import { MODE_META } from '@/lib/agents'
import { Checkbox } from '@/components/ui/checkbox'
import {
  MAX_DETAILS_WITH_HEADER,
  MODES,
  RECOMMENDED_MIN_DETAILS,
  cloneProfile,
  hasHeader,
  isHeaderOn,
  maxDetails,
  modeLabel,
  normalizeUrl,
  selectedDetailKeys,
  type HeaderField,
} from '@/lib/profile'
import type { LinkKind, Mode, Profile } from '@/lib/types'

const KINDS: LinkKind[] = ['linkedin', 'website', 'portfolio', 'instagram', 'x', 'github', 'calendly', 'phone', 'other']

const KIND_LABEL: Record<LinkKind, string> = {
  linkedin: 'LinkedIn',
  website: 'Website',
  portfolio: 'Portfolio',
  instagram: 'Instagram',
  x: 'X',
  github: 'GitHub',
  calendly: 'Calendly',
  phone: 'Phone',
  other: 'Other',
}

const VALUE_PLACEHOLDER: Partial<Record<LinkKind, string>> = {
  phone: '+1 (415) 555-0142',
  other: 'Link or detail',
}

type TextField = 'name' | 'headline' | 'company' | 'email' | 'phone' | 'bio' | 'qrUrl'

function linksSignature(p: Profile) {
  return p.links.map((l) => `${l.kind}|${l.label}|${normalizeUrl(l.url)}`).join('\n')
}

/** Small "Copy from" picker. Only offers modes whose value differs from the current one. */
function CopyFrom({
  idPrefix,
  label,
  options,
  onCopy,
}: {
  idPrefix: string
  label: string
  options: { mode: Mode; name: string }[]
  onCopy: (mode: Mode) => void
}) {
  if (options.length === 0) return null
  return (
    <Select value="" onValueChange={(v) => onCopy(v as Mode)}>
      <SelectTrigger
        id={`${idPrefix}-copy`}
        size="sm"
        aria-label={`Copy ${label} from another mode`}
        className="h-6 w-auto gap-1 border-0 bg-transparent px-1.5 text-[11px] text-muted-foreground shadow-none hover:text-foreground"
      >
        <Copy className="size-3" aria-hidden />
        <SelectValue placeholder="Copy from" />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((o) => (
          <SelectItem key={o.mode} value={o.mode}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ModeForm({ mode }: { mode: Mode }) {
  const { state, update } = useStore()
  const p = state.profiles[mode]
  const [newUrl, setNewUrl] = useState('')
  const [newKind, setNewKind] = useState<LinkKind>('website')
  const [newLabel, setNewLabel] = useState('')

  const nameOf = (m: Mode) => modeLabel(m, state.settings.customModeName, MODE_META[m].label)
  const others = MODES.filter((m) => m !== mode)

  const set = (patch: Partial<Profile>) =>
    update((s) => ({ ...s, profiles: { ...s.profiles, [mode]: { ...s.profiles[mode], ...patch } } }))

  const selected = selectedDetailKeys(p)
  const max = maxDetails(p)
  const min = RECOMMENDED_MIN_DETAILS[mode]
  const full = selected.length >= max
  const statusId = `${mode}-lines-status`
  const customFieldCount = mode === 'custom' ? state.settings.customCardFields.length : 0
  // Turning on the first header field costs one line, so it needs a free slot.
  const headerBlocked = !hasHeader(p) && selected.length > MAX_DETAILS_WITH_HEADER

  const setHeaderField = (field: HeaderField, on: boolean) => {
    const hidden = (p.hiddenHeader ?? []).filter((f) => f !== field)
    set({ hiddenHeader: on ? hidden : [...hidden, field] })
  }

  const setDetail = (key: string, on: boolean) =>
    set({ shownDetails: on ? [...selected, key] : selected.filter((k) => k !== key) })

  const headerToggle = (field: HeaderField, noun: string) => {
    const blank = p[field].trim() === ''
    const on = isHeaderOn(p, field)
    const blocked = !on && headerBlocked
    return (
      <Checkbox
        checked={on}
        disabled={blank || blocked}
        onCheckedChange={(v) => setHeaderField(field, v === true)}
        aria-label={`Show ${noun} on card`}
        aria-describedby={statusId}
        title={blank ? 'Blank fields stay off the card' : blocked ? 'Turn off a detail line first' : undefined}
      />
    )
  }

  const detailToggle = (key: string, noun: string, hasValue: boolean) => {
    const on = selected.includes(key)
    return (
      <Checkbox
        checked={on}
        disabled={!hasValue || (!on && full)}
        onCheckedChange={(v) => setDetail(key, v === true)}
        aria-label={`Show ${noun} on card`}
        aria-describedby={statusId}
        title={!hasValue ? 'Blank fields stay off the card' : !on && full ? 'Card is full. Turn another line off first.' : undefined}
      />
    )
  }

  const differing = (field: TextField) =>
    others
      .filter((m) => (state.profiles[m][field] ?? '') !== (p[field] ?? ''))
      .map((m) => ({ mode: m, name: nameOf(m) }))

  const copyField = (field: TextField, from: Mode) => set({ [field]: state.profiles[from][field] ?? '' })

  const linkOptions = others
    .filter((m) => linksSignature(state.profiles[m]) !== linksSignature(p))
    .map((m) => ({ mode: m, name: nameOf(m) }))

  const allOptions = others
    .filter(
      (m) =>
        linksSignature(state.profiles[m]) !== linksSignature(p) ||
        (['name', 'headline', 'company', 'email', 'phone', 'bio', 'qrUrl'] as TextField[]).some(
          (f) => (state.profiles[m][f] ?? '') !== (p[f] ?? ''),
        ),
    )
    .map((m) => ({ mode: m, name: nameOf(m) }))

  function addLink(e: React.FormEvent) {
    e.preventDefault()
    const value = newUrl.trim()
    if (!value) return
    const isPhone = newKind === 'phone'
    const url = isPhone
      ? `tel:${value.replace(/^tel:/i, '')}`
      : /^(https?:|mailto:|tel:)/i.test(value)
        ? value
        : `https://${value}`
    const label = newKind === 'other' ? newLabel.trim() || KIND_LABEL.other : KIND_LABEL[newKind]
    const id = crypto.randomUUID()
    set({
      links: [...p.links, { id, kind: newKind, label, url }],
      shownDetails: full ? selected : [...selected, id],
    })
    setNewUrl('')
    setNewLabel('')
  }

  const fieldLabel = (field: TextField, text: string, toggle?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {toggle}
        <Label htmlFor={`${mode}-${field}`}>{text}</Label>
      </div>
      <CopyFrom
        idPrefix={`${mode}-${field}`}
        label={text.toLowerCase()}
        options={differing(field)}
        onCopy={(from) => copyField(field, from)}
      />
    </div>
  )

  return (
    <div>
      {mode === 'custom' && (
        <div className="mb-5 grid gap-1.5 rounded-xl bg-muted p-3 sm:max-w-xs">
          <Label htmlFor="custom-mode-name">Mode name</Label>
          <Input
            id="custom-mode-name"
            value={state.settings.customModeName}
            maxLength={20}
            placeholder="Custom"
            onChange={(e) =>
              update((s) => ({ ...s, settings: { ...s.settings, customModeName: e.target.value } }))
            }
            aria-describedby="custom-mode-name-hint"
          />
          <p id="custom-mode-name-hint" className="text-xs text-muted-foreground">
            Shown on your card and mode switcher. Leave blank for &ldquo;Custom&rdquo;.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          These details are only used in {nameOf(mode)} mode.
        </p>
        {allOptions.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Copy everything from</span>
            <Select
              value=""
              onValueChange={(v) =>
                update((s) => ({
                  ...s,
                  profiles: { ...s.profiles, [mode]: cloneProfile(s.profiles[v as Mode]) },
                }))
              }
            >
              <SelectTrigger size="sm" aria-label="Copy all details from another mode" className="h-7 w-32">
                <SelectValue placeholder="Choose mode" />
              </SelectTrigger>
              <SelectContent align="end">
                {allOptions.map((o) => (
                  <SelectItem key={o.mode} value={o.mode}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div id={statusId} aria-live="polite" className="mt-4 rounded-xl bg-muted p-3 text-xs">
        <p className="text-sm font-medium">
          {selected.length} of {max} detail lines on your card
        </p>
        <p
          className={
            selected.length < min ? 'mt-0.5 text-amber-700 dark:text-amber-400' : 'mt-0.5 text-muted-foreground'
          }
        >
          {selected.length < min
            ? `Recommended: at least ${min} for ${nameOf(mode)} mode. Tick a detail below to add one.`
            : full
              ? 'Card is full. Turn a line off to add another.'
              : `Room for ${max - selected.length} more.`}{' '}
          {hasHeader(p)
            ? 'Turn off name, title and company (or leave them blank) to fit a fifth line.'
            : 'Name, title and company are off, so a fifth line fits.'}
          {customFieldCount > 0 &&
            ` Your ${customFieldCount} custom field${customFieldCount === 1 ? '' : 's'} fill any lines left over.`}
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          {fieldLabel('name', 'Name', headerToggle('name', 'name'))}
          <Input id={`${mode}-name`} value={p.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          {fieldLabel('headline', 'Title', headerToggle('headline', 'title'))}
          <Input id={`${mode}-headline`} value={p.headline} onChange={(e) => set({ headline: e.target.value })} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          {fieldLabel('company', 'Company', headerToggle('company', 'company'))}
          <Input id={`${mode}-company`} value={p.company} onChange={(e) => set({ company: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          {fieldLabel('email', 'Email', detailToggle('email', 'email', p.email.trim() !== ''))}
          <Input id={`${mode}-email`} type="email" value={p.email} onChange={(e) => set({ email: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          {fieldLabel('phone', 'Phone', detailToggle('phone', 'phone', p.phone.trim() !== ''))}
          <Input id={`${mode}-phone`} type="tel" value={p.phone} onChange={(e) => set({ phone: e.target.value })} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          {fieldLabel('bio', 'Short bio')}
          <Textarea id={`${mode}-bio`} rows={2} value={p.bio} onChange={(e) => set({ bio: e.target.value })} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          {fieldLabel('qrUrl', 'QR code link')}
          <Input
            id={`${mode}-qrUrl`}
            type="url"
            inputMode="url"
            placeholder="https://yoursite.com"
            value={p.qrUrl ?? ''}
            onChange={(e) => set({ qrUrl: e.target.value })}
            aria-describedby={`${mode}-qrUrl-hint`}
          />
          <p id={`${mode}-qrUrl-hint`} className="text-xs text-muted-foreground">
            Your card&apos;s QR updates automatically.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Links & social connections</h3>
        <CopyFrom
          idPrefix={`${mode}-links`}
          label="links"
          options={linkOptions}
          onCopy={(from) => {
            const source = state.profiles[from]
            const sourceKeys = selectedDetailKeys(source)
            const links = source.links.map((l) => ({ ...l, id: crypto.randomUUID() }))
            const copiedKeys = links.filter((_, i) => sourceKeys.includes(source.links[i].id)).map((l) => l.id)
            const kept = selected.filter((k) => k === 'email' || k === 'phone')
            set({ links, shownDetails: [...kept, ...copiedKeys].slice(0, max) })
          }}
        />
      </div>
      <ul className="mt-2 flex flex-col divide-y rounded-xl border">
        {p.links.length === 0 && <li className="p-3 text-sm text-muted-foreground">No links yet.</li>}
        {p.links.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 p-3">
            <div className="flex min-w-0 items-center gap-3">
              {detailToggle(l.id, l.label, l.url !== '')}
              <div className="min-w-0">
                <p className="text-sm font-medium">{l.label}</p>
                <p className="truncate text-xs text-muted-foreground">{l.url}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={`Remove ${l.label}`}
              onClick={() => set({ links: p.links.filter((x) => x.id !== l.id) })}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <form onSubmit={addLink} className="mt-3 flex flex-wrap gap-2">
        <Select value={newKind} onValueChange={(v) => setNewKind(v as LinkKind)}>
          <SelectTrigger className="w-36 shrink-0" aria-label="Link type">
            <SelectValue>{KIND_LABEL[newKind]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {newKind === 'other' && (
          <>
            <label htmlFor={`${mode}-new-label`} className="sr-only">
              Custom name
            </label>
            <Input
              id={`${mode}-new-label`}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Name (e.g. Telegram)"
              maxLength={24}
              className="w-44 shrink-0"
            />
          </>
        )}
        <label htmlFor={`${mode}-new-url`} className="sr-only">
          {newKind === 'phone' ? 'Phone number' : 'Link URL'}
        </label>
        <Input
          id={`${mode}-new-url`}
          type={newKind === 'phone' ? 'tel' : 'text'}
          inputMode={newKind === 'phone' ? 'tel' : undefined}
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder={VALUE_PLACEHOLDER[newKind] ?? 'yoursite.com'}
          className="min-w-40 flex-1"
        />
        <Button type="submit" variant="secondary" size="icon" aria-label="Add link">
          <Plus className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  )
}

export function CardEditor({ embedded }: { embedded?: boolean }) {
  const { state, update } = useStore()
  const nameOf = (m: Mode) => modeLabel(m, state.settings.customModeName, MODE_META[m].label)

  const inner = (
    <>
      <h2 id="editor-heading" className="font-semibold">
        Card details
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">Each mode has its own details. Pick a tab to edit it.</p>
      <Tabs
        value={state.settings.mode}
        onValueChange={(v) => update((s) => ({ ...s, settings: { ...s.settings, mode: v as Mode } }))}
      >
        <TabsList className="w-full sm:w-auto">
          {MODES.map((m) => (
            <TabsTrigger key={m} value={m} className="flex-1 sm:flex-none">
              <span className="max-w-28 truncate">{nameOf(m)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {MODES.map((m) => (
          <TabsContent key={m} value={m} className="mt-4">
            <ModeForm mode={m} />
          </TabsContent>
        ))}
      </Tabs>
    </>
  )

  return embedded ? (
    <div aria-labelledby="editor-heading">{inner}</div>
  ) : (
    <section aria-labelledby="editor-heading" className="rounded-2xl border bg-card p-5 md:p-6">{inner}</section>
  )
}
