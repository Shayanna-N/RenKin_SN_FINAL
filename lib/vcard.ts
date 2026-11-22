import type { CapturedPerson, ContactLink, LinkKind, Mode, Profile } from './types'

export function visibleProfile(profile: Profile, mode: Mode) {
  return {
    name: profile.name,
    headline: profile.headline,
    company: profile.company,
    email: profile.share.email.includes(mode) ? profile.email : undefined,
    phone: profile.share.phone.includes(mode) ? profile.phone : undefined,
    links: profile.links.filter((l) => l.modes.includes(mode)),
  }
}

function escape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

export function buildVCard(profile: Profile, mode: Mode) {
  const v = visibleProfile(profile, mode)
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escape(v.name)}`,
    `TITLE:${escape(v.headline)}`,
    `ORG:${escape(v.company)}`,
  ]
  if (v.email) lines.push(`EMAIL;TYPE=INTERNET:${v.email}`)
  if (v.phone) lines.push(`TEL;TYPE=CELL:${v.phone}`)
  for (const link of v.links) {
    if (link.kind === 'phone') lines.push(`TEL;TYPE=WORK:${link.url.replace(/^tel:/i, '')}`)
    else lines.push(`URL;TYPE=${link.kind}:${link.url}`)
  }
  lines.push('END:VCARD')
  return lines.join('\n')
}

export function guessLinkKind(url: string): LinkKind {
  const u = url.toLowerCase()
  if (u.includes('linkedin.')) return 'linkedin'
  if (u.includes('instagram.')) return 'instagram'
  if (u.includes('github.')) return 'github'
  if (u.includes('x.com') || u.includes('twitter.')) return 'x'
  if (u.includes('cal.com') || u.includes('calendly.')) return 'calendly'
  return 'website'
}

export function parseVCard(text: string): CapturedPerson | null {
  if (!/BEGIN:VCARD/i.test(text)) return null
  const get = (key: string) =>
    text
      .split(/\r?\n/)
      .find((l) => l.toUpperCase().startsWith(key))
      ?.split(':')
      .slice(1)
      .join(':')
      .replace(/\\([,;\\])/g, '$1')
      .trim()
  const links: ContactLink[] = text
    .split(/\r?\n/)
    .filter((l) => l.toUpperCase().startsWith('URL'))
    .map((l) => l.slice(l.indexOf(':') + 1).trim())
    .map((url) => ({ kind: guessLinkKind(url), url }))
  return {
    name: get('FN') ?? 'Unknown',
    headline: get('TITLE') ?? '',
    company: get('ORG') ?? '',
    email: get('EMAIL'),
    phone: get('TEL'),
    links,
    what: [],
    tags: [],
  }
}
