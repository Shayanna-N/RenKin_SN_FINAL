'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PhotoPicker } from '@/components/account/photo-picker'
import { SyncControls } from '@/components/account/sync-controls'

export function WelcomeSetup({
  open,
  onOpenChange,
  name,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome, {name.split(' ')[0] || 'there'}</DialogTitle>
          <DialogDescription>Two quick things to set up. You can change both later on this page.</DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-3" aria-labelledby="welcome-photo">
          <h3 id="welcome-photo" className="text-sm font-semibold">
            1. Add a profile picture
          </h3>
          <PhotoPicker />
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="welcome-sync">
          <h3 id="welcome-sync" className="text-sm font-semibold">
            2. Sync across your devices
          </h3>
          <SyncControls />
        </section>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
