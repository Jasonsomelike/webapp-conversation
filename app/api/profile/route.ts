import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db, isDatabaseConfigured } from '@/lib/db'
import { getSession } from '@/lib/session'

const profileSchema = z.object({
  learningStage: z.string().trim().min(1).max(64),
  preferredStyle: z.string().trim().min(1).max(64),
  target: z.string().trim().min(1).max(128),
})

export async function GET() {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!isDatabaseConfigured())
  { return NextResponse.json({ error: 'Database not configured' }, { status: 503 }) }

  const profile = await db.userProfile.findUnique({ where: { appUserId: session.id } })
  return NextResponse.json({ user: session, profile })
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!isDatabaseConfigured())
  { return NextResponse.json({ error: 'Database not configured' }, { status: 503 }) }

  const parsed = profileSchema.safeParse(await request.json())
  if (!parsed.success)
  { return NextResponse.json({ error: '学习偏好信息不完整' }, { status: 400 }) }

  const profile = await db.userProfile.upsert({
    where: { appUserId: session.id },
    update: parsed.data,
    create: { appUserId: session.id, ...parsed.data },
  })
  return NextResponse.json({ profile })
}
