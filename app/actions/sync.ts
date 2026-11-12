'use server'

import { and, desc, eq, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connection, contactUpdate, profile, syncedContact } from '@/lib/db/schema'
import type { Contact, ContactChange, PendingUpdate, Priority, PublishedCard } from '@/lib/types'

const PRIORITIES = ['email', 'linkedin', 'phone', 'website', 'social'] as const
const LINK_KINDS = ['linkedin', 'website', 'portfolio', 'instagram', 'x', 'github', 'calendly', 'other'] as const

const cardSchema = z.object({
  name: z.string().trim().min(1).max(120),
  headline: z.string().max(200),
  company: z.string().max(120),
  email: z.string().max(200),
  phone: z.string().max(40),
  links: z.array(z.object({ kind: z.enum(LINK_KINDS), url: z.string().max(500) })).max(20),
  avatar: z
    .object({
      animal: z.enum(['capybara', 'elephant', 'alpaca', 'elk', 'tiger', 'orca', 'wolf']),
      color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
      photo: z
        .string()
        .max(80_000)
        .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/)
        .nullable(),
      badges: z.array(z.string().max(20)).max(5),
    })
    .optional(),
})

const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_-]{3,30}$/, 'Handles are 3-30 letters, numbers, - or _')

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

async function requireUserId() {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  return user.id
}

export interface RemoteConnection {
  userId: string
  handle: string
  card: PublishedCard
  preferredChannel: Priority
  mutual: boolean
}

export interface AccountSnapshot {
  user: { id: string; name: string; email: string }
  handle: string | null
  connections: RemoteConnection[]
  pending: PendingUpdate[]
}

export async function getAccount(): Promise<AccountSnapshot | null> {
  const user = await getSessionUser()
  if (!user) return null

  const [mine] = await db.select({ handle: profile.handle }).from(profile).where(eq(profile.userId, user.id))
  const outgoing = await db.select().from(connection).where(eq(connection.userId, user.id))
  const ids = outgoing.map((c) => c.contactUserId)

  const [profiles, incoming] = ids.length
    ? await Promise.all([
        db.select().from(profile).where(inArray(profile.userId, ids)),
        db
          .select({ userId: connection.userId })
          .from(connection)
          .where(and(eq(connection.contactUserId, user.id), inArray(connection.userId, ids))),
      ])
    : [[], []]
  const mutualIds = new Set(incoming.map((r) => r.userId))

  return {
    user: { id: user.id, name: user.name, email: user.email },
    handle: mine?.handle ?? null,
    connections: profiles.map((p) => ({
      userId: p.userId,
      handle: p.handle,
      card: p.card as PublishedCard,
      preferredChannel: p.preferredChannel as Priority,
      mutual: mutualIds.has(p.userId),
    })),
    pending: await getPendingUpdates(user.id),
  }
}

async function getPendingUpdates(userId: string): Promise<PendingUpdate[]> {
  const rows = await db
    .select({
      id: contactUpdate.id,
      fromUserId: contactUpdate.fromUserId,
      fromName: contactUpdate.fromName,
      changes: contactUpdate.changes,
      createdAt: contactUpdate.createdAt,
      card: profile.card,
      preferredChannel: profile.preferredChannel,
    })
    .from(contactUpdate)
    .innerJoin(profile, eq(profile.userId, contactUpdate.fromUserId))
    .where(and(eq(contactUpdate.userId, userId), eq(contactUpdate.status, 'pending')))
    .orderBy(desc(contactUpdate.createdAt))

  return rows.map((r) => ({
    id: r.id,
    fromUserId: r.fromUserId,
    fromName: r.fromName,
    changes: r.changes as ContactChange[],
    card: r.card as PublishedCard,
    preferredChannel: r.preferredChannel as Priority,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function listPendingUpdates(): Promise<PendingUpdate[]> {
  const user = await getSessionUser()
  if (!user) return []
  return getPendingUpdates(user.id)
}

function diff(prev: PublishedCard, prevChannel: string, next: PublishedCard, nextChannel: string) {
  const changes: ContactChange[] = []
  if (prevChannel !== nextChannel) changes.push({ field: 'preferredChannel', from: prevChannel, to: nextChannel })
  if (prev.email !== next.email) changes.push({ field: 'email', from: prev.email, to: next.email })
  if (prev.phone !== next.phone) changes.push({ field: 'phone', from: prev.phone, to: next.phone })
  const links = (c: PublishedCard) => c.links.map((l) => l.url).sort().join(' ')
  if (links(prev) !== links(next)) changes.push({ field: 'links', from: links(prev), to: links(next) })
  return changes
}

export async function publishProfile(input: {
  handle: string
  card: PublishedCard
  preferredChannel: Priority
}): Promise<{ ok: true; notified: number } | { ok: false; error: string }> {
  const userId = await requireUserId()
  const handle = handleSchema.safeParse(input.handle)
  if (!handle.success) return { ok: false, error: handle.error.issues[0].message }
  const card = cardSchema.safeParse(input.card)
  if (!card.success) return { ok: false, error: 'Card details are invalid.' }
  const channel = z.enum(PRIORITIES).safeParse(input.preferredChannel)
  if (!channel.success) return { ok: false, error: 'Unknown contact method.' }

  const [taken] = await db.select({ userId: profile.userId }).from(profile).where(eq(profile.handle, handle.data))
  if (taken && taken.userId !== userId) return { ok: false, error: 'That handle is already taken.' }

  const [previous] = await db.select().from(profile).where(eq(profile.userId, userId))

  await db
    .insert(profile)
    .values({ userId, handle: handle.data, card: card.data, preferredChannel: channel.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: profile.userId,
      set: { handle: handle.data, card: card.data, preferredChannel: channel.data, updatedAt: new Date() },
    })

  if (!previous) return { ok: true, notified: 0 }
  const changes = diff(previous.card as PublishedCard, previous.preferredChannel, card.data, channel.data)
  if (!changes.length) return { ok: true, notified: 0 }

  // Only mutual connections get notified: they saved me, and I saved them.
  const savedMe = await db.select({ userId: connection.userId }).from(connection).where(eq(connection.contactUserId, userId))
  const savedByMe = await db
    .select({ id: connection.contactUserId })
    .from(connection)
    .where(eq(connection.userId, userId))
  const mine = new Set(savedByMe.map((r) => r.id))
  const mutual = savedMe.map((r) => r.userId).filter((id) => mine.has(id))
  if (!mutual.length) return { ok: true, notified: 0 }

  // Replace any older unread notice from me so recipients only see the latest change.
  await db
    .delete(contactUpdate)
    .where(
      and(
        eq(contactUpdate.fromUserId, userId),
        eq(contactUpdate.status, 'pending'),
        inArray(contactUpdate.userId, mutual),
      ),
    )
  await db
    .insert(contactUpdate)
    .values(mutual.map((recipient) => ({ userId: recipient, fromUserId: userId, fromName: card.data.name, changes })))

  return { ok: true, notified: mutual.length }
}

/** Look up a card before accepting it — creates no connection. */
export async function previewHandle(
  rawHandle: string,
): Promise<
  { ok: true; handle: string; card: PublishedCard; preferredChannel: string } | { ok: false; error: string }
> {
  const userId = await requireUserId()
  const handle = handleSchema.safeParse(rawHandle.replace(/^@/, ''))
  if (!handle.success) return { ok: false, error: handle.error.issues[0].message }
  const [target] = await db
    .select({
      userId: profile.userId,
      handle: profile.handle,
      card: profile.card,
      preferredChannel: profile.preferredChannel,
    })
    .from(profile)
    .where(eq(profile.handle, handle.data))
  if (!target) return { ok: false, error: 'No Renkin user with that handle.' }
  if (target.userId === userId) return { ok: false, error: "That's your own handle." }
  return {
    ok: true,
    handle: target.handle,
    card: target.card as PublishedCard,
    preferredChannel: target.preferredChannel,
  }
}

export async function connectByHandle(
  rawHandle: string,
): Promise<{ ok: true; connection: RemoteConnection } | { ok: false; error: string }> {
  const userId = await requireUserId()
  const handle = handleSchema.safeParse(rawHandle.replace(/^@/, ''))
  if (!handle.success) return { ok: false, error: handle.error.issues[0].message }

  const [target] = await db.select().from(profile).where(eq(profile.handle, handle.data))
  if (!target) return { ok: false, error: 'No Renkin user with that handle.' }
  if (target.userId === userId) return { ok: false, error: "That's your own handle." }

  await db.insert(connection).values({ userId, contactUserId: target.userId }).onConflictDoNothing()
  const [back] = await db
    .select({ id: connection.id })
    .from(connection)
    .where(and(eq(connection.userId, target.userId), eq(connection.contactUserId, userId)))

  return {
    ok: true,
    connection: {
      userId: target.userId,
      handle: target.handle,
      card: target.card as PublishedCard,
      preferredChannel: target.preferredChannel as Priority,
      mutual: Boolean(back),
    },
  }
}

export async function resolveUpdate(id: number, action: 'applied' | 'dismissed') {
  const userId = await requireUserId()
  if (!Number.isInteger(id) || !['applied', 'dismissed'].includes(action)) throw new Error('Invalid request')
  await db
    .update(contactUpdate)
    .set({ status: action })
    .where(and(eq(contactUpdate.id, id), eq(contactUpdate.userId, userId)))
}

export async function pushContacts(contacts: Contact[]): Promise<{ synced: number }> {
  const userId = await requireUserId()
  const valid = contacts
    .filter((c) => typeof c?.id === 'string' && c.id.length <= 100 && typeof c.name === 'string')
    .slice(0, 2000)
  if (!valid.length) return { synced: 0 }
  for (const c of valid) {
    await db
      .insert(syncedContact)
      .values({ userId, contactId: c.id, data: c, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [syncedContact.userId, syncedContact.contactId],
        set: { data: c, updatedAt: new Date() },
      })
  }
  return { synced: valid.length }
}

export async function pullContacts(): Promise<Contact[]> {
  const userId = await requireUserId()
  const rows = await db.select({ data: syncedContact.data }).from(syncedContact).where(eq(syncedContact.userId, userId))
  return rows.map((r) => r.data as Contact)
}
