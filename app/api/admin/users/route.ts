import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db, withDatabaseRetry } from '@/lib/db'
import { isAdminSession } from '@/lib/admin'
import { getSession } from '@/lib/session'
import { isThemeId } from '@/lib/themes'
import { deleteAppUserAccount, ensureAccountLifecycleStorage, isAppUserDeleted } from '@/lib/account-lifecycle'
import { listVisibleAdminUsers } from '@/lib/admin-users'
import { isGuestAccountMarker } from '@/lib/guest-lifecycle'

const updateSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(64),
  theme: z.string().trim(),
  unlock: z.boolean().optional(),
})

const batchDeleteSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('guests'),
    confirmText: z.literal('DELETE_GUESTS'),
  }),
  z.object({
    mode: z.literal('username_contains'),
    include: z.string().trim().min(1).max(32),
    exclude: z.string().trim().max(32).optional().default(''),
    confirmText: z.literal('DELETE_MATCHED_USERS'),
  }),
])

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

export async function DELETE(request: Request) {
  const session = await requireAdmin()
  if (!session)
  { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const parsed = batchDeleteSchema.safeParse(await request.json())
  if (!parsed.success)
  { return NextResponse.json({ error: '批量删除参数无效' }, { status: 400 }) }

  await ensureAccountLifecycleStorage()
  const candidates = await withDatabaseRetry(() => db.appUser.findMany({
    where: parsed.data.mode === 'guests'
      ? {
        OR: [
          { username: { startsWith: 'guest_' } },
          { securityQuestion: '游客临时会话' },
        ],
      }
      : {},
    select: {
      id: true,
      username: true,
      securityQuestion: true,
    },
    orderBy: { createdAt: 'asc' },
  }))

  const include = parsed.data.mode === 'username_contains' ? parsed.data.include.toLowerCase() : ''
  const exclude = parsed.data.mode === 'username_contains' ? parsed.data.exclude.toLowerCase() : ''
  const matched = candidates.filter((user) => {
    if (user.id === session.id)
    { return false }
    if (parsed.data.mode === 'guests')
    { return isGuestAccountMarker(user.username, user.securityQuestion) }
    const username = user.username.toLowerCase()
    return username.includes(include) && (!exclude || !username.includes(exclude))
  })

  const deleted: Array<{ id: string, username: string }> = []
  const failed: Array<{ id: string, username: string, error: string }> = []
  for (const user of matched) {
    try {
      await deleteAppUserAccount({
        appUserId: user.id,
        actorUserId: session.id,
      })
      deleted.push({ id: user.id, username: user.username })
    }
    catch (error) {
      failed.push({
        id: user.id,
        username: user.username,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    matched: matched.length,
    deleted,
    failed,
  }, { status: failed.length ? 207 : 200 })
}
