import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { bindQqIdentityToUser, getQqIdentity } from '@/lib/qq-auth'

const schema = z.object({
  accessToken: z.string().min(16).max(512),
  openId: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: '请先登录账号' }, { status: 401 }) }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success)
  { return NextResponse.json({ error: 'QQ 登录凭证无效' }, { status: 400 }) }

  const appId = process.env.QQ_MOBILE_APP_ID || '1904508499'
  try {
    const identity = await getQqIdentity(parsed.data.accessToken, appId)
    if (identity.openid !== parsed.data.openId)
    { return NextResponse.json({ error: 'QQ 登录身份校验失败' }, { status: 401 }) }
    await bindQqIdentityToUser({
      appUserId: session.id,
      appId,
      openId: identity.openid,
      unionId: identity.unionid,
    })
    return NextResponse.json({ ok: true })
  }
  catch (error) {
    if (error instanceof Error && error.message === 'QQ_ALREADY_BOUND')
    { return NextResponse.json({ error: '该 QQ 已绑定其他学习账号' }, { status: 409 }) }
    console.error('[qq-bind] failed', error)
    return NextResponse.json({ error: '绑定 QQ 失败，请稍后重试' }, { status: 400 })
  }
}
