'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { Settings } from '@/lib/types'

const MAX_FIELDS = 5
const MAX_NAME_LEN = 10

const QR_STYLES: { value: Settings['customQrStyle']; label: string }[] = [
  { value: 'squares', label: 'Squares' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dots', label: 'Dots' },
]

export function CustomModeWidget() {
  const { state, update } = useStore()
  const { customModeName, customCardFields, customQrUrl, customQrStyle } = state.settings
  const [labelDraft, setLabelDraft] = useState('')
  const [valueDraft, setValueDraft] = useState('')

  function setCustomModeName(name: string) {
    update((s) => ({
      ...s,
      settings: { ...s.settings, customModeName: name.slice(0, MAX_NAME_LEN) },
    }))
  }

  function setCustomQrUrl(url: string) {
    update((s) => ({ ...s, settings: { ...s.settings, customQrUrl: url } }))
  }

  function setCustomQrStyle(style: Settings['customQrStyle']) {
    update((s) => ({ ...s, settings: { ...s.settings, customQrStyle: style } }))
  }

  function addField() {
    const label = labelDraft.trim()
    const value = valueDraft.trim()
    if (!label || customCardFields.length >= MAX_FIELDS) return
    update((s) => ({
      ...s,
      settings: {
        ...s.settings,
        customCardFields: [...s.settings.customCardFields, { label, value }],
      },
    }))
    setLabelDraft('')
    setValueDraft('')
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

  const sharedContent = (
    <div className="flex flex-col gap-5">
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
          Update this URL any time — the QR on your card updates automatically.
        </p>
      </div>

      {/* QR style */}
      <div className="flex flex-col gap-1.5">
        <Label>QR code style</Label>
        <div className="flex gap-2">
          {QR_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setCustomQrStyle(s.value)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                customQrStyle === s.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const customContent = (
    <div className="flex flex-col gap-5">
      {/* Custom mode name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="custom-mode-name">
          Mode name
          <span className="ml-1.5 text-xs text-muted-foreground">
            ({customModeName.length}/{MAX_NAME_LEN})
          </span>
        </Label>
        <Input
          id="custom-mode-name"
          value={customModeName}
          maxLength={MAX_NAME_LEN}
          placeholder="Custom"
          onChange={(e) => setCustomModeName(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">Shown in the mode bar everywhere in the app.</p>
      </div>

      {/* Extra card fields */}
      <div className="flex flex-col gap-1.5">
        <Label>
          Extra card fields
          <span className="ml-1.5 text-xs text-muted-foreground">
            ({customCardFields.length}/{MAX_FIELDS})
          </span>
        </Label>
        <div className="flex flex-col gap-2">
          {customCardFields.map((field, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-24 shrink-0 rounded-md border bg-muted px-2.5 py-1.5 text-sm font-medium">
                {field.label}
              </span>
              <span className="flex-1 rounded-md border bg-muted px-2.5 py-1.5 text-sm text-muted-foreground">
                {field.value || <em className="opacity-50">no value</em>}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => removeField(i)}
                aria-label={`Remove ${field.label}`}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
          {customCardFields.length < MAX_FIELDS && (
            <div className="flex gap-2">
              <Input
                value={labelDraft}
                placeholder="Label (e.g. Pronouns)"
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addField()}
                className="w-28 shrink-0"
              />
              <Input
                value={valueDraft}
                placeholder="Value (e.g. She/her)"
                onChange={(e) => setValueDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addField()}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={addField}
                disabled={!labelDraft.trim()}
              >
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

      {sharedContent}
    </div>
  )

  return (
    <Tabs defaultValue="custom">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="everyday" className="flex-1 sm:flex-none">Everyday</TabsTrigger>
        <TabsTrigger value="event" className="flex-1 sm:flex-none">Event</TabsTrigger>
        <TabsTrigger value="custom" className="flex-1 sm:flex-none">
          {customModeName || 'Custom'}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="everyday" className="pt-4">
        {sharedContent}
      </TabsContent>
      <TabsContent value="event" className="pt-4">
        {sharedContent}
      </TabsContent>
      <TabsContent value="custom" className="pt-4">
        {customContent}
      </TabsContent>
    </Tabs>
  )
}
