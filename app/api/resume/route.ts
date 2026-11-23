import { put } from '@vercel/blob'
import { count, desc, eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { resumeDocument } from '@/lib/db/schema'
import { MAX_RESUME_BYTES, MAX_RESUMES_PER_USER, cleanName, isPdf, requireSessionUser } from '@/lib/resume-server'

export async function GET() {
  const user = await requireSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select({
      id: resumeDocument.id,
      name: resumeDocument.name,
      size: resumeDocument.size,
      uploadedAt: resumeDocument.uploadedAt,
    })
    .from(resumeDocument)
    .where(eq(resumeDocument.userId, user.id))
    .orderBy(desc(resumeDocument.uploadedAt))

  return NextResponse.json({ documents: rows.map((r) => ({ ...r, uploadedAt: r.uploadedAt.toISOString() })) })
}

export async function POST(request: NextRequest) {
  const user = await requireSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size === 0 || file.size > MAX_RESUME_BYTES) {
    return NextResponse.json({ error: 'PDFs must be under 4 MB' }, { status: 413 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!isPdf(bytes)) return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 415 })

  const [{ total }] = await db.select({ total: count() }).from(resumeDocument).where(eq(resumeDocument.userId, user.id))
  if (total >= MAX_RESUMES_PER_USER) {
    return NextResponse.json({ error: `You can store up to ${MAX_RESUMES_PER_USER} documents. Delete one first.` }, { status: 409 })
  }

  const id = crypto.randomUUID()
  const blob = await put(`resumes/${user.id}/${id}.pdf`, new Blob([bytes], { type: 'application/pdf' }), {
    access: 'private',
    contentType: 'application/pdf',
  })

  const [row] = await db
    .insert(resumeDocument)
    .values({ id, userId: user.id, name: cleanName(file.name), pathname: blob.pathname, size: bytes.length })
    .returning()

  return NextResponse.json({
    document: { id: row.id, name: row.name, size: row.size, uploadedAt: row.uploadedAt.toISOString() },
  })
}
