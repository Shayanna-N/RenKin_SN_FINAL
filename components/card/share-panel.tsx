'use client'

import { useId, useState } from 'react'
import { StyledQr } from '@/components/styled-qr'
import { Download, FileText, Loader2, Nfc, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { ResumeToggle } from '@/components/resume/resume-toggle'
import { Button } from '@/components/ui/button'
import { formatUploaded, shareResume } from '@/lib/resume-actions'
import { useResumes } from '@/lib/use-resumes'
import { useStore } from '@/lib/store'
import { activeProfile } from '@/lib/profile'
import { buildVCard } from '@/lib/vcard'

/**
 * Full share UI rendered inline inside the Share tab.
 * `onNfc` / `onWallet` / `onVcf` are called when the user triggers that method —
 * the parent opens the progress sheet.
 */
export function SharePanel({
  onNfc,
  onWallet,
  onVcf,
}: {
  onNfc: () => void
  onWallet: (wallet: 'Apple Wallet' | 'Google Wallet') => void
  onVcf: () => void
}) {
  const { state } = useStore()
  const vcard = buildVCard(activeProfile(state))

  return (
    <div className="flex flex-col gap-5">
      {/* QR — purely display, no progress needed */}
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-5">
        <StyledQr
          value={vcard}
          shape={state.settings.customQrStyle}
          color={state.settings.customQrColor || state.settings.brand}
          margin={0}
          className="size-48 max-h-48 max-w-full"
          title={`QR code for ${activeProfile(state).name}'s contact card`}
        />
        <p className="text-xs text-neutral-600">Point any phone camera here</p>
      </div>

      <div className="grid gap-2">
        <Button size="lg" className="h-12 text-base" onClick={onNfc}>
          <Nfc className="size-5" aria-hidden />
          Tap to share (NFC)
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onWallet('Apple Wallet')}>
            <Wallet className="size-4" aria-hidden />
            Apple Wallet
          </Button>
          <Button variant="outline" onClick={() => onWallet('Google Wallet')}>
            <Wallet className="size-4" aria-hidden />
            Google Wallet
          </Button>
        </div>
        <Button variant="ghost" onClick={onVcf}>
          <Download className="size-4" aria-hidden />
          Save as contact file (.vcf)
        </Button>
      </div>

      <ResumeShare />
    </div>
  )
}

function ResumeShare() {
  const { state } = useStore()
  const { documents, userId, canShare } = useResumes()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const selectId = useId()

  const enabled = state.settings.shareResume && canShare
  const doc = documents.find((d) => d.id === selectedId) ?? documents[0]

  async function send() {
    if (!doc || !userId) return
    setSending(true)
    try {
      const outcome = await shareResume(doc, userId)
      if (outcome === 'downloaded') toast.success('Sharing is not supported here, so the PDF was downloaded')
    } catch {
      toast.error('Could not open this document. Connect to the internet and try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <ResumeToggle />
      {enabled && doc && (
        <div className="flex flex-col gap-2">
          {documents.length > 1 && (
            <div className="flex flex-col gap-1">
              <label htmlFor={selectId} className="text-xs text-muted-foreground">
                Document to send
              </label>
              <select
                id={selectId}
                value={doc.id}
                onChange={(e) => setSelectedId(e.target.value)}
                className="h-9 rounded-lg border bg-background px-2 text-sm"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button variant="outline" onClick={send} disabled={sending}>
            {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileText className="size-4" aria-hidden />}
            Send {doc.name}
          </Button>
          <p className="text-xs text-muted-foreground">
            Uploaded {formatUploaded(doc.uploadedAt)}
            {doc.offline ? ' · works offline' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
