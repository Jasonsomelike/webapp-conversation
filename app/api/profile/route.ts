import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db, isDatabaseConfigured } from '@/lib/db'
import { getSession } from '@/lib/session'
import { setSessionCookie } from '@/lib/session'

const profileSchema = z.object({
  displayName: z.string().trim().min(1, '显示名称不能为空').max(64, '显示名称不能超过 64 个字符'),
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

  const { displayName, ...profileData } = parsed.data
  const [profile, user] = await db.$transaction([
    db.userProfile.upsert({
      where: { appUserId: session.id },
      update: profileData,
      create: { appUserId: session.id, ...profileData },
    }),
    db.appUser.update({
      where: { id: session.id },
      data: { displayName },
      select: { displayName: true },
    }),
  ])
  const response = NextResponse.json({ profile, displayName: user.displayName })
  setSessionCookie(response, { ...session, name: user.displayName, createdAt: Date.now() })
  return response
}
