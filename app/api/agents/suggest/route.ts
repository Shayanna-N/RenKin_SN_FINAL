import { z } from 'zod'
import { getWatsonx } from '@/lib/watsonx'
import { jsonSchemaFormat } from '@/lib/watsonx-format'

export const maxDuration = 60

const MODEL_ID = 'meta-llama/llama-3-3-70b-instruct'
const PROJECT_ID = process.env.WATSONX_PROJECT_ID!

const requestSchema = z.object({
  companionName: z.string().max(40),
  mode: z.enum(['everyday', 'event', 'custom']),
  user: z.object({
    name: z.string(),
    headline: z.string(),
    company: z.string(),
    bio: z.string(),
    interests: z.array(z.string()),
    goals: z.array(z.string()),
    preferences: z.array(z.string()),
    currentEvent: z.string().nullable(),
  }),
  network: z.object({
    todos: z.array(z.object({ text: z.string(), done: z.boolean() })),
    jobs: z.array(z.object({ role: z.string(), company: z.string() })),
    contacts: z.array(
      z.object({
        name: z.string(),
        headline: z.string(),
        company: z.string(),
        context: z.string(),
        what: z.array(z.string()),
        followedUp: z.boolean(),
        notes: z.string(),
      }),
    ),
    notes: z.array(z.string()),
  }),
  avoid: z.array(z.string()).max(40),
})

const suggestionSchema = z.object({
  actions: z
    .array(
      z.object({
        text: z.string().describe('One concrete next step, imperative, under 18 words'),
        reason: z.string().describe('One short sentence on why, grounded in the data'),
        agent: z.enum(['Context', 'Scribe', 'Organizer', 'Doer']),
      }),
    )
    .describe('Exactly 4 suggested actions'),
  starters: z
    .array(
      z.object({
        text: z.string().describe('A first-person conversation starter, under 25 words'),
        reason: z.string().describe('One short sentence on which part of the user context it draws on'),
      }),
    )
    .describe('Exactly 4 conversation starters'),
})

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 })
  const { companionName, mode, user, network, avoid } = parsed.data

  try {
    const { result } = await getWatsonx().textChat({
      modelId: MODEL_ID,
      projectId: PROJECT_ID,
      maxTokens: 1400,
      responseFormat: jsonSchemaFormat('companion_suggestions', suggestionSchema),
      messages: [
        {
          role: 'system',
          content: `You are ${companionName}, the Companion in a networking app. You coordinate four specialist agents and merge what they find:
- Context: where the user is and what they are doing now.
- Scribe: what the user's notes and contacts' shared details reveal.
- Organizer: gaps and patterns such as missed follow-ups, open to-dos and job targets.
- Doer: concrete actions that can be drafted or scheduled.
Return exactly 4 "actions", each credited to the agent whose data it came from, and exactly 4 "starters".
Starters are things the user could say to someone new. Build them ONLY from the user's own profile, interests, goals, preferences and current event. Never mention or draw on other contacts, to-dos or notes in a starter.
Tone for mode "${mode}": ${mode === 'everyday' ? 'friendly and relaxed' : 'professional but human'}.
Do not invent facts. Do not repeat or closely paraphrase anything in the avoid list.`,
        },
        {
          role: 'user',
          content: `USER
${user.name}, ${user.headline} at ${user.company}.
Bio: ${user.bio || 'none'}
Interests: ${user.interests.join('; ') || 'none'}
Goals: ${user.goals.join('; ') || 'none'}
Learned preferences: ${user.preferences.join('; ') || 'none'}
Current event: ${user.currentEvent ?? 'none detected'}

NETWORK DATA (for actions only)
To-dos: ${network.todos.map((t) => `${t.done ? '[done] ' : ''}${t.text}`).join('; ') || 'none'}
Job targets: ${network.jobs.map((j) => `${j.role} at ${j.company}`).join('; ') || 'none'}
Contacts:
${
  network.contacts
    .map(
      (c) =>
        `- ${c.name}, ${c.headline} at ${c.company}. Met: ${c.context}. Shared: ${c.what.join('; ') || 'nothing'}. Followed up: ${c.followedUp ? 'yes' : 'no'}. Notes: ${c.notes || 'none'}`,
    )
    .join('\n') || 'none'
}
Unassigned notes: ${network.notes.join(' | ') || 'none'}

AVOID (already shown or kept): ${avoid.join(' | ') || 'nothing'}`,
        },
      ],
    })

    const raw = result.choices?.[0]?.message?.content ?? ''
    const output = suggestionSchema.parse(JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw)))
    return Response.json(output)
  } catch (error) {
    console.error('[watsonx] companion suggestions failed', error)
    const message =
      error instanceof Error && error.message.startsWith('Missing watsonx.ai environment variables')
        ? error.message
        : 'Could not generate suggestions.'
    return Response.json({ error: message }, { status: 502 })
  }
}
