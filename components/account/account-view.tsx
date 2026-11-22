'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CloudDownload, CloudUpload, Loader2, LogOut, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { connectByHandle, previewHandle, publishProfile, pullContacts, pushContacts } from '@/app/actions/sync'
import { ContactAvatar, ProfileAvatar } from '@/components/companion-avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Priority, PublishedCard } from '@/lib/types'
import { signOut } from '@/lib/auth-client'
import { useStore } from '@/lib/store'
import { activeProfile } from '@/lib/profile'
import { useAccount } from '@/lib/use-account'
import { CHANNEL_LABEL, contactFromRemote, toPublishedCard } from '@/lib/remote-contact'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function AccountView() {
  const router = useRouter()
  const { state, update } = useStore()
  const { data: account, mutate, session, sessionPending, isLoading } = useAccount()
  const [handle, setHandle] = useState('')
  const [connectHandle, setConnectHandle] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    handle: string
    card: PublishedCard
    preferredChannel: Priority
  } | null>(null)

  if (sessionPending || (session && isLoading)) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading account
      </div>
    )
  }

  if (!session?.user || !account) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Account & sync" description="Optional. Renkin works fully offline without an account." />
        <Section
          title="Sign in to sync"
          description="Back up contacts, use the same card on phone, desktop and watch, and get notified when mutual connections change how they want to be reached."
        >
          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} render={<Link href="/sign-up" />}>
              Create account
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/sign-in" />}>
              Sign in
            </Button>
          </div>
        </Section>
      </div>
    )
  }

  const preferredChannel = state.settings.priorities[0] ?? 'email'

  async function claimHandle(e: React.FormEvent) {
    e.preventDefault()
    setBusy('handle')
    const res = await publishProfile({ handle, card: toPublishedCard(activeProfile(state), state.settings), preferredChannel })
    setBusy(null)
    if (!res.ok) return toast.error(res.error)
    toast.success('Your card is live on Renkin')
    mutate()
  }

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    setBusy('lookup')
    const res = await previewHandle(connectHandle)
    setBusy(null)
    if (!res.ok) return toast.error(res.error)
    setPending({ handle: res.handle, card: res.card, preferredChannel: res.preferredChannel as Priority })
  }

  async function accept() {
    if (!pending) return
    setBusy('connect')
    const res = await connectByHandle(pending.handle)
    setBusy(null)
    setPending(null)
    if (!res.ok) return toast.error(res.error)
    const { connection } = res
    update((s) =>
      s.contacts.some((c) => c.remoteUserId === connection.userId)
        ? s
        : {
            ...s,
            contacts: [
              contactFromRemote(connection.userId, connection.card, connection.preferredChannel, s.settings.mode),
              ...s.contacts,
            ],
          },
    )
    setConnectHandle('')
    toast.success(
      connection.mutual
        ? `Connected with ${connection.card.name}. You'll get each other's updates.`
        : `Saved ${connection.card.name}. Updates start once they save you back.`,
    )
    mutate()
  }

  async function backup() {
    setBusy('push')
    const res = await pushContacts(state.contacts)
    setBusy(null)
    toast.success(`Backed up ${res.synced} contacts`)
  }

  async function restore() {
    setBusy('pull')
    const remote = await pullContacts()
    let added = 0
    update((s) => {
      const have = new Set(s.contacts.map((c) => c.id))
      const fresh = remote.filter((c) => !have.has(c.id))
      added = fresh.length
      return { ...s, contacts: [...s.contacts, ...fresh] }
    })
    setBusy(null)
    toast.success(added ? `Restored ${added} contacts from the cloud` : 'This device is already up to date')
  }

  async function onSignOut() {
    await signOut()
    router.refresh()
    mutate(undefined, { revalidate: false })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Account & sync"
        description={`Signed in as ${account.user.email}`}
      >
        <Button variant="outline" size="sm" onClick={onSignOut}>
          <LogOut className="size-4" aria-hidden /> Sign out
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Your Renkin handle"
          description="Your card is published under this handle. Edits on the My card page sync automatically and notify mutual connections."
        >
          {account.handle ? (
            <div className="flex flex-col gap-2">
              <p className="font-mono text-lg">@{account.handle}</p>
              <p className="text-sm text-muted-foreground">
                Preferred contact: <span className="font-medium text-foreground">{CHANNEL_LABEL[preferredChannel]}</span>
                {' — change it in Settings → contact priority.'}
              </p>
            </div>
          ) : (
            <form onSubmit={claimHandle} className="flex flex-col gap-2">
              <Label htmlFor="handle">Choose a handle</Label>
              <div className="flex gap-2">
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="alex-rivera"
                  pattern="[a-zA-Z0-9_\-]{3,30}"
                  required
                />
                <Button type="submit" disabled={busy === 'handle'}>
                  {busy === 'handle' && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Publish
                </Button>
              </div>
            </form>
          )}
        </Section>

        <Section
          title="Contact sync"
          description="Back up this device's address book — including cards you scanned offline — and restore it on any device."
        >
          <div className="flex flex-wrap gap-2">
            <Button onClick={backup} disabled={busy === 'push'}>
              {busy === 'push' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CloudUpload className="size-4" aria-hidden />}
              Back up {state.contacts.length} contacts
            </Button>
            <Button variant="outline" onClick={restore} disabled={busy === 'pull'}>
              {busy === 'pull' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CloudDownload className="size-4" aria-hidden />}
              Restore
            </Button>
          </div>
        </Section>
      </div>

      <Section
        title="Renkin connections"
        description="Add someone by handle. When you've both saved each other, you'll be prompted whenever either of you changes how you want to be reached."
      >
        <form onSubmit={lookup} className="flex flex-col gap-2 sm:flex-row">
          <Label htmlFor="connect" className="sr-only">
            Handle to connect
          </Label>
          <Input
            id="connect"
            value={connectHandle}
            onChange={(e) => setConnectHandle(e.target.value)}
            placeholder="@their-handle"
            disabled={!account.handle}
            required
          />
          <Button type="submit" disabled={!account.handle || busy === 'lookup'}>
            {busy === 'lookup' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
            Connect
          </Button>
        </form>
        {!account.handle && <p className="mt-2 text-xs text-muted-foreground">Publish your handle first.</p>}

        <ul className="mt-5 flex flex-col divide-y">
          {account.connections.length === 0 && (
            <li className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Users className="size-4" aria-hidden /> No Renkin connections yet.
            </li>
          )}
          {account.connections.map((c) => (
            <li key={c.userId} className="flex items-center gap-3 py-3">
              <ContactAvatar name={c.card.name} avatar={c.card.avatar} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.card.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  @{c.handle} · prefers {CHANNEL_LABEL[c.preferredChannel]}
                </p>
              </div>
              <Badge variant={c.mutual ? 'default' : 'outline'}>{c.mutual ? 'Mutual' : 'Waiting on them'}</Badge>
            </li>
          ))}
        </ul>
      </Section>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="sm:max-w-sm">
          {pending && (
            <>
              <DialogHeader className="items-center text-center">
                {pending.card.avatar ? (
                  <ProfileAvatar avatar={pending.card.avatar} name={pending.card.name} size="lg" className="mb-2" />
                ) : (
                  <ContactAvatar name={pending.card.name} className="mb-2 size-28 text-2xl" />
                )}
                <DialogTitle>{pending.card.name}</DialogTitle>
                <DialogDescription>
                  {[pending.card.headline, pending.card.company].filter(Boolean).join(' · ') || `@${pending.handle}`}
                </DialogDescription>
              </DialogHeader>
              <p className="text-center text-sm text-muted-foreground">
                {'Prefers '}
                <span className="font-medium text-foreground">
                  {CHANNEL_LABEL[pending.preferredChannel] ?? pending.preferredChannel}
                </span>
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPending(null)}>
                  Not now
                </Button>
                <Button onClick={accept} disabled={busy === 'connect'}>
                  {busy === 'connect' && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Accept card
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
