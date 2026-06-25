import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdminSession } from '@/lib/admin'
import { getSession } from '@/lib/session'
import { softDeleteAppUser } from '@/lib/account-lifecycle'

const userIdSchema = z.string().uuid()

const requireAdmin = async () => {
  const session = await getSession()
  return session && isAdminSession(session) ? session : null
}

export async function DELETE(
  _request: Request,
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
