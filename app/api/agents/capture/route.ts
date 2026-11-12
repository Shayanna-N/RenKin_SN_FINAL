import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 60

const personSchema = z.object({
  name: z.string().describe('Full name of the person, or "Unknown" if not present'),
  headline: z.string().describe('Job title or role, empty string if unknown'),
  company: z.string().describe('Company or organization, empty string if unknown'),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  links: z.array(
    z.object({
      kind: z.enum(['linkedin', 'website', 'portfolio', 'instagram', 'x', 'github', 'calendly', 'other']),
      url: z.string(),
    }),
  ),
  what: z
    .array(z.string())
    .describe('Short, factual bullet points of what was shared or discussed'),
  tags: z.array(z.string()).describe('1-3 lowercase kebab-case tags'),
})

const requestSchema = z.object({
  text: z.string().max(8000).optional(),
  image: z.string().max(8_000_000).optional(),
  mode: z.enum(['everyday', 'event', 'custom']),
  depth: z.enum(['light', 'standard', 'detailed']),
  context: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  const parsed = requestSchema.safeParse(await req.json())
  if (!parsed.success || (!parsed.data.text && !parsed.data.image)) {
    return Response.json({ error: 'Provide text or an image.' }, { status: 400 })
  }
  const { text, image, mode, depth, context } = parsed.data

  const instructions = `You are Agent 3 ("Scribe") in a networking app. Extract the WHO (the person) and the WHAT (information they shared) from a business card, flier, voice-memo transcript or note.
Networking mode: ${mode}. Capture depth: ${depth} (light = 1-2 bullets, standard = 2-4, detailed = up to 6).
${context ? `Known context: ${context}.` : ''}
Never invent contact details that are not present. Use null for missing email/phone.`

  const content: Array<
    { type: 'text'; text: string } | { type: 'file'; mediaType: string; data: string }
  > = [{ type: 'text', text: text ? `Input:\n${text}` : 'Read this card or flier.' }]
  if (image) {
    const match = image.match(/^data:(image\/[\w.+-]+);base64,(.+)$/)
    if (!match) return Response.json({ error: 'Invalid image.' }, { status: 400 })
    content.push({ type: 'file', mediaType: match[1], data: match[2] })
  }

  try {
    const { output } = await generateText({
      model: 'openai/gpt-5.4-mini',
      system: instructions,
      messages: [{ role: 'user', content }],
      output: Output.object({ schema: personSchema }),
    })
    return Response.json({
      person: {
        ...output,
        email: output.email ?? undefined,
        phone: output.phone ?? undefined,
      },
    })
  } catch (error) {
    console.error('[v0] capture agent failed', error)
    return Response.json({ error: 'Scribe agent failed.' }, { status: 502 })
  }
}
