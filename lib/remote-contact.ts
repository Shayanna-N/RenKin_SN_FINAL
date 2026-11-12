import { toPublicAvatar } from './companion'
import type { Contact, Mode, Priority, Profile, PublishedCard, Settings } from './types'

export function toPublishedCard(profile: Profile, settings: Settings): PublishedCard {
  return {
    avatar: toPublicAvatar(settings.companion, settings.brand, settings.mode),
    name: profile.name,
    headline: profile.headline,
    company: profile.company,
    email: profile.email,
    phone: profile.phone,
    links: profile.links.filter((l) => l.url).map((l) => ({ kind: l.kind, url: l.url })),
  }
}

export function contactFromRemote(
  remoteUserId: string,
  card: PublishedCard,
  preferredChannel: Priority,
  mode: Mode,
): Contact {
  return {
    id: `renkin-${remoteUserId}`,
    name: card.name,
    headline: card.headline,
    company: card.company,
    email: card.email || undefined,
    phone: card.phone || undefined,
    links: card.links,
    source: 'manual',
    capturedAt: new Date().toISOString(),
    mode,
    what: [],
    why: {
      context: 'Connected on Renkin',
      evidence: ['Added by Renkin handle'],
      confidence: 1,
      confirmed: true,
      alternatives: [],
    },
    notes: '',
    tags: ['renkin'],
    followedUp: false,
    pendingEnrichment: false,
    remoteUserId,
    preferredChannel,
    avatar: card.avatar,
  }
}

export function applyRemoteCard(contact: Contact, card: PublishedCard, preferredChannel: Priority): Contact {
  return {
    ...contact,
    name: card.name,
    headline: card.headline,
    company: card.company,
    email: card.email || undefined,
    phone: card.phone || undefined,
    links: card.links,
    preferredChannel,
    avatar: card.avatar ?? contact.avatar,
  }
}

export const CHANNEL_LABEL: Record<Priority, string> = {
  email: 'Email',
  linkedin: 'LinkedIn',
  phone: 'Phone',
  website: 'Website',
  social: 'Social',
}
