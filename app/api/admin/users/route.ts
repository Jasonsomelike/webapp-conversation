import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db, withDatabaseRetry } from '@/lib/db'
import { isAdminSession } from '@/lib/admin'
import { getSession } from '@/lib/session'
import { isThemeId } from '@/lib/themes'
import {
  cleanupHiddenAdminUsers,
  deleteAppUserAccountByUsername,
  ensureAccountLifecycleStorage,
  isAppUserDeleted,
} from '@/lib/account-lifecycle'
import { listVisibleAdminUsers } from '@/lib/admin-users'

const updateSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(64),
  theme: z.string().trim(),
  unlock: z.boolean().optional(),
})
const cleanupSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('hidden-test-users') }),
  z.object({ mode: z.literal('username'), username: z.string().trim().min(1).max(32) }),
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

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session)
  { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const parsed = cleanupSchema.safeParse(await request.json())
  if (!parsed.success)
  { return NextResponse.json({ error: '清理参数无效' }, { status: 400 }) }

  try {
    if (parsed.data.mode === 'hidden-test-users') {
      const result = await cleanupHiddenAdminUsers({ actorUserId: session.id })
      return NextResponse.json(result)
    }

    await deleteAppUserAccountByUsername({
      username: parsed.data.username,
      actorUserId: session.id,
      allowSelf: false,
    })
    return NextResponse.json({ ok: true, deleted: 1, users: [parsed.data.username] })
  }
  catch (error) {
    if (error instanceof Error && error.message === 'CANNOT_DELETE_SELF')
    { return NextResponse.json({ error: '不能在后台删除当前登录账号' }, { status: 400 }) }
    if (error instanceof Error && error.message === 'USER_NOT_FOUND_OR_DELETED')
    { return NextResponse.json({ error: '用户不存在或已注销' }, { status: 404 }) }
    console.error('[admin-cleanup-users] failed', error)
    return NextResponse.json({ error: '清理用户失败' }, { status: 500 })
  }
}
