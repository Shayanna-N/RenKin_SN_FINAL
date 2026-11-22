'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/lib/store'
import { MODE_META } from '@/lib/agents'
import { cn } from '@/lib/utils'
import type { LinkKind, Mode, Profile } from '@/lib/types'

const MODES = Object.keys(MODE_META) as Mode[]
const KINDS: LinkKind[] = ['linkedin', 'website', 'portfolio', 'instagram', 'x', 'github', 'calendly', 'other']

function ModeChips({ value, onChange, label }: { value: Mode[]; onChange: (m: Mode[]) => void; label: string }) {
  return (
    <div role="group" aria-label={`Modes that share ${label}`} className="flex flex-wrap gap-1">
      {MODES.map((m) => {
        const on = value.includes(m)
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== m) : [...value, m])}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-medium',
              on ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground',
            )}
          >
            {MODE_META[m].label}
          </button>
        )
      })}
    </div>
  )
}

export function CardEditor({ embedded }: { embedded?: boolean }) {
  const { state, update } = useStore()
  const p = state.profile
  const [newUrl, setNewUrl] = useState('')
  const [newKind, setNewKind] = useState<LinkKind>('website')

  const set = (patch: Partial<Profile>) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } }))

  function addLink(e: React.FormEvent) {
    e.preventDefault()
    const url = newUrl.trim()
    if (!url) return
    set({
      links: [
        ...p.links,
        {
          id: crypto.randomUUID(),
          kind: newKind,
          label: newKind[0].toUpperCase() + newKind.slice(1),
          url: url.startsWith('http') ? url : `https://${url}`,
          modes: [state.settings.mode],
        },
      ],
    })
    setNewUrl('')
  }

  const inner = (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="editor-heading" className="font-semibold">
            Card details
          </h2>
          <p className="text-sm text-muted-foreground">Choose which modes share each field.</p>
        </div>
        <div className="grid gap-1.5 sm:w-1/2 sm:max-w-sm">
          <Label htmlFor="qr-url">QR code link</Label>
          <Input
            id="qr-url"
            type="url"
            inputMode="url"
            placeholder="https://yoursite.com"
            value={state.settings.customQrUrl ?? ''}
            onChange={(e) =>
              update((s) => ({ ...s, settings: { ...s.settings, customQrUrl: e.target.value } }))
            }
            aria-describedby="qr-url-hint"
          />
          <p id="qr-url-hint" className="text-xs text-muted-foreground">
            Your card&apos;s QR updates automatically.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={p.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="headline">Title</Label>
          <Input id="headline" value={p.headline} onChange={(e) => set({ headline: e.target.value })} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="company">Company</Label>
          <Input id="company" value={p.company} onChange={(e) => set({ company: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={p.email} onChange={(e) => set({ email: e.target.value })} />
          <ModeChips label="email" value={p.share.email} onChange={(email) => set({ share: { ...p.share, email } })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" value={p.phone} onChange={(e) => set({ phone: e.target.value })} />
          <ModeChips label="phone" value={p.share.phone} onChange={(phone) => set({ share: { ...p.share, phone } })} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="bio">Short bio</Label>
          <Textarea id="bio" rows={2} value={p.bio} onChange={(e) => set({ bio: e.target.value })} />
        </div>
      </div>

      <h3 className="mt-6 text-sm font-medium">Links & social connections</h3>
      <ul className="mt-2 flex flex-col divide-y rounded-xl border">
        {p.links.map((l) => (
          <li key={l.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">{l.label}</p>
              <p className="truncate text-xs text-muted-foreground">{l.url}</p>
            </div>
            <div className="flex items-center gap-2">
              <ModeChips
                label={l.label}
                value={l.modes}
                onChange={(modes) => set({ links: p.links.map((x) => (x.id === l.id ? { ...x, modes } : x)) })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Remove ${l.label}`}
                onClick={() => set({ links: p.links.filter((x) => x.id !== l.id) })}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={addLink} className="mt-3 flex gap-2">
        <Select value={newKind} onValueChange={(v) => setNewKind(v as LinkKind)}>
          <SelectTrigger className="w-36" aria-label="Link type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k} className="capitalize">
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label htmlFor="new-url" className="sr-only">
          Link URL
        </label>
        <Input id="new-url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="yoursite.com" />
        <Button type="submit" variant="secondary" size="icon" aria-label="Add link">
          <Plus className="size-4" aria-hidden />
        </Button>
      </form>
    </>
  )

  return embedded ? (
    <div aria-labelledby="editor-heading">{inner}</div>
  ) : (
    <section aria-labelledby="editor-heading" className="rounded-2xl border bg-card p-5 md:p-6">{inner}</section>
  )
}
