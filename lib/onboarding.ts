import type { Contact } from './types'

export const DEMO_CONTACT_ID = 'demo-contact'

export interface TourStep {
  /** Page the step lives on. The tour navigates here before showing it. */
  route: string
  /** Matches a `data-tour` attribute. Omit for a centered card. */
  target?: string
  title: string
  body: string
  /** Offers the optional demo contact on this step. */
  demo?: boolean
}

export const TOUR_STEPS: TourStep[] = [
  {
    route: '/',
    target: 'modes',
    title: 'Three modes, one card',
    body: 'Everyday is for casual meetups, Event is for conferences and networking nights, and Custom is yours to define. Each mode has its own card details and Companion badges, and your card changes the moment you switch.',
  },
  {
    route: '/',
    target: 'offline',
    title: 'Works without a connection',
    body: 'Tap here to go offline on purpose, or let Renkin do it for you when your signal drops. Cards you capture are saved on this device and filled in once you are back online.',
  },
  {
    route: '/card',
    target: 'card-preview',
    title: 'This is your card',
    body: 'It is what people receive when they scan your QR code or tap. It always shows the mode you have selected.',
  },
  {
    route: '/card',
    target: 'card-details',
    title: 'Make it yours',
    body: 'Add your headline, company and links under Card details. Each mode keeps its own version, so try switching modes while you edit. Take your time, then press Next.',
  },
  {
    route: '/card',
    target: 'appearance',
    title: 'Style your card and Companion',
    body: 'Pick a card style, colors and QR look here. Your Companion and its badges are customizable too.',
  },
  {
    route: '/',
    target: 'capture',
    title: 'Capture the people you meet',
    body: 'Speak or type a few notes after a conversation and Renkin files them against the right person. Want something to explore on the next pages? Add a clearly labeled demo contact.',
    demo: true,
  },
  {
    route: '/contacts',
    target: 'contacts-filters',
    title: 'Find anyone fast',
    body: 'Sort by name, title, company or most recent, and search across people, companies and events. Connectivity ranks people by how many ways you can reach them, using your channel priorities.',
  },
  {
    route: '/contacts',
    target: 'contacts-views',
    title: 'Two ways to look',
    body: 'By event groups people by where you met them. Needs follow-up narrows the list to people you have not reached out to yet. You can use both together.',
  },
  {
    route: '/contacts',
    target: 'contacts-list',
    title: 'Open a contact',
    body: 'Select a person to see why you met, what they said, your notes, and a drafted follow-up. Demo contacts have a Remove button at the top of their page.',
  },
  {
    route: '/settings',
    target: 'settings-mode',
    title: 'Settings run the show',
    body: 'Choose when Renkin switches modes automatically, when it goes offline, and what status it broadcasts. Connected apps, contact priority and more are just below.',
  },
  {
    route: '/settings',
    target: 'settings-tour',
    title: 'You are all set',
    body: 'You can replay this tour from here whenever you like.',
  },
]

export function createDemoContact(): Contact {
  return {
    id: DEMO_CONTACT_ID,
    demo: true,
    name: 'Alex Example',
    headline: 'Demo contact',
    company: 'Renkin tour',
    email: 'alex@example.com',
    links: [],
    source: 'manual',
    capturedAt: new Date().toISOString(),
    mode: 'event',
    what: ['Example person added by the guided tour', 'Safe to open, edit or remove'],
    why: {
      context: 'Demo contact from the guided tour',
      evidence: ['Added by you during the tour'],
      confidence: 1,
      confirmed: true,
      alternatives: [],
    },
    noteEntries: [],
    tags: ['Demo'],
    followedUp: false,
    pendingEnrichment: false,
  }
}
