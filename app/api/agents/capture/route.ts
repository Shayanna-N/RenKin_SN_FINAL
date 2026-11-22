import { z } from 'zod'
import { getWatsonx } from '@/lib/watsonx'
import { jsonSchemaFormat } from '@/lib/watsonx-format'

export const maxDuration = 60

const MODEL_ID = 'meta-llama/llama-3-2-90b-vision-instruct'
const PROJECT_ID = process.env.WATSONX_PROJECT_ID!

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

  const systemPrompt = `You are Agent 3 ("Scribe") in a networking app. Extract the WHO (the person) and the WHAT (information they shared) from a business card, flier, voice-memo transcript or note.
Networking mode: ${mode}. Capture depth: ${depth} (light = 1-2 bullets, standard = 2-4, detailed = up to 6).
${context ? `Known context: ${context}.` : ''}
Never invent contact details that are not present. Use null for missing email/phone.`

  // Build the user message content, including image if provided
  type TextPart = { type: 'text'; text: string }
  type ImagePart = { type: 'image_url'; image_url: { url: string } }
  const userContent: Array<TextPart | ImagePart> = [
    { type: 'text', text: text ? `Input:\n${text}` : 'Read this card or flier.' },
  ]
  if (image) {
    const match = image.match(/^data:(image\/[\w.+-]+);base64,(.+)$/)
    if (!match) return Response.json({ error: 'Invalid image.' }, { status: 400 })
    userContent.push({ type: 'image_url', image_url: { url: image } })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { result } = await getWatsonx().textChat({
      modelId: MODEL_ID,
      projectId: PROJECT_ID,
      maxTokens: 1024,
      responseFormat: jsonSchemaFormat('captured_person', personSchema),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent as any },
      ],
    } as any)

    const raw = result.choices?.[0]?.message?.content ?? ''
    const output = personSchema.parse(JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw)))
    return Response.json({
      person: {
        ...output,
        email: output.email ?? undefined,
        phone: output.phone ?? undefined,
      },
    })
  } catch (error) {
    console.error('[watsonx] capture agent failed', error)
    return Response.json({ error: 'Scribe agent failed.' }, { status: 502 })
  }
}
