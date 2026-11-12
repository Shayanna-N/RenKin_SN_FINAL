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
import { createSeedState } from './seed'
import type { AgentLogEntry, AppState, CompanionConfig, Contact, Mode } from './types'

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

function migrate(saved: Partial<AppState>): AppState {
  const seed = createSeedState()
  const savedMode = saved.settings?.mode
  return {
    ...seed,
    ...saved,
    settings: {
      ...seed.settings,
      ...saved.settings,
      // Remap stale mode keys from previous versions
      mode: savedMode && VALID_MODES.has(savedMode) ? savedMode : seed.settings.mode,
      companion: migrateCompanion(seed.settings.companion, saved.settings?.companion),
      broadcastMessages: saved.settings?.broadcastMessages ?? seed.settings.broadcastMessages,
      customModeName: saved.settings?.customModeName ?? seed.settings.customModeName,
      customCardFields: saved.settings?.customCardFields ?? seed.settings.customCardFields,
      customQrUrl: saved.settings?.customQrUrl ?? seed.settings.customQrUrl,
      customQrStyle: saved.settings?.customQrStyle ?? seed.settings.customQrStyle,
      customQrColor: saved.settings?.customQrColor ?? seed.settings.customQrColor,
      defaultContactSort: saved.settings?.defaultContactSort ?? seed.settings.defaultContactSort,
    },
    watchSaved: saved.watchSaved ?? [],
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

  const reset = useCallback(() => setState(createSeedState()), [])

  const value = useMemo(
    () => ({ state, hydrated, update, log, setMode, addContact, updateContact, reset }),
    [state, hydrated, update, log, setMode, addContact, updateContact, reset],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
