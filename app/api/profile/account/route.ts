import { NextResponse } from 'next/server'
import { clearSessionCookie, getSession } from '@/lib/session'
import { softDeleteAppUser } from '@/lib/account-lifecycle'

export async function DELETE() {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (session.provider === 'guest')
  { return NextResponse.json({ error: '游客模式无需注销账号，直接退出即可。' }, { status: 400 }) }

  try {
    await softDeleteAppUser({
      appUserId: session.id,
      actorUserId: session.id,
      allowSelf: true,
    })
    const response = NextResponse.json({ ok: true })
    clearSessionCookie(response)
    return response
  }
  catch (error) {
    console.error('[profile-delete-account] failed', error)
    return NextResponse.json({ error: '注销账号失败，请稍后重试' }, { status: 500 })
  }
}
