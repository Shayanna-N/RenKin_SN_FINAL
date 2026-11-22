'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { readableOn } from './companion'
import { cloneProfile } from './profile'
import { createSeedState } from './seed'
import type {
  AgentLogEntry,
  AppState,
  CompanionConfig,
  Contact,
  Mode,
  NoteEntry,
  OrphanNote,
  Profile,
  ProfileLink,
  Settings,
} from './types'

const STORAGE_KEY = 'renkin:v1'
const LEGACY_KEYS = ['handshake:v1']

/** Fill in fields added after a user's data was first saved. */
/** Earlier versions stored a flat `accessories` list; carry those over as badges for every mode. */
function migrateCompanion(seed: CompanionConfig, saved?: Partial<CompanionConfig> & { accessories?: string[] }) {
  if (!saved) return seed
  const { accessories, ...rest } = saved
  const legacy = accessories?.slice(0, 5)
  return {
    ...seed,
    ...rest,
    badges:
      rest.badges ??
      (legacy ? { casual: legacy, business: legacy, event: legacy } : seed.badges),
  } as CompanionConfig
}

const VALID_MODES = new Set(['everyday', 'event', 'custom'])

/** Migrate a legacy contact that may still have `notes: string` instead of `noteEntries`. */
function migrateContact(c: Contact & { notes?: string }): Contact {
  if (c.noteEntries) return c
  const legacy = (c as unknown as { notes?: string }).notes ?? ''
  if (!legacy.trim()) return { ...c, noteEntries: [] }
  // Wrap the old flat string as a single entry at capturedAt
  const entry: NoteEntry = {
    id: crypto.randomUUID(),
    at: c.capturedAt,
    location: c.why?.context ?? '',
    body: legacy,
    photos: [],
  }
  return { ...c, noteEntries: [entry] }
}

type LegacyProfile = Omit<Profile, 'links' | 'qrUrl'> & {
  links: (ProfileLink & { modes?: Mode[] })[]
  share?: { email?: Mode[]; phone?: Mode[] }
  qrUrl?: string
}

/**
 * Builds one profile per mode. Older saves had a single profile with per-field mode
 * chips; each mode keeps exactly what it used to show so nothing changes on upgrade.
 */
function migrateProfiles(
  saved: Partial<AppState> & { profile?: LegacyProfile },
  seed: AppState,
  legacyQrUrl: string,
): Record<Mode, Profile> {
  const withQr = (p: Profile): Profile => ({ ...p, qrUrl: p.qrUrl ?? legacyQrUrl })

  if (saved.profiles) {
    const everyday = withQr(saved.profiles.everyday ?? seed.profiles.everyday)
    return {
      everyday,
      event: withQr(saved.profiles.event ?? cloneProfile(everyday)),
      custom: withQr(saved.profiles.custom ?? cloneProfile(everyday)),
    }
  }

  const legacy = saved.profile
  if (!legacy) return seed.profiles

  const forMode = (mode: Mode): Profile => {
    const { share, links, qrUrl, ...rest } = legacy
    return {
      ...rest,
      qrUrl: qrUrl ?? legacyQrUrl,
      email: !share?.email || share.email.includes(mode) ? legacy.email : '',
      phone: !share?.phone || share.phone.includes(mode) ? legacy.phone : '',
      links: links
        .filter((l) => !l.modes || l.modes.includes(mode))
        .map(({ modes: _modes, ...l }) => ({ ...l, id: crypto.randomUUID() })),
    }
  }
  return { everyday: forMode('everyday'), event: forMode('event'), custom: forMode('custom') }
}

function migrate(saved: Partial<AppState>): AppState {
  const seed = createSeedState()
  const savedMode = saved.settings?.mode
  const contacts = (saved.contacts ?? seed.contacts).map(migrateContact)
  const { profile: _legacyProfile, chat: _legacyChat, ...savedRest } = saved as Partial<AppState> & {
    profile?: LegacyProfile
    chat?: unknown
  }
  const { customQrUrl: legacyQrUrl = '', ...savedSettings } = (saved.settings ?? {}) as Partial<Settings> & {
    customQrUrl?: string
  }
  return {
    ...seed,
    ...savedRest,
    profiles: migrateProfiles(saved as Partial<AppState> & { profile?: LegacyProfile }, seed, legacyQrUrl),
    contacts,
    settings: {
      ...seed.settings,
      ...savedSettings,
      // Remap stale mode keys from previous versions
      mode: savedMode && VALID_MODES.has(savedMode) ? savedMode : seed.settings.mode,
      companion: migrateCompanion(seed.settings.companion, saved.settings?.companion),
      broadcastMessages: saved.settings?.broadcastMessages ?? seed.settings.broadcastMessages,
      customModeName: saved.settings?.customModeName ?? seed.settings.customModeName,
      customCardFields: saved.settings?.customCardFields ?? seed.settings.customCardFields,
      customQrStyle: saved.settings?.customQrStyle ?? seed.settings.customQrStyle,
      customQrColor: saved.settings?.customQrColor ?? seed.settings.customQrColor,
      defaultContactSort: saved.settings?.defaultContactSort ?? seed.settings.defaultContactSort,
    },
    watchSaved: saved.watchSaved ?? [],
    orphanNotes: saved.orphanNotes ?? [],
    suggestions: saved.suggestions ?? [],
  } as AppState
}

interface StoreValue {
  state: AppState
  hydrated: boolean
  update: (fn: (s: AppState) => AppState) => void
  log: (agent: number, message: string) => void
  setMode: (mode: Mode, reason?: string) => void
  addContact: (contact: Contact) => void
  updateContact: (id: string, patch: Partial<Contact>) => void
  addNoteEntry: (contactId: string, entry: NoteEntry) => void
  addOrphanNote: (note: OrphanNote) => void
  updateOrphanNote: (id: string, patch: Partial<OrphanNote>) => void
  deleteOrphanNote: (id: string) => void
  reset: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

export function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  )
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(createSeedState)
  const [hydrated, setHydrated] = useState(false)
  const online = useOnline()

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ??
        LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean)
      if (raw) setState(migrate(JSON.parse(raw)))
    } catch {
      // Corrupt local data: fall back to the seed state.
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', state.settings.theme === 'dark')
    root.classList.toggle('tinted', state.settings.matchUiToCard)
    root.style.setProperty('--brand', state.settings.brand)
    root.style.setProperty('--brand-foreground', readableOn(state.settings.brand))
  }, [state.settings.theme, state.settings.brand, state.settings.matchUiToCard])

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), [])

  const log = useCallback((agent: number, message: string) => {
    const entry: AgentLogEntry = {
      id: crypto.randomUUID(),
      agent,
      message,
      at: new Date().toISOString(),
    }
    setState((s) => ({ ...s, log: [entry, ...s.log].slice(0, 100) }))
  }, [])

  const setMode = useCallback(
    (mode: Mode, reason = 'manual change') => {
      setState((s) => ({ ...s, settings: { ...s.settings, mode } }))
      log(6, `Mode set to ${mode} (${reason}).`)
    },
    [log],
  )


  const addContact = useCallback((contact: Contact) => {
    setState((s) => ({ ...s, contacts: [contact, ...s.contacts] }))
  }, [])

  const updateContact = useCallback((id: string, patch: Partial<Contact>) => {
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
  }, [])

  const addNoteEntry = useCallback((contactId: string, entry: NoteEntry) => {
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) =>
        c.id === contactId ? { ...c, noteEntries: [...(c.noteEntries ?? []), entry] } : c,
      ),
    }))
  }, [])

  const addOrphanNote = useCallback((note: OrphanNote) => {
    setState((s) => ({ ...s, orphanNotes: [note, ...(s.orphanNotes ?? [])] }))
  }, [])

  const updateOrphanNote = useCallback((id: string, patch: Partial<OrphanNote>) => {
    setState((s) => ({
      ...s,
      orphanNotes: (s.orphanNotes ?? []).map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }))
  }, [])

  const deleteOrphanNote = useCallback((id: string) => {
    setState((s) => ({ ...s, orphanNotes: (s.orphanNotes ?? []).filter((n) => n.id !== id) }))
  }, [])

  const reset = useCallback(() => setState(createSeedState()), [])

  const value = useMemo(
    () => ({ state, hydrated, update, log, setMode, addContact, updateContact, addNoteEntry, addOrphanNote, updateOrphanNote, deleteOrphanNote, reset }),
    [state, hydrated, update, log, setMode, addContact, updateContact, addNoteEntry, addOrphanNote, updateOrphanNote, deleteOrphanNote, reset],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
