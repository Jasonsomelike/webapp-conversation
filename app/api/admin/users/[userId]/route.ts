import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminSession } from '@/lib/admin'
import { getSession } from '@/lib/session'
import { db, withDatabaseRetry } from '@/lib/db'
import { softDeleteAppUser } from '@/lib/account-lifecycle'

const userIdSchema = z.string().uuid()
const deleteSchema = z.object({
  username: z.string().trim().min(1).max(32),
})

const requireAdmin = async () => {
  const session = await getSession()
  return session && isAdminSession(session) ? session : null
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireAdmin()
  if (!session)
  { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const { userId } = await params
  const parsed = userIdSchema.safeParse(userId)
  if (!parsed.success)
  { return NextResponse.json({ error: '用户 ID 无效' }, { status: 400 }) }

  try {
    const body = await request.json().catch(() => ({}))
    const confirmation = deleteSchema.safeParse(body)
    if (!confirmation.success)
    { return NextResponse.json({ error: '请先输入完整账户名确认注销' }, { status: 400 }) }

    const user = await withDatabaseRetry(() => db.appUser.findUnique({
      where: { id: parsed.data },
      select: { username: true },
    }))
    if (!user)
    { return NextResponse.json({ error: '用户不存在或已注销' }, { status: 404 }) }
    if (confirmation.data.username !== user.username)
    { return NextResponse.json({ error: '账户名确认不匹配' }, { status: 400 }) }

    await softDeleteAppUser({
      appUserId: parsed.data,
      actorUserId: session.id,
      allowSelf: false,
    })
    return NextResponse.json({ ok: true })
  }
  catch (error) {
    if (error instanceof Error && error.message === 'CANNOT_DELETE_SELF')
    { return NextResponse.json({ error: '不能在后台删除当前登录账号' }, { status: 400 }) }
    if (error instanceof Error && error.message === 'USER_NOT_FOUND_OR_DELETED')
    { return NextResponse.json({ error: '用户不存在或已注销' }, { status: 404 }) }
    console.error('[admin-delete-user] failed', error)
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 })
  }
}
