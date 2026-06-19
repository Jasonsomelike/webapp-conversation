import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db, isDatabaseConfigured } from '@/lib/db'
import { getSessionFromRequest, setSessionCookie } from '@/lib/session'
import { isThemeId } from '@/lib/themes'

export async function PUT(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!isDatabaseConfigured())
  { return NextResponse.json({ error: 'Database not configured' }, { status: 503 }) }

  const { theme } = await request.json()
  if (typeof theme !== 'string' || !isThemeId(theme))
  { return NextResponse.json({ error: 'Invalid theme' }, { status: 400 }) }

  await db.appUser.update({ where: { id: session.id }, data: { theme } })
  const response = NextResponse.json({ ok: true, theme })
  setSessionCookie(response, { ...session, theme, createdAt: Date.now() })
  return response
}
