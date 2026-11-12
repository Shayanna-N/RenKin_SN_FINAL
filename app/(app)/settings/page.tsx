'use client'

import Link from 'next/link'
import { ArrowDown, ArrowUp, Activity, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useStore } from '@/lib/store'
import { MODE_META } from '@/lib/agents'
import type { ReadMethod, Settings, ShareMethod } from '@/lib/types'

function Section({ id, title, desc, children }: { id: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border bg-card p-5 md:p-6">
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Row({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2.5">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

export default function SettingsPage() {
  const { state, update, log, reset } = useStore()
  const s = state.settings
  const set = (patch: Partial<Settings>) => update((st) => ({ ...st, settings: { ...st.settings, ...patch } }))

  function move(i: number, dir: -1 | 1) {
    const next = [...s.priorities]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    set({ priorities: next })
    log(4, `Contact priority updated: ${next.join(' > ')}.`)
  }

  return (
    <>
      <PageHeader title="Settings" description="The Steward agent enforces everything here." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section id="mode-h" title="Networking mode" desc="How agents behave and which fields your card shares.">
          <Row
            label="Switch modes automatically"
            hint="Based on location, calendar and tickets"
            checked={s.autoMode}
            onChange={(v) => set({ autoMode: v })}
          />
          <Row
            label="Broadcast my status"
            hint="Share 'At a conference — open to chat' with other apps"
            checked={s.statusBroadcast}
            onChange={(v) => set({ statusBroadcast: v })}
          />
          <h3 className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Auto-switch rules</h3>
          <ul className="divide-y">
            {s.rules.map((r) => (
              <li key={r.id}>
                <Row
                  label={`${MODE_META[r.mode].label} mode`}
                  hint={r.trigger}
                  checked={r.enabled}
                  onChange={(v) => set({ rules: s.rules.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)) })}
                />
              </li>
            ))}
          </ul>
        </Section>

        <Section id="int-h" title="Connected apps" desc="Context sources agents may read. Toggle off anytime.">
          <ul className="divide-y">
            {Object.entries(s.integrations).map(([name, on]) => (
              <li key={name}>
                <Row
                  label={name}
                  checked={on}
                  onChange={(v) => {
                    set({ integrations: { ...s.integrations, [name]: v } })
                    log(1, `${name} access ${v ? 'granted' : 'revoked'}.`)
                  }}
                />
              </li>
            ))}
          </ul>
        </Section>

        <Section id="pri-h" title="Contact priority" desc="Which channel matters most when the Organizer sorts people.">
          <ol className="flex flex-col gap-2">
            {s.priorities.map((p, i) => (
              <li key={p} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                <span className="flex-1 text-sm capitalize">{p}</span>
                <Button size="icon" variant="ghost" className="size-7" aria-label={`Move ${p} up`} onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={`Move ${p} down`}
                  onClick={() => move(i, 1)}
                  disabled={i === s.priorities.length - 1}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="methods-h" title="Default methods" desc="When enabled, Share and Read will jump straight to your chosen method instead of asking each time.">
          <div className="flex flex-col divide-y">
            <div className="py-3">
              <div className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Default share method</span>
                  <span className="block text-xs text-muted-foreground">Skip the picker and go straight to this</span>
                </span>
                <Switch
                  checked={s.defaultShareMethod !== null}
                  onCheckedChange={(v) => {
                    set({ defaultShareMethod: v ? 'qr' : null })
                    log(4, `Default share method ${v ? 'enabled (QR)' : 'disabled'}.`)
                  }}
                />
              </div>
              {s.defaultShareMethod !== null && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['qr', 'nfc', 'wallet', 'vcf'] as ShareMethod[]).map((m) => {
                    const labels: Record<ShareMethod, string> = { qr: 'QR Code', nfc: 'NFC Tap', wallet: 'Wallet Pass', vcf: 'Save as .vcf' }
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { set({ defaultShareMethod: m }); log(4, `Default share method set to ${m}.`) }}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${s.defaultShareMethod === m ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      >
                        {labels[m]}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="py-3">
              <div className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Default read method</span>
                  <span className="block text-xs text-muted-foreground">Skip the picker and go straight to this</span>
                </span>
                <Switch
                  checked={s.defaultReadMethod !== null}
                  onCheckedChange={(v) => {
                    set({ defaultReadMethod: v ? 'tap' : null })
                    log(4, `Default read method ${v ? 'enabled (Tap)' : 'disabled'}.`)
                  }}
                />
              </div>
              {s.defaultReadMethod !== null && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['tap', 'photo', 'type'] as ReadMethod[]).map((m) => {
                    const labels: Record<ReadMethod, string> = { tap: 'NFC Tap', photo: 'Take a Photo', type: 'Type it in' }
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { set({ defaultReadMethod: m }); log(4, `Default read method set to ${m}.`) }}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${s.defaultReadMethod === m ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      >
                        {labels[m]}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section id="learn-h" title="What agents have learned" desc="Preferences picked up from your choices. Remove any you disagree with.">
          {s.learnedPreferences.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {s.learnedPreferences.map((p) => (
                <li key={p} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
                  {p}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => set({ learnedPreferences: s.learnedPreferences.filter((x) => x !== p) })}
                  >
                    Forget
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" nativeButton={false} render={<Link href="/agents" />}>
              <Activity className="size-4" aria-hidden /> View my activity
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden /> Reset demo data
            </Button>
          </div>
        </Section>
      </div>
    </>
  )
}
