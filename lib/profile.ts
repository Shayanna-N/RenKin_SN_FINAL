import type { AppState, LinkKind, Mode, Profile } from './types'

export const MODES: Mode[] = ['everyday', 'event', 'custom']

/** The profile for the mode the user is currently in. */
export function activeProfile(state: Pick<AppState, 'profiles' | 'settings'>): Profile {
  return state.profiles[state.settings.mode] ?? state.profiles.everyday
}

export function cloneProfile(profile: Profile): Profile {
  const idMap = new Map<string, string>()
  const links = profile.links.map((l) => {
    const id = crypto.randomUUID()
    idMap.set(l.id, id)
    return { ...l, id }
  })
  return {
    ...profile,
    links,
    shownDetails: profile.shownDetails?.map((k) => idMap.get(k) ?? k),
    hiddenHeader: profile.hiddenHeader ? [...profile.hiddenHeader] : undefined,
  }
}

/** Display name for a mode, honouring the user's custom-mode rename. */
export function modeLabel(mode: Mode, customModeName: string, fallback: string) {
  return mode === 'custom' ? customModeName.trim() || fallback : fallback
}

export function normalizeUrl(url: string) {
  return url
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/|tel:|mailto:)/, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
}

export type HeaderField = 'name' | 'headline' | 'company'
export const HEADER_FIELDS: HeaderField[] = ['name', 'headline', 'company']

/** Detail lines that fit under the header on a card with a QR code. */
export const MAX_DETAILS_WITH_HEADER = 4
/** One extra line fits when name, title and company are all off. */
export const MAX_DETAILS_NO_HEADER = 5

export const RECOMMENDED_MIN_DETAILS: Record<Mode, number> = { everyday: 2, event: 3, custom: 2 }

export function isHeaderOn(profile: Profile, field: HeaderField) {
  return profile[field].trim() !== '' && !(profile.hiddenHeader ?? []).includes(field)
}

export function hasHeader(profile: Profile) {
  return HEADER_FIELDS.some((f) => isHeaderOn(profile, f))
}

export function maxDetails(profile: Profile) {
  return hasHeader(profile) ? MAX_DETAILS_WITH_HEADER : MAX_DETAILS_NO_HEADER
}

export interface DetailItem {
  key: string
  kind: 'email' | 'phone' | LinkKind
  label: string
  display: string
}

/** Every email, phone and link the profile has a value for, in card order. */
export function availableDetails(profile: Profile): DetailItem[] {
  const items: DetailItem[] = []
  if (profile.email.trim()) items.push({ key: 'email', kind: 'email', label: 'Email', display: profile.email })
  if (profile.phone.trim()) items.push({ key: 'phone', kind: 'phone', label: 'Phone', display: profile.phone })
  for (const l of profile.links) {
    if (!l.url) continue
    items.push({ key: l.id, kind: l.kind, label: l.label, display: l.url.replace(/^(https?:\/\/|tel:|mailto:)/i, '') })
  }
  return items
}

/** Keys of the detail lines that appear on the card, capped to what fits. */
export function selectedDetailKeys(profile: Profile): string[] {
  const available = availableDetails(profile).map((d) => d.key)
  const chosen = profile.shownDetails ? profile.shownDetails.filter((k) => available.includes(k)) : available
  return chosen.slice(0, maxDetails(profile))
}
