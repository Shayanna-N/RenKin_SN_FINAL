import { WatsonXAI } from '@ibm-cloud/watsonx-ai'
import { z } from 'zod'
import { jsonSchemaFormat } from '@/lib/watsonx-format'

export const maxDuration = 60

const watsonx = WatsonXAI.newInstance({
  version: '2024-05-31',
  serviceUrl: process.env.WATSONX_AI_URL!,
})

const MODEL_ID = 'meta-llama/llama-3-3-70b-instruct'
const PROJECT_ID = process.env.WATSONX_PROJECT_ID!

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(30),
  snapshot: z.object({
    name: z.string(),
    mode: z.enum(['everyday', 'event', 'custom']),
    activeEvent: z.string().nullable(),
    priorities: z.array(z.string()),
    goals: z.array(z.string()),
    contacts: z.array(
      z.object({
        name: z.string(),
        company: z.string(),
        context: z.string(),
        followedUp: z.boolean(),
        what: z.array(z.string()),
      }),
    ),
    todos: z.array(z.string()),
    jobs: z.array(z.string()),
  }),
})

const replySchema = z.object({
  reply: z.string().describe('Concise, friendly reply (max ~80 words)'),
  actions: z
    .array(
      z.discriminatedUnion('type', [
        z.object({
          type: z.literal('set_mode'),
          mode: z.enum(['everyday', 'event', 'custom']),
        }),
        z.object({ type: z.literal('add_goal'), goal: z.string() }),
        z.object({
          type: z.literal('set_priorities'),
          priorities: z.array(z.enum(['email', 'linkedin', 'phone', 'website', 'social'])),
        }),
        z.object({ type: z.literal('learn_preference'), preference: z.string() }),
      ]),
    )
    .describe('Changes to apply to the app. Empty if the user only asked a question.'),
})

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 })
  const { messages, snapshot } = parsed.data

  try {
    const { result } = await watsonx.textChat({
      modelId: MODEL_ID,
      projectId: PROJECT_ID,
      maxTokens: 1024,
      responseFormat: jsonSchemaFormat('companion_reply', replySchema),
      messages: [
        {
          role: 'system',
          content: `You are Agent 6 ("Companion"), the user-facing buddy in a real-time networking app. You relay instructions to Agent 1 (settings/compliance) via actions.
You can switch modes (everyday, event, custom), add networking goals, reorder contact channel priorities, and record learned preferences.
Only include an action when the user asks for a change or clearly states a preference. Answer questions using the snapshot. Never invent contacts.
Snapshot: ${JSON.stringify(snapshot)}`,
        },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const raw = result.choices?.[0]?.message?.content ?? ''
    const output = replySchema.parse(JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw)))
    return Response.json(output)
  } catch (error) {
    console.error('[watsonx] companion agent failed', error)
    return Response.json({ error: 'Companion agent failed.' }, { status: 502 })
  }
}
