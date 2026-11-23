'use client'

import { useId } from 'react'
import { Switch } from '@/components/ui/switch'
import { useStore } from '@/lib/store'
import { useResumes } from '@/lib/use-resumes'
import { cn } from '@/lib/utils'

/** The "Share My Resume/CV/Pdf" switch. It only turns on for a signed-in user who has a stored document. */
export function ResumeToggle({ className }: { className?: string }) {
  const id = useId()
  const { state, update } = useStore()
  const { canShare, signedIn, isLoading } = useResumes()

  const checked = state.settings.shareResume && canShare
  const hint = !signedIn
    ? 'Sign in on the Account & sync page to use this.'
    : canShare
      ? 'Adds a button to the Share tab that sends your PDF.'
      : isLoading
        ? 'Checking your documents…'
        : 'Upload a PDF under Account & sync to turn this on.'

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <p id={id} className="text-sm font-medium">
          Share My Resume/CV/Pdf
        </p>
        <p className="text-xs text-muted-foreground text-pretty">{hint}</p>
      </div>
      <Switch
        aria-labelledby={id}
        checked={checked}
        disabled={!canShare}
        onCheckedChange={(on) => update((s) => ({ ...s, settings: { ...s.settings, shareResume: on } }))}
      />
    </div>
  )
}
