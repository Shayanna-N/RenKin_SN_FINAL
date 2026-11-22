export type Mode = 'everyday' | 'event' | 'custom'

export type LinkKind =
  | 'linkedin'
  | 'website'
  | 'portfolio'
  | 'instagram'
  | 'x'
  | 'github'
  | 'calendly'
  | 'phone'
  | 'other'

export type CaptureSource = 'nfc' | 'qr' | 'photo' | 'manual' | 'voice'

export type Priority = 'email' | 'linkedin' | 'phone' | 'website' | 'social'

export type CardStyle = 'gradient' | 'solid' | 'minimal' | 'glass' | 'metallic' | 'holographic' | 'linen'

export type ShareMethod = 'qr' | 'nfc' | 'wallet' | 'vcf'
export type ReadMethod = 'tap' | 'photo' | 'type'

export type Animal = 'capybara' | 'elephant' | 'alpaca' | 'elk' | 'tiger' | 'orca' | 'wolf'

export interface CompanionConfig {
  animal: Animal
  name: string
  /** null means "use the card color" */
  color: string | null
  /** Custom profile picture (small JPEG data URL). null = the companion is the pfp. */
  photo: string | null
  /** Interest badges shown on the pfp, chosen per networking mode (max 5 each). */
  badges: Record<Mode, string[]>
  badgesVisible: boolean
  showOnCard: boolean
}

export interface PublicAvatar {
  animal: Animal
  color: string
  photo: string | null
  badges: string[]
}

export interface SavedCard {
  id: string
  name: string
  headline: string
  company: string
  email?: string
  phone?: string
  savedAt: string
  savedOn: 'watch' | 'phone'
}

export interface ProfileLink {
  id: string
  kind: LinkKind
  label: string
  url: string
}

/** The card details for a single mode. Each mode owns a complete, independent profile. */
export interface Profile {
  name: string
  headline: string
  company: string
  email: string
  phone: string
  bio: string
  links: ProfileLink[]
  /** URL the card's QR code links to. */
  qrUrl: string
  /** Detail lines shown on the card: 'email', 'phone' or a link id. Unset means the first lines that fit. */
  shownDetails?: string[]
  /** Name, title or company the user has switched off for this mode. */
  hiddenHeader?: ('name' | 'headline' | 'company')[]
}

export interface ContactLink {
  kind: LinkKind
  url: string
}

export interface WhyEntry {
  context: string
  evidence: string[]
  confidence: number
  confirmed: boolean
  alternatives: string[]
}

/** A single stamped note session. The `stamp` line is read-only once created. */
export interface NoteEntry {
  id: string
  /** ISO timestamp */
  at: string
  /** Location string (may be empty) */
  location: string
  /** Free-form text body */
  body: string
  /** Photos as data-URLs */
  photos: string[]
}

/** Unassigned (orphan) note — not yet linked to any contact. */
export interface OrphanNote {
  id: string
  at: string
  location: string
  /** User-editable title; defaults to mm/dd/yy / location / time */
  title: string
  body: string
  photos: string[]
}

export interface FollowUp {
  subject: string
  body: string
  bullets: string[]
  scheduledFor?: string
}

export interface Contact {
  id: string
  name: string
  headline: string
  company: string
  email?: string
  phone?: string
  links: ContactLink[]
  source: CaptureSource
  capturedAt: string
  mode: Mode
  what: string[]
  why: WhyEntry
  /** Structured note entries. Legacy string notes are auto-migrated on load. */
  noteEntries: NoteEntry[]
  tags: string[]
  followUp?: FollowUp
  followedUp: boolean
  pendingEnrichment: boolean
  /** Set when this contact is another Renkin user; enables live contact updates. */
  remoteUserId?: string
  preferredChannel?: Priority
  avatar?: PublicAvatar
  /** Example contact added during the guided tour. Never synced or exported. */
  demo?: boolean
}

export interface PublishedCard {
  name: string
  headline: string
  company: string
  email: string
  phone: string
  links: { kind: LinkKind; url: string }[]
  avatar?: PublicAvatar
}

export type ContactChange = { field: 'preferredChannel' | 'email' | 'phone' | 'links'; from: string; to: string }

export interface PendingUpdate {
  id: number
  fromUserId: string
  fromName: string
  changes: ContactChange[]
  card: PublishedCard
  preferredChannel: Priority
  createdAt: string
}

export interface CalendarEvent {
  id: string
  title: string
  venue: string
  start: string
  end: string
  source: string
  ticketed: boolean
}

export interface TodoItem {
  id: string
  text: string
  done: boolean
  source: string
}

export interface JobTarget {
  id: string
  role: string
  company: string
  source: string
}

export interface ModeRule {
  id: string
  mode: Mode
  trigger: string
  enabled: boolean
  /** Time range for custom rule, e.g. "09:00" */
  timeFrom?: string
  timeTo?: string
  /** Days of week: 0=Sun … 6=Sat */
  days?: number[]
}

export interface Settings {
  mode: Mode
  autoMode: boolean
  /** Switch to offline mode on its own when the connection drops. */
  autoOffline: boolean
  /** The user tapped "Online" to take the app offline by hand. */
  manualOffline: boolean
  /** Back up contacts to the account automatically while signed in and online. */
  autoSync: boolean
  /** ISO time of the last successful sync with the account. */
  lastSyncedAt?: string
  theme: 'light' | 'dark'
  brand: string
  cardStyle: CardStyle
  matchUiToCard: boolean
  companion: CompanionConfig
  priorities: Priority[]
  passiveCollection: boolean
  statusBroadcast: boolean
  /** Per-mode custom broadcast message. */
  broadcastMessages: Record<Mode, string>
  integrations: Record<string, boolean>
  goals: string[]
  rules: ModeRule[]
  learnedPreferences: string[]
  defaultShareMethod: ShareMethod | null
  defaultReadMethod: ReadMethod | null
  /** User-defined label for the "custom" mode (max 10 chars). */
  customModeName: string
  /** Up to 5 extra fields shown on the card in custom mode. */
  customCardFields: { label: string; value: string }[]
  /** QR code dot style. */
  customQrStyle: 'squares' | 'dots' | 'rounded'
  /** QR code foreground color (hex). Defaults to white to show on card background. */
  customQrColor: string
  /** Default sort order for the contacts list. */
  defaultContactSort: 'az' | 'za' | 'recent' | 'title' | 'company'
}

export interface AgentLogEntry {
  id: string
  agent: number
  message: string
  at: string
}

export type SuggestionKind = 'action' | 'starter'
export type SuggestionAgent = 'Context' | 'Scribe' | 'Organizer' | 'Doer'

/** A companion suggestion the user chose to keep from the pop-up. */
export interface Suggestion {
  id: string
  kind: SuggestionKind
  text: string
  reason: string
  agent: SuggestionAgent
  savedAt: string
  /** Starred suggestions are also committed to the companion's memories. */
  favorite?: boolean
}

/** A starred suggestion the companion remembers. */
export interface CompanionMemory {
  id: string
  kind: SuggestionKind
  text: string
  reason: string
  savedAt: string
}

export type OnboardingStatus = 'done' | 'offer' | 'active'

export interface Onboarding {
  /** `offer`: new account, tour not chosen yet. `active`: tour running. `done`: finished or skipped. */
  status: OnboardingStatus
  step: number
}

export interface AppState {
  /** One full card profile per networking mode. */
  profiles: Record<Mode, Profile>
  settings: Settings
  contacts: Contact[]
  events: CalendarEvent[]
  todos: TodoItem[]
  jobs: JobTarget[]
  log: AgentLogEntry[]
  watchSaved: SavedCard[]
  orphanNotes: OrphanNote[]
  suggestions: Suggestion[]
  memories: CompanionMemory[]
  onboarding: Onboarding
}

export interface CapturedPerson {
  name: string
  headline: string
  company: string
  email?: string
  phone?: string
  links: ContactLink[]
  what: string[]
  tags: string[]
}
