import type { AppState, Mode, Profile } from './types'

export const MODES: Mode[] = ['everyday', 'event', 'custom']

/** The profile for the mode the user is currently in. */
export function activeProfile(state: Pick<AppState, 'profiles' | 'settings'>): Profile {
  return state.profiles[state.settings.mode] ?? state.profiles.everyday
}

export function cloneProfile(profile: Profile): Profile {
  return { ...profile, links: profile.links.map((l) => ({ ...l, id: crypto.randomUUID() })) }
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
