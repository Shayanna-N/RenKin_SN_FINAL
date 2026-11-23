import { del, get } from '@vercel/blob'
import { and, eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { resumeDocument } from '@/lib/db/schema'
import { requireSessionUser } from '@/lib/resume-server'

async function findOwned(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(resumeDocument)
    .where(and(eq(resumeDocument.id, id), eq(resumeDocument.userId, userId)))
  return row ?? null
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const row = await findOwned(id, user.id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await get(row.pathname, { access: 'private' })
  if (!result || result.statusCode !== 200) return NextResponse.json({ error: 'File missing' }, { status: 404 })

  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': 'application/pdf',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const row = await findOwned(id, user.id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await del(row.pathname).catch(() => undefined)
  await db.delete(resumeDocument).where(and(eq(resumeDocument.id, id), eq(resumeDocument.userId, user.id)))
  return NextResponse.json({ ok: true })
}
