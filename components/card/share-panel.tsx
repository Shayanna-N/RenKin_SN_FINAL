'use client'

import { StyledQr } from '@/components/styled-qr'
import { Download, Nfc, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
          color={state.settings.brand}
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
    </div>
  )
}
