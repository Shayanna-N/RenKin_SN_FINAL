import type { CapturedPerson, Contact, ContactLink, LinkKind, Profile } from './types'

export function visibleProfile(profile: Profile) {
  return {
    name: profile.name,
    headline: profile.headline,
    company: profile.company,
    email: profile.email || undefined,
    phone: profile.phone || undefined,
    links: profile.links.filter((l) => l.url),
  }
}

function escape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

export function buildVCard(profile: Profile) {
  const v = visibleProfile(profile)
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

export function buildContactsVCard(contacts: Contact[]) {
  return contacts
    .map((c) => {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escape(c.name)}`]
      if (c.headline) lines.push(`TITLE:${escape(c.headline)}`)
      if (c.company) lines.push(`ORG:${escape(c.company)}`)
      if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${c.email}`)
      if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone}`)
      for (const link of c.links) {
        if (!link.url) continue
        if (link.kind === 'phone') lines.push(`TEL;TYPE=WORK:${link.url.replace(/^tel:/i, '')}`)
        else lines.push(`URL;TYPE=${link.kind}:${link.url}`)
      }
      const note = [`Met via ${c.source} on ${c.capturedAt.slice(0, 10)}`, c.why?.context].filter(Boolean).join(' - ')
      lines.push(`NOTE:${escape(note)}`, 'END:VCARD')
      return lines.join('\r\n')
    })
    .join('\r\n')
}

export function downloadTextFile(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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
