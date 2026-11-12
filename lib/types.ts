export type Mode = 'everyday' | 'event' | 'custom'

export type LinkKind =
  | 'linkedin'
  | 'website'
  | 'portfolio'
  | 'instagram'
  | 'x'
  | 'github'
  | 'calendly'
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
  modes: Mode[]
}

export interface Profile {
  name: string
  headline: string
  company: string
  email: string
  phone: string
  bio: string
  links: ProfileLink[]
  share: { email: Mode[]; phone: Mode[] }
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
  notes: string
  tags: string[]
  followUp?: FollowUp
  followedUp: boolean
  pendingEnrichment: boolean
  /** Set when this contact is another Renkin user; enables live contact updates. */
  remoteUserId?: string
  preferredChannel?: Priority
  avatar?: PublicAvatar
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
}

export interface Settings {
  mode: Mode
  autoMode: boolean
  theme: 'light' | 'dark'
  brand: string
  cardStyle: CardStyle
  matchUiToCard: boolean
  companion: CompanionConfig
  priorities: Priority[]
  passiveCollection: boolean
  statusBroadcast: boolean
  integrations: Record<string, boolean>
  goals: string[]
  rules: ModeRule[]
  learnedPreferences: string[]
  defaultShareMethod: ShareMethod | null
  defaultReadMethod: ReadMethod | null
  /** User-defined label for the "custom" mode (max 10 chars). */
  customModeName: string
  /** Up to 5 extra field labels the user wants shown on their card in custom mode. */
  customCardFields: string[]
  /** URL the card-page QR code links to. Editable without regenerating a new code. */
  customQrUrl: string
}

export interface AgentLogEntry {
  id: string
  agent: number
  message: string
  at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface AppState {
  profile: Profile
  settings: Settings
  contacts: Contact[]
  events: CalendarEvent[]
  todos: TodoItem[]
  jobs: JobTarget[]
  log: AgentLogEntry[]
  chat: ChatMessage[]
  watchSaved: SavedCard[]
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
