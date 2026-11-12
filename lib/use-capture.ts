'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { activeEvent, makeContact, offlineParse, stewardPolicy } from './agents'
import { useOnline, useStore } from './store'
import type { CaptureSource, CapturedPerson, Contact } from './types'

interface CaptureInput {
  source: CaptureSource
  text?: string
  image?: string
  person?: CapturedPerson
}

/**
 * Runs the capture pipeline: Agent 1 sets the policy, Agent 3 (online) or
 * Agent 7 (offline) extracts Who/What, and Agent 2 attaches the Why.
 */
export function useCapture() {
  const { state, addContact, log } = useStore()
  const online = useOnline()
  const [busy, setBusy] = useState(false)

  async function scribe(input: { text?: string; image?: string }) {
    const policy = stewardPolicy(state.settings)
    const res = await fetch('/api/agents/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        mode: state.settings.mode,
        depth: policy.captureDepth,
        context: activeEvent(state.events)?.title,
      }),
    })
    if (!res.ok) throw new Error('Scribe failed')
    const data = (await res.json()) as { person: CapturedPerson }
    return data.person
  }

  async function capture(input: CaptureInput): Promise<Contact | null> {
    setBusy(true)
    try {
      let person = input.person
      let pending = false
      const useAgent7 = !online || state.settings.mode === 'offline'

      if (!person) {
        if (useAgent7 || (!input.text && !input.image)) {
          if (!input.text) {
            toast.error('Offline: type the card details so they can be saved on-device.')
            return null
          }
          person = offlineParse(input.text)
          pending = true
          log(7, `Parsed "${person.name}" on-device and queued for enrichment.`)
        } else {
          try {
            person = await scribe({ text: input.text, image: input.image })
            log(3, `Transcribed ${person.name} into Who/What (${person.what.length} notes).`)
          } catch {
            if (!input.text) {
              toast.error('Could not read that image. Try again or type the details.')
              return null
            }
            person = offlineParse(input.text)
            pending = true
            log(7, `Scribe unavailable — saved "${person.name}" locally.`)
          }
        }
      } else if (useAgent7) {
        pending = true
      }

      const contact = makeContact(person, state, input.source, pending)
      addContact(contact)
      log(2, `Tagged ${contact.name} with "${contact.why.context}" (${Math.round(contact.why.confidence * 100)}% sure).`)
      toast.success(`Saved ${contact.name}`, {
        description: pending ? 'Stored offline. Agents will enrich it when you reconnect.' : contact.why.context,
      })
      return contact
    } finally {
      setBusy(false)
    }
  }

  return { capture, scribe, busy, online }
}
