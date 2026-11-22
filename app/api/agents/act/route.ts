import { z } from 'zod'
import { getWatsonx } from '@/lib/watsonx'
import { jsonSchemaFormat } from '@/lib/watsonx-format'

export const maxDuration = 60

const MODEL_ID = 'meta-llama/llama-3-3-70b-instruct'
const PROJECT_ID = process.env.WATSONX_PROJECT_ID!

const requestSchema = z.object({
  sender: z.object({ name: z.string(), headline: z.string(), company: z.string() }),
  contact: z.object({
    name: z.string(),
    headline: z.string(),
    company: z.string(),
    what: z.array(z.string()),
    notes: z.string(),
    context: z.string(),
  }),
  mode: z.enum(['everyday', 'event', 'custom']),
  goals: z.array(z.string()),
  preferences: z.array(z.string()),
})

const followUpSchema = z.object({
  subject: z.string(),
  body: z.string().describe('A short, warm follow-up email body, signed with the sender first name'),
  bullets: z.array(z.string()).describe('2-4 bullet summary of the conversation'),
  suggestedAction: z
    .string()
    .describe('One concrete next step, e.g. "Schedule a 20-min portfolio review next week"'),
})

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 })
  const { sender, contact, mode, goals, preferences } = parsed.data

  try {
    const { result } = await getWatsonx().textChat({
      modelId: MODEL_ID,
      projectId: PROJECT_ID,
      maxTokens: 1024,
      responseFormat: jsonSchemaFormat('follow_up', followUpSchema),
      messages: [
        {
          role: 'system',
          content: `You are Agent 5 ("Doer") in a networking app. Draft a follow-up for the user to review before sending.
Tone: ${mode === 'everyday' ? 'friendly and relaxed' : 'professional but human'}. Keep the email under 120 words. Do not fabricate facts beyond what is provided.
User goals: ${goals.join('; ') || 'none'}. Learned preferences: ${preferences.join('; ') || 'none'}.`,
        },
        {
          role: 'user',
          content: `Sender: ${sender.name}, ${sender.headline} at ${sender.company}.
Contact: ${contact.name}, ${contact.headline} at ${contact.company}.
Where we met: ${contact.context}.
What they shared: ${contact.what.join('; ') || 'nothing recorded'}.
Notes: ${contact.notes || 'none'}.`,
        },
      ],
    })

    const raw = result.choices?.[0]?.message?.content ?? ''
    const output = followUpSchema.parse(JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw)))
    return Response.json({ followUp: output })
  } catch (error) {
    console.error('[watsonx] doer agent failed', error)
    const message =
      error instanceof Error && error.message.startsWith('Missing watsonx.ai environment variables')
        ? error.message
        : 'Doer agent failed.'
    return Response.json({ error: message }, { status: 502 })
  }
}
