import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 60

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
  mode: z.enum(['casual', 'business', 'event']),
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
    const { output } = await generateText({
      model: 'openai/gpt-4o-mini',
      system: `You are Agent 5 ("Doer") in a networking app. Draft a follow-up for the user to review before sending.
Tone: ${mode === 'casual' ? 'friendly and relaxed' : 'professional but human'}. Keep the email under 120 words. Do not fabricate facts beyond what is provided.
User goals: ${goals.join('; ') || 'none'}. Learned preferences: ${preferences.join('; ') || 'none'}.`,
      prompt: `Sender: ${sender.name}, ${sender.headline} at ${sender.company}.
Contact: ${contact.name}, ${contact.headline} at ${contact.company}.
Where we met: ${contact.context}.
What they shared: ${contact.what.join('; ') || 'nothing recorded'}.
Notes: ${contact.notes || 'none'}.`,
      output: Output.object({ schema: followUpSchema }),
    })
    return Response.json({ followUp: output })
  } catch (error) {
    console.error('[v0] doer agent failed', error)
    return Response.json({ error: 'Doer agent failed.' }, { status: 502 })
  }
}
