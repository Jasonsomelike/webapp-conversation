import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getQqIdentity, getQqProfile, resolveQqUser } from '@/lib/qq-auth'
import { setSessionCookie } from '@/lib/session'

const schema = z.object({
  accessToken: z.string().min(16).max(512),
  openId: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success)
  { return NextResponse.json({ error: 'QQ 登录凭证无效' }, { status: 400 }) }

  const appId = process.env.QQ_MOBILE_APP_ID || '1904508499'
  try {
    const identity = await getQqIdentity(parsed.data.accessToken, appId)
    if (identity.openid !== parsed.data.openId)
    { return NextResponse.json({ error: 'QQ 登录身份校验失败' }, { status: 401 }) }

    const profile = await getQqProfile(parsed.data.accessToken, appId, identity.openid)
    const user = await resolveQqUser({
      appId,
      openId: identity.openid,
      unionId: identity.unionid,
      nickname: profile.nickname,
    })
    const response = NextResponse.json({ ok: true })
    setSessionCookie(response, {
      id: user.id,
      difyUserId: user.difyUserId,
      username: user.username,
      name: user.displayName,
      theme: user.theme,
      provider: 'qq',
      createdAt: Date.now(),
    })
    return response
  }
  catch (error) {
    console.error('[qq-native-auth] failed', error)
    return NextResponse.json({ error: 'QQ 登录失败，请稍后重试' }, { status: 401 })
  }
}
