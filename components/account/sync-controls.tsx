'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useOnline, useStore } from '@/lib/store'
import { useSyncNow } from '@/lib/use-sync'

function formatSynced(iso?: string) {
  if (!iso) return 'Not synced yet'
  return `Last synced ${new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
}

export function SyncControls() {
  const { state, update } = useStore()
  const online = useOnline()
  const { run, syncing } = useSyncNow()
  const { autoSync, lastSyncedAt } = state.settings

  async function syncNow() {
    try {
      const { pushed, added } = await run()
      toast.success(
        added ? `Synced ${pushed} contacts and added ${added} from your account` : `Synced ${pushed} contacts`,
      )
    } catch {
      toast.error('Could not sync right now. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={syncNow} disabled={syncing || !online} className="w-full sm:w-fit">
        {syncing ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="size-4" aria-hidden />
        )}
        Sync now
      </Button>

      <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
        <div className="min-w-0">
          <Label htmlFor="auto-sync" className="text-sm font-medium">
            Sync automatically
          </Label>
          <p className="text-xs text-muted-foreground text-pretty">
            Back up new and edited contacts whenever you&apos;re online.
          </p>
        </div>
        <Switch
          id="auto-sync"
          checked={autoSync}
          onCheckedChange={(checked) =>
            update((s) => ({ ...s, settings: { ...s.settings, autoSync: checked } }))
          }
        />
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {online ? formatSynced(lastSyncedAt) : 'Offline. Syncing resumes when you are back online.'}
      </p>
    </div>
  )
}
