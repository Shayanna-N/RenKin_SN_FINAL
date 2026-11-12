import { guessLinkKind } from './vcard'
import type {
  AppState,
  CalendarEvent,
  CapturedPerson,
  Contact,
  Mode,
  Priority,
  Settings,
  WhyEntry,
} from './types'

export const AGENTS = [
  {
    id: 1,
    name: 'Steward',
    role: 'Customization & compliance',
    description:
      'Enforces your settings, decides what passive data other agents may use per mode, and learns your preferences. Not user-facing.',
  },
  {
    id: 2,
    name: 'Context',
    role: 'What & Why',
    description:
      'Watches calendars, tickets, location, to-dos and job searches to explain why an interaction happened.',
  },
  {
    id: 3,
    name: 'Scribe',
    role: 'Who & What',
    description:
      'Wakes after an exchange to capture voice memos, notes and flier photos, transcribing them into Who and What.',
  },
  {
    id: 4,
    name: 'Organizer',
    role: 'Sort & surface',
    description:
      'Compounds data from Context and Scribe into the views you need, spotting patterns like missed follow-ups.',
  },
  {
    id: 5,
    name: 'Doer',
    role: 'Actions',
    description:
      'Drafts follow-up emails, summarizes conversations, blocks calendar time and schedules meetings for your review.',
  },
  {
    id: 6,
    name: 'Companion',
    role: 'Your buddy',
    description:
      'The agent you talk to. Takes manual prompts, switches modes and broadcasts your status to other apps.',
  },
  {
    id: 7,
    name: 'Offline',
    role: 'Careful recorder',
    description:
      'Takes over without a connection: parses cards on-device, stores everything locally and queues enrichment.',
  },
] as const

export const MODE_META: Record<Mode, { label: string; blurb: string }> = {
  everyday: { label: 'Everyday', blurb: 'Socializing — personal links, light capture' },
  event: { label: 'Event', blurb: 'Conference mode — passive collection on' },
  custom: { label: 'Custom', blurb: 'Your custom networking mode' },
}

/** Agent 1: decide what each agent is allowed to do in the current mode. */
export function stewardPolicy(settings: Settings) {
  const enabled = Object.entries(settings.integrations)
    .filter(([, on]) => on)
    .map(([name]) => name)
  const mode = settings.mode
  const passive = settings.passiveCollection && mode !== 'everyday'
  return {
    mode,
    allowedSources:
      mode === 'everyday'
        ? enabled.filter((s) => ['Google Maps', 'Google Calendar'].includes(s))
        : enabled,
    passiveCollection: passive,
    captureDepth: mode === 'event' ? 'detailed' : mode === 'custom' ? 'standard' : 'light',
    autoFollowUp: mode === 'event' || mode === 'custom',
    statusBroadcast: settings.statusBroadcast,
  } as const
}

export function activeEvent(events: CalendarEvent[], now = Date.now()) {
  return events.find(
    (e) => new Date(e.start).getTime() <= now && new Date(e.end).getTime() >= now,
  )
}

/** Agent 2: infer the "Why" for a new interaction from sure signals. */
export function contextWhy(state: AppState, now = Date.now()): WhyEntry {
  const policy = stewardPolicy(state.settings)
  const event = activeEvent(state.events, now)
  if (event && policy.allowedSources.length > 0) {
    const evidence = [`Calendar overlap: ${event.title}`]
    if (event.ticketed) evidence.push(`Ticket confirmed via ${event.source}`)
    if (state.settings.integrations['Google Maps']) evidence.push(`Location near ${event.venue}`)
    return {
      context: event.title,
      evidence,
      confidence: event.ticketed ? 0.92 : 0.74,
      confirmed: false,
      alternatives: ['Side conversation (not event related)', 'Introduced by a mutual contact'],
    }
  }
  return {
    context: state.settings.mode === 'everyday' ? 'Social hangout' : 'Unscheduled meeting',
    evidence: ['No overlapping event found'],
    confidence: 0.4,
    confirmed: false,
    alternatives: ['Coffee chat', 'Online intro', 'Other'],
  }
}

/** Agent 7: on-device parsing for offline or low-tech capture. */
export function offlineParse(text: string): CapturedPerson {
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0]
  const phone = text.match(/\+?\d[\d\s().-]{7,}\d/)?.[0]?.trim()
  const urls = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+|[\w-]+\.(?:com|io|dev|app|design|co)\/[^\s]*)/gi) ?? []
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.includes('@') && !/\d{3}/.test(l) && !/https?:|www\./i.test(l))
  return {
    name: lines[0] ?? 'New contact',
    headline: lines[1] ?? '',
    company: lines[2] ?? '',
    email,
    phone,
    links: urls.map((url) => ({
      kind: guessLinkKind(url),
      url: url.startsWith('http') ? url : `https://${url}`,
    })),
    what: lines.slice(3),
    tags: [],
  }
}

export function makeContact(
  person: CapturedPerson,
  state: AppState,
  source: Contact['source'],
  pendingEnrichment: boolean,
): Contact {
  return {
    id: crypto.randomUUID(),
    name: person.name,
    headline: person.headline,
    company: person.company,
    email: person.email,
    phone: person.phone,
    links: person.links,
    source,
    capturedAt: new Date().toISOString(),
    mode: state.settings.mode,
    what: person.what,
    why: contextWhy(state),
    notes: '',
    tags: person.tags,
    followedUp: false,
    pendingEnrichment,
  }
}

function priorityScore(c: Contact, priorities: Priority[]) {
  const has: Record<Priority, boolean> = {
    email: Boolean(c.email),
    phone: Boolean(c.phone),
    linkedin: c.links.some((l) => l.kind === 'linkedin'),
    website: c.links.some((l) => l.kind === 'website' || l.kind === 'portfolio'),
    social: c.links.some((l) => ['instagram', 'x', 'github'].includes(l.kind)),
  }
  return priorities.reduce((score, p, i) => score + (has[p] ? (priorities.length - i) * 10 : 0), 0)
}

/** Agent 4: sort contacts by the user's channel priorities, then recency. */
export function organize(contacts: Contact[], priorities: Priority[]) {
  return [...contacts].sort((a, b) => {
    const diff = priorityScore(b, priorities) - priorityScore(a, priorities)
    if (diff !== 0) return diff
    return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
  })
}

export function groupByContext(contacts: Contact[]) {
  const groups = new Map<string, Contact[]>()
  for (const c of contacts) {
    const key = c.why.context
    groups.set(key, [...(groups.get(key) ?? []), c])
  }
  return [...groups.entries()]
}

/** Agent 4: pattern recognition for proactive suggestions. */
export function insights(state: AppState) {
  const out: { id: string; text: string; action?: 'block-followups' | 'confirm-why' | 'enrich' }[] = []
  const today = new Date().toDateString()
  const pendingToday = state.contacts.filter(
    (c) => !c.followedUp && new Date(c.capturedAt).toDateString() === today,
  )
  if (pendingToday.length > 0) {
    out.push({
      id: 'followups',
      text: `${pendingToday.length} contact${pendingToday.length > 1 ? 's' : ''} from today still need a follow-up. You tend to forget these by end of day — block 4:30 PM?`,
      action: 'block-followups',
    })
  }
  const unconfirmed = state.contacts.filter((c) => !c.why.confirmed)
  if (unconfirmed.length > 0) {
    out.push({
      id: 'why',
      text: `${unconfirmed.length} interaction${unconfirmed.length > 1 ? 's need' : ' needs'} a quick context check.`,
      action: 'confirm-why',
    })
  }
  const pending = state.contacts.filter((c) => c.pendingEnrichment)
  if (pending.length > 0) {
    out.push({
      id: 'enrich',
      text: `${pending.length} card${pending.length > 1 ? 's were' : ' was'} saved offline and can be enriched now.`,
      action: 'enrich',
    })
  }
  return out
}

export function statusLine(state: AppState) {
  const event = activeEvent(state.events)
  const { name, company } = state.profile
  const first = name.split(' ')[0]
  switch (state.settings.mode) {
    case 'event':
      return event
        ? `${first} is with ${company} at ${event.title} today.`
        : `${first} is at an event with ${company}.`
    case 'custom':
      return `${first} is working — reach out via email.`
    case 'everyday':
      return `${first} is out and about.`
  }
}
