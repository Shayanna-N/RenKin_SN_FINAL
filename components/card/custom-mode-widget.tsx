'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MAX_FIELDS = 5
const MAX_NAME_LEN = 10

export function CustomModeWidget() {
  const { state, update } = useStore()
  const { customModeName, customCardFields, customQrUrl } = state.settings
  const [fieldDraft, setFieldDraft] = useState('')

  function setCustomModeName(name: string) {
    update((s) => ({
      ...s,
      settings: { ...s.settings, customModeName: name.slice(0, MAX_NAME_LEN) },
    }))
  }

  function setCustomQrUrl(url: string) {
    update((s) => ({ ...s, settings: { ...s.settings, customQrUrl: url } }))
  }

  function addField() {
    const trimmed = fieldDraft.trim()
    if (!trimmed || customCardFields.length >= MAX_FIELDS) return
    update((s) => ({
      ...s,
      settings: { ...s.settings, customCardFields: [...s.settings.customCardFields, trimmed] },
    }))
    setFieldDraft('')
  }

  function removeField(index: number) {
    update((s) => ({
      ...s,
      settings: {
        ...s.settings,
        customCardFields: s.settings.customCardFields.filter((_, i) => i !== index),
      },
    }))
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Custom mode name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="custom-mode-name">
          Custom mode name
          <span className="ml-1.5 text-xs text-muted-foreground">({customModeName.length}/{MAX_NAME_LEN})</span>
        </Label>
        <Input
          id="custom-mode-name"
          value={customModeName}
          maxLength={MAX_NAME_LEN}
          placeholder="Custom"
          onChange={(e) => setCustomModeName(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Shown in the mode bar everywhere in the app.
        </p>
      </div>

      {/* Custom card fields */}
      <div className="flex flex-col gap-1.5">
        <Label>
          Extra card fields
          <span className="ml-1.5 text-xs text-muted-foreground">({customCardFields.length}/{MAX_FIELDS})</span>
        </Label>
        <div className="flex flex-col gap-2">
          {customCardFields.map((field, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 rounded-md border bg-muted px-3 py-1.5 text-sm">{field}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => removeField(i)}
                aria-label={`Remove ${field}`}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
          {customCardFields.length < MAX_FIELDS && (
            <div className="flex gap-2">
              <Input
                value={fieldDraft}
                placeholder="e.g. Pronouns, Portfolio, Discord…"
                onChange={(e) => setFieldDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addField()}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addField} disabled={!fieldDraft.trim()}>
                <Plus className="size-3.5 mr-1" />
                Add
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Up to {MAX_FIELDS} extra fields shown on your card in Custom mode.
        </p>
      </div>

      {/* QR code URL */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="custom-qr-url">QR code link</Label>
        <Input
          id="custom-qr-url"
          type="url"
          value={customQrUrl}
          placeholder="https://yoursite.com"
          onChange={(e) => setCustomQrUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          The QR code on your card always reflects this URL — update it any time without generating a new code.
        </p>
      </div>
    </div>
  )
}
