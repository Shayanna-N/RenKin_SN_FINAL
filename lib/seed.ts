import type { AppState, Contact, Profile } from './types'
import { createDemoContact } from './onboarding'

const HOUR = 60 * 60 * 1000

function at(offsetHours: number) {
  return new Date(Date.now() + offsetHours * HOUR).toISOString()
}

function seedProfile(): Profile {
  return {
    name: 'Jordan Rivera',
    headline: 'Information Science Student',
    company: 'State University, Class of 2027',
    email: 'jordan.rivera@stateu.edu',
    phone: '+1 (415) 555-0142',
    bio: 'Junior studying information science and design. Looking for a summer 2027 UX or product design internship.',
    qrUrl: '',
    links: [
      { id: 'l1', kind: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/in/jordanrivera' },
      { id: 'l2', kind: 'portfolio', label: 'Portfolio', url: 'https://jordanrivera.design' },
      { id: 'l3', kind: 'github', label: 'GitHub', url: 'https://github.com/jordanrivera' },
      { id: 'l4', kind: 'calendly', label: 'Book a chat', url: 'https://cal.com/jordanrivera' },
    ],
  }
}

const FAIR = 'Spring Career & Internship Fair 2026'
const FAIR_EVIDENCE = ['Location matched Student Union Ballroom', 'Ticket confirmed via Eventbrite']
const HACK = 'HackState 2026'
const HACK_EVIDENCE = ['Location matched Engineering Hall']
const DESIGN_CLUB = 'Design Club Portfolio Night'
const DESIGN_CLUB_EVIDENCE = ['Location matched Arts Building', 'Google Calendar invite']

interface ContactInput {
  id: string
  name: string
  headline: string
  company: string
  email?: string
  phone?: string
  links?: Contact['links']
  source: Contact['source']
  hoursAgo: number
  mode: Contact['mode']
  what: string[]
  context: string
  evidence: string[]
  confidence: number
  confirmed?: boolean
  alternatives?: string[]
  note?: string
  tags: string[]
  followedUp?: boolean
}

function contact(c: ContactInput): Contact {
  return {
    id: c.id,
    name: c.name,
    headline: c.headline,
    company: c.company,
    email: c.email,
    phone: c.phone,
    links: c.links ?? [],
    source: c.source,
    capturedAt: at(-c.hoursAgo),
    mode: c.mode,
    what: c.what,
    why: {
      context: c.context,
      evidence: c.evidence,
      confidence: c.confidence,
      confirmed: c.confirmed ?? true,
      alternatives: c.alternatives ?? [],
    },
    noteEntries: c.note
      ? [{ id: `ne-${c.id}`, at: at(-c.hoursAgo), location: c.context, body: c.note, photos: [] }]
      : [],
    tags: c.tags,
    followedUp: c.followedUp ?? false,
    pendingEnrichment: false,
  }
}

function seedContacts(): Contact[] {
  return [
    // Career fair: recruiters and hiring managers
    contact({ id: 'c1', name: 'Priya Natarajan', headline: 'University Recruiter', company: 'Lumen Health', email: 'priya@lumenhealth.com', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/priyan' }], source: 'nfc', hoursAgo: 1.2, mode: 'event', what: ['Hiring six UX and product design interns for summer 2027', 'Wants a portfolio link with two case studies', 'Suggested applying before Friday'], context: FAIR, evidence: FAIR_EVIDENCE, confidence: 0.94, tags: ['recruiter', 'internship', 'ux'] }),
    contact({ id: 'c2', name: 'Marcus Chen', headline: 'Founder', company: 'Fieldnote', email: 'marcus@fieldnote.app', phone: '+1 (628) 555-0199', links: [{ kind: 'x', url: 'https://x.com/marcuschen' }], source: 'qr', hoursAgo: 0.6, mode: 'event', what: ['Early-stage startup building a note-taking app for field researchers', 'Looking for a part-time design intern'], context: FAIR, evidence: ['Location matched Student Union Ballroom'], confidence: 0.71, confirmed: false, alternatives: ['Hallway chat (unrelated to the fair)', 'Mutual friend intro'], tags: ['startup', 'founder', 'part-time'] }),
    contact({ id: 'c3', name: 'Sam Okafor', headline: 'Software Engineer', company: 'Independent', phone: '+1 (510) 555-0117', links: [{ kind: 'github', url: 'https://github.com/samokafor' }], source: 'manual', hoursAgo: 26, mode: 'everyday', what: ['Senior in computer science, into climbing and open-source hardware', 'Offered to share his internship offer-letter checklist'], context: 'Study group at Main Library', evidence: ['Google Maps visit'], confidence: 0.82, note: 'Friend of Alex. Interviewing at three startups.', tags: ['peer', 'study-group'], followedUp: true }),
    contact({ id: 'c4', name: 'Aisha Okonkwo', headline: 'Product Design Manager', company: 'Strada', email: 'aisha@strada.io', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/aishaokonkwo' }], source: 'nfc', hoursAgo: 2, mode: 'event', what: ['Runs the summer design internship program', 'Wants to see how you explain your process, not just final screens'], context: FAIR, evidence: ['Location matched Student Union Ballroom'], confidence: 0.91, tags: ['hiring-manager', 'internship', 'design'] }),
    contact({ id: 'c5', name: 'Devon Mercer', headline: 'UX Research Intern (alum)', company: 'Halo Labs', email: 'devon@halolabs.com', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/devonmercer' }], source: 'qr', hoursAgo: 1.5, mode: 'event', what: ['Interned there last summer and offered to refer you', 'Shared how his team runs intern project demos'], context: FAIR, evidence: ['Ticket confirmed via Eventbrite'], confidence: 0.88, tags: ['alumni', 'referral', 'research'], followedUp: true }),
    contact({ id: 'c6', name: 'Tariq Bashir', headline: 'CTO', company: 'Inkline', email: 'tariq@inkline.dev', links: [{ kind: 'github', url: 'https://github.com/tariqbashir' }], source: 'nfc', hoursAgo: 3, mode: 'event', what: ['Building design tooling for engineers', 'Takes two interns each summer and pays them'], context: FAIR, evidence: ['Location matched Student Union Ballroom'], confidence: 0.85, note: 'Asked me to send a link to my GitHub and portfolio.', tags: ['startup', 'internship', 'engineering'] }),
    contact({ id: 'c7', name: 'Mei-Lin Tsai', headline: 'Brand Strategist', company: 'Meridian Studio', email: 'meilin@meridianstudio.com', links: [{ kind: 'website', url: 'https://meridianstudio.com' }], source: 'manual', hoursAgo: 8, mode: 'everyday', what: ['Offered to review your portfolio over coffee', 'Hires freelance students for branding projects'], context: 'Coffee at Brew Lab', evidence: ['Google Maps visit'], confidence: 0.79, note: 'Met through Nadia from Design Club.', tags: ['mentor', 'portfolio', 'creative'], followedUp: true }),
    contact({ id: 'c8', name: 'Jonah Reyes', headline: 'Startup Founder', company: 'Plume', email: 'jonah@plume.app', phone: '+1 (646) 555-0188', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/jonahreyes' }], source: 'qr', hoursAgo: 15, mode: 'everyday', what: ['Consumer social app for niche hobbies', 'Looking for a growth intern for the fall'], context: 'Founders Meetup on campus', evidence: ['Google Calendar invite'], confidence: 0.93, tags: ['founder', 'internship', 'growth'] }),
    contact({ id: 'c9', name: 'Cleo Fontaine', headline: 'Content Strategist', company: 'Openfield', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/cleofontaine' }], source: 'manual', hoursAgo: 20, mode: 'everyday', what: ['Hires student writers for the company blog', 'Likes case studies written in plain language'], context: 'Student Media mixer', evidence: ['Location matched Student Union'], confidence: 0.76, confirmed: false, alternatives: ['Mutual acquaintance intro'], tags: ['content', 'writing'] }),
    contact({ id: 'c10', name: 'Ravi Subramanian', headline: 'Data Analyst (alum)', company: 'Nexus Analytics', email: 'ravi@nexusanalytics.com', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/ravisub' }, { kind: 'github', url: 'https://github.com/ravisub' }], source: 'nfc', hoursAgo: 5, mode: 'event', what: ['Class of 2024, now hiring data interns', 'Happy to do a mock technical interview'], context: FAIR, evidence: ['Location matched Student Union Ballroom'], confidence: 0.82, tags: ['alumni', 'data', 'mock-interview'], followedUp: true }),
    contact({ id: 'c11', name: 'Zoe Harrington', headline: 'Product Designer', company: 'Bloom', email: 'zoe@bloom.design', links: [{ kind: 'website', url: 'https://zoeharrington.com' }], source: 'qr', hoursAgo: 4, mode: 'event', what: ['Accessibility-first design systems', 'Mentors student designers on the side'], context: FAIR, evidence: ['Ticket confirmed via Eventbrite'], confidence: 0.9, tags: ['mentor', 'design-systems', 'accessibility'] }),
    contact({ id: 'c12', name: 'Omar El-Amin', headline: 'Engineering Manager', company: 'Cascade', email: 'omar@cascade.com', phone: '+1 (213) 555-0176', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/omarelamin' }], source: 'nfc', hoursAgo: 7, mode: 'event', what: ['Manages a team of 12 front-end engineers', 'Runs a 10-week paid internship with a conversion path'], context: FAIR, evidence: ['Location matched Student Union Ballroom'], confidence: 0.84, note: 'Said strong intern projects turn into full-time offers.', tags: ['internship', 'engineering', 'full-time'], followedUp: true }),

    // HackState hackathon
    contact({ id: 'c13', name: 'Ingrid Lund', headline: 'Hackathon Judge', company: 'Greenline Capital', email: 'ingrid@greenlinecap.com', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/ingridlund' }], source: 'qr', hoursAgo: 10, mode: 'event', what: ['Judged our demo and liked the onboarding flow', 'Introduces student teams to portfolio companies'], context: HACK, evidence: [...HACK_EVIDENCE, 'Google Calendar invite'], confidence: 0.96, tags: ['judge', 'investor', 'introductions'] }),
    contact({ id: 'c14', name: 'Kwame Asante', headline: 'Motion Designer', company: 'Freelance', email: 'kwame@kwameasante.com', links: [{ kind: 'website', url: 'https://kwameasante.com' }], source: 'manual', hoursAgo: 14, mode: 'event', what: ['Teammate who built our product reveal animation', 'Open to working together on a portfolio piece'], context: HACK, evidence: HACK_EVIDENCE, confidence: 0.87, note: 'Incredible reel. Ask him to share his Figma file.', tags: ['teammate', 'motion', 'portfolio'], followedUp: true }),
    contact({ id: 'c15', name: 'Natasha Volkov', headline: 'Head of Growth', company: 'Beacon', email: 'natasha@beacon.co', phone: '+1 (929) 555-0133', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/natashavolkov' }], source: 'nfc', hoursAgo: 11, mode: 'event', what: ['Sponsor booth at the hackathon', 'Hiring a marketing and growth intern'], context: HACK, evidence: HACK_EVIDENCE, confidence: 0.89, tags: ['sponsor', 'internship', 'growth'] }),
    contact({ id: 'c16', name: 'Felix Wagner', headline: 'Industrial Designer', company: 'Aura Hardware', email: 'felix@aurahardware.com', links: [{ kind: 'website', url: 'https://aurahardware.com' }], source: 'qr', hoursAgo: 18, mode: 'event', what: ['Mentor at the hardware track', 'Looking for interns who can prototype quickly'], context: HACK, evidence: HACK_EVIDENCE, confidence: 0.81, note: 'Brought a working prototype to the mentor table.', tags: ['mentor', 'hardware', 'internship'] }),
    contact({ id: 'c17', name: 'Amara Diallo', headline: 'People Ops Lead', company: 'Verve', email: 'amara@verve.com', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/amaradiallo' }], source: 'manual', hoursAgo: 22, mode: 'everyday', what: ['Explained how to ask for a referral without feeling awkward', 'Interested in HR tech tools'], context: 'Morning run club', evidence: ['Location matched Campus Loop'], confidence: 0.7, confirmed: false, alternatives: ['Mutual friend in run club'], tags: ['advice', 'people-ops'] }),
    contact({ id: 'c18', name: 'Leo Castillo', headline: 'iOS Engineer', company: 'Tonal', email: 'leo@tonal.com', phone: '+1 (415) 555-0109', links: [{ kind: 'github', url: 'https://github.com/leocastillo' }, { kind: 'linkedin', url: 'https://linkedin.com/in/leocastillo' }], source: 'nfc', hoursAgo: 6, mode: 'event', what: ['Mentored our team on SwiftUI performance', 'Offered to look over your resume'], context: HACK, evidence: HACK_EVIDENCE, confidence: 0.86, tags: ['mentor', 'ios', 'resume'], followedUp: true }),

    // Design Club portfolio night
    contact({ id: 'c19', name: 'Simone Adler', headline: 'Creative Director', company: 'Studio Lumière', email: 'simone@studiolumiere.com', links: [{ kind: 'website', url: 'https://studiolumiere.com' }], source: 'manual', hoursAgo: 30, mode: 'event', what: ['Guest reviewer who gave sharp portfolio feedback', 'Only takes two student interns a year'], context: DESIGN_CLUB, evidence: DESIGN_CLUB_EVIDENCE, confidence: 0.78, note: 'Suggested leading with the strongest case study, not the oldest.', tags: ['reviewer', 'portfolio', 'internship'] }),
    contact({ id: 'c20', name: 'Tobias Krentz', headline: 'Backend Engineer', company: 'Orbit', email: 'tobias@orbit.dev', links: [{ kind: 'github', url: 'https://github.com/tobiaskrentz' }], source: 'qr', hoursAgo: 9, mode: 'event', what: ['Recent grad who took the same capstone course', 'Offered to share his interview prep notes'], context: FAIR, evidence: ['Location matched Student Union Ballroom'], confidence: 0.83, tags: ['alumni', 'backend', 'interview-prep'] }),
    contact({ id: 'c21', name: 'Yuki Tanaka', headline: 'Associate Product Manager', company: 'Sola', email: 'yuki@solaapp.com', phone: '+1 (510) 555-0166', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/yukitanaka' }], source: 'nfc', hoursAgo: 12, mode: 'event', what: ['Started as an intern and converted to full-time', 'Explained how APM internships are evaluated'], context: FAIR, evidence: ['Google Calendar invite'], confidence: 0.91, tags: ['product', 'alumni', 'internship'], followedUp: true }),
    contact({ id: 'c22', name: 'Hana Kobayashi', headline: 'UI Engineer', company: 'Lattice', email: 'hana@lattice.com', links: [{ kind: 'github', url: 'https://github.com/hanakobayashi' }, { kind: 'website', url: 'https://hanakobayashi.dev' }], source: 'qr', hoursAgo: 4.5, mode: 'event', what: ['Design tokens at scale', 'Contributes to open-source component libraries'], context: DESIGN_CLUB, evidence: DESIGN_CLUB_EVIDENCE, confidence: 0.9, tags: ['ui-engineering', 'open-source', 'mentor'] }),
    contact({ id: 'c23', name: 'Caleb Osei', headline: 'Illustrator', company: 'Freelance', email: 'caleb@caleboa.com', links: [{ kind: 'website', url: 'https://caleboa.com' }], source: 'manual', hoursAgo: 35, mode: 'everyday', what: ['Fellow student with an editorial illustration side business', 'Looking for long-term brand clients'], context: 'Art walk on campus', evidence: ['Location matched Arts Quad'], confidence: 0.74, note: 'Really distinct style. Might collaborate on a case study.', tags: ['peer', 'illustration', 'freelance'], followedUp: true }),
    contact({ id: 'c24', name: 'Pritha Menon', headline: 'Professor, Human-Computer Interaction', company: 'State University', email: 'pritha@stateu.edu', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/prithamenon' }], source: 'nfc', hoursAgo: 2.5, mode: 'everyday', what: ['Offered to write a recommendation letter', 'Keeps a list of local companies that hire HCI students'], context: 'Office hours, Ritter Hall', evidence: ['Location matched Ritter Hall'], confidence: 0.88, tags: ['professor', 'recommendation', 'hci'] }),
    contact({ id: 'c25', name: 'Elliot Marsh', headline: 'Alumni Mentor', company: 'Sequoia Scout', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/elliotmarsh' }], source: 'qr', hoursAgo: 13, mode: 'event', what: ['Mentors three students each semester through the alumni network', 'Replies to messages the same day'], context: FAIR, evidence: ['Google Calendar invite', 'Location matched Student Union Ballroom'], confidence: 0.95, note: 'Follows up fast. Send a short thank-you today.', tags: ['alumni', 'mentor', 'network'], followedUp: true }),
    contact({ id: 'c26', name: 'Fatima Al-Rashid', headline: 'Marketing Lead', company: 'Cobalt', email: 'fatima@cobalt.io', phone: '+1 (312) 555-0154', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/fatimaalrashid' }], source: 'manual', hoursAgo: 17, mode: 'everyday', what: ['Hiring a marketing intern for the fall', 'Likes applicants who send a short one-page plan'], context: 'Alumni Coffee Chat', evidence: ['Google Maps visit'], confidence: 0.8, tags: ['alumni', 'marketing', 'internship'] }),
    contact({ id: 'c27', name: 'Santiago Vega', headline: 'Spatial Designer', company: 'Volumetric Co', email: 'santiago@volumetric.co', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/santiagov' }], source: 'nfc', hoursAgo: 3.5, mode: 'event', what: ['AR and VR experience design', 'Taking one design intern for the summer'], context: FAIR, evidence: ['Location matched Student Union Ballroom'], confidence: 0.87, tags: ['design', 'internship', 'spatial'] }),
    contact({ id: 'c28', name: 'Imogen Clarke', headline: 'Career Advisor', company: 'State University Career Center', email: 'imogen@stateu.edu', links: [{ kind: 'linkedin', url: 'https://linkedin.com/in/imogenclarke' }], source: 'manual', hoursAgo: 24, mode: 'everyday', what: ['Books resume reviews and mock interviews', 'Knows which employers are visiting campus this spring'], context: 'Career Center drop-in', evidence: ['Location matched Career Center'], confidence: 0.72, confirmed: false, alternatives: ['Workshop on resumes'], note: 'Introduced by Chris from the Design Club.', tags: ['career-center', 'resume', 'advisor'] }),
  ]
}

export function createSeedState(): AppState {
  return {
    // Event and Custom start as copies of Everyday.
    profiles: { everyday: seedProfile(), event: seedProfile(), custom: seedProfile() },
    settings: {
      mode: 'event' as const,
      autoMode: true,
      autoOffline: true,
      manualOffline: false,
      autoSync: false,
      theme: 'light',
      brand: '#0f766e',
      cardStyle: 'gradient',
      matchUiToCard: true,
      companion: {
        animal: 'capybara',
        name: 'Kapi',
        color: null,
        photo: null,
        badges: {
          everyday: ['coffee', 'music', 'sun'],
          custom: ['briefcase', 'grad-cap', 'star'],
          event: ['sprout', 'camera', 'coffee'],
        },
        badgesVisible: true,
        showOnCard: true,
      },
      priorities: ['email', 'linkedin', 'website', 'phone', 'social'],
      passiveCollection: true,
      statusBroadcast: true,
      integrations: {
        'Google Calendar': true,
        Eventbrite: true,
        Todoist: true,
        Indeed: true,
        Gmail: true,
        'Google Maps': true,
        Zoom: false,
        Slack: false,
        'Canvas (syllabus)': true,
      },
      goals: [
        'Land a summer 2027 UX or product design internship',
        'Meet 3 recruiters at the career fair',
        'Find an alumni mentor in product design',
      ],
      broadcastMessages: {
        everyday: 'Out and about — happy to connect!',
        event: 'At the career fair — open to chat about internships.',
        custom: 'Open to coffee chats and informational interviews.',
      },
      rules: [
        {
          id: 'r3',
          mode: 'everyday' as const,
          trigger: 'At cafes, the library or hangouts',
          enabled: true,
        },
        {
          id: 'r1',
          mode: 'event' as const,
          trigger: 'Arriving at a ticketed or calendar event venue',
          enabled: true,
        },
        {
          id: 'r2',
          mode: 'custom' as const,
          trigger: 'Weekdays 9:00 – 17:00',
          enabled: true,
          timeFrom: '09:00',
          timeTo: '17:00',
          days: [1, 2, 3, 4, 5],
        },
      ],
      learnedPreferences: [
        'Prefers email over LinkedIn for follow-ups',
        'Tends to forget thank-you notes after a busy fair',
      ],
      defaultShareMethod: null,
      defaultReadMethod: null,
      customModeName: 'Custom',
      customCardFields: [],
      customQrStyle: 'squares' as const,
      customQrColor: '',
      shareResume: false,
      defaultContactSort: 'az' as const,
    },
    contacts: seedContacts(),
    events: [
      {
        id: 'e1',
        title: FAIR,
        venue: 'Student Union Ballroom, State University',
        start: at(-3),
        end: at(5),
        source: 'Eventbrite',
        ticketed: true,
      },
      {
        id: 'e2',
        title: 'Informational interview with Dana (alumna)',
        venue: 'Zoom',
        start: at(20),
        end: at(21),
        source: 'Google Calendar',
        ticketed: false,
      },
    ],
    todos: [
      { id: 't1', text: 'Send thank-you emails to career fair recruiters', done: false, source: 'Todoist' },
      { id: 't2', text: 'Apply to the Lumen Health UX internship by Friday', done: false, source: 'Todoist' },
      { id: 't3', text: 'Update resume with the spring capstone project', done: true, source: 'Todoist' },
    ],
    jobs: [
      { id: 'j1', role: 'UX Design Intern', company: 'Lumen Health', source: 'Indeed' },
      { id: 'j2', role: 'Product Design Intern', company: 'Strada', source: 'Indeed' },
      { id: 'j3', role: 'Associate Product Manager Intern', company: 'Sola', source: 'Indeed' },
    ],
    watchSaved: [],
    orphanNotes: [],
    suggestions: [],
    memories: [],
    onboarding: { status: 'done', step: 0 },
    log: [
      {
        id: 'g1',
        agent: 2,
        message: `Matched location to ${FAIR} (Eventbrite ticket).`,
        at: at(-3),
      },
      {
        id: 'g2',
        agent: 6,
        message: 'Switched mode to Event and updated your broadcast status.',
        at: at(-3),
      },
      {
        id: 'g3',
        agent: 3,
        message: 'Captured Priya Natarajan (Lumen Health recruiter) via NFC tap and transcribed 3 notes.',
        at: at(-1.2),
      },
    ],
  }
}

/** A brand-new account starts with none of the demo data: just their name and email. */
export function createEmptyState(user: { name: string; email: string }): AppState {
  const seed = createSeedState()
  const profile = (): Profile => ({
    name: user.name,
    headline: '',
    company: '',
    email: user.email,
    phone: '',
    bio: '',
    qrUrl: '',
    links: [],
  })
  return {
    ...seed,
    profiles: { everyday: profile(), event: profile(), custom: profile() },
    settings: {
      ...seed.settings,
      mode: 'everyday',
      goals: [],
      learnedPreferences: [],
      companion: { ...seed.settings.companion, photo: null },
    },
    contacts: [createDemoContact()],
    events: [],
    todos: [],
    jobs: [],
    log: [],
    onboarding: { status: 'offer', step: 0 },
  }
}
