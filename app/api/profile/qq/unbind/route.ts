import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { unbindQqIdentitiesFromUser } from '@/lib/qq-auth'

export async function POST() {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: '请先登录账号' }, { status: 401 }) }

  try {
    const qq = await unbindQqIdentitiesFromUser(session.id)
    return NextResponse.json({ ok: true, qq })
  }
  catch (error) {
    console.error('[qq-unbind] failed', {
      appUserId: session.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: '解绑 QQ 失败，请稍后重试' }, { status: 400 })
  }
}
