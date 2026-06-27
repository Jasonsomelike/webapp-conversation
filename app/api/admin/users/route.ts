import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db, withDatabaseRetry } from '@/lib/db'
import { isAdminSession } from '@/lib/admin'
import { getSession } from '@/lib/session'
import { isThemeId } from '@/lib/themes'
import { ensureAccountLifecycleStorage, isAppUserDeleted } from '@/lib/account-lifecycle'
import { listVisibleAdminUsers } from '@/lib/admin-users'

const updateSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(64),
  theme: z.string().trim(),
  unlock: z.boolean().optional(),
})

const requireAdmin = async () => {
  const session = await getSession()
  return session && isAdminSession(session) ? session : null
}

export async function GET() {
  if (!await requireAdmin())
  { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const users = await listVisibleAdminUsers()
  return NextResponse.json({ users })
}

export async function PATCH(request: Request) {
  if (!await requireAdmin())
  { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success || !isThemeId(parsed.data.theme))
  { return NextResponse.json({ error: '用户信息无效' }, { status: 400 }) }

  await ensureAccountLifecycleStorage()
  if (await isAppUserDeleted(parsed.data.userId))
  { return NextResponse.json({ error: '用户不存在或已注销' }, { status: 404 }) }

  const user = await withDatabaseRetry(() => db.appUser.update({
    where: { id: parsed.data.userId },
    data: {
      displayName: parsed.data.displayName,
      theme: parsed.data.theme,
      ...(parsed.data.unlock ? { failedLoginCount: 0, lockedUntil: null } : {}),
    },
    select: {
      id: true,
      displayName: true,
      theme: true,
      failedLoginCount: true,
      lockedUntil: true,
    },
  }))
  return NextResponse.json({ user })
}
