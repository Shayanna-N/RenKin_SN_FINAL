'use client'

import { useRef } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CompanionAvatar } from '@/components/companion-avatar'
import { Button } from '@/components/ui/button'
import { resizeToAvatar } from '@/lib/companion'
import { useStore } from '@/lib/store'

export function PhotoPicker() {
  const { state, update } = useStore()
  const companion = state.settings.companion
  const fileRef = useRef<HTMLInputElement>(null)

  const setPhoto = (photo: string | null) =>
    update((s) => ({
      ...s,
      settings: { ...s.settings, companion: { ...s.settings.companion, photo } },
    }))

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPhoto(await resizeToAvatar(file))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not use that image')
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <CompanionAvatar companion={companion} fallbackColor={state.settings.brand} mode={state.settings.mode} size="lg" />
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <p className="text-sm text-muted-foreground text-pretty text-center sm:text-left">
          {companion.photo
            ? 'This photo is what people see when they accept your card.'
            : `${companion.name} is your profile picture until you add a photo.`}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onFile} tabIndex={-1} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-4" aria-hidden />
            {companion.photo ? 'Change photo' : 'Add profile picture'}
          </Button>
          {companion.photo && (
            <Button variant="ghost" size="sm" onClick={() => setPhoto(null)}>
              <Trash2 className="size-4" aria-hidden />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
