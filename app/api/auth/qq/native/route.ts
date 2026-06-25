import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getQqIdentity, getQqProfile, resolveQqUser } from '@/lib/qq-auth'
import { setSessionCookie } from '@/lib/session'

const schema = z.object({
  accessToken: z.string().min(16).max(512),
  openId: z.string().min(8).max(128),
  unionId: z.string().min(4).max(128).optional(),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    console.error('[qq-native-auth] failed', {
      stage: 'validation',
      reason: parsed.error.issues.map(issue => issue.path.join('.') || issue.code),
    })
    return NextResponse.json({ error: 'QQ 登录凭证无效' }, { status: 400 })
  }

  const appId = process.env.QQ_MOBILE_APP_ID || '1904508499'
  try {
    let identity = {
      client_id: appId,
      openid: parsed.data.openId,
      unionid: parsed.data.unionId,
    }
    try {
      const identityFromMe = await getQqIdentity(parsed.data.accessToken, appId)
      if (identityFromMe.openid !== parsed.data.openId)
      { throw new Error('QQ_OPENID_MISMATCH') }
      identity = {
        ...identity,
        unionid: identityFromMe.unionid || identity.unionid,
      }
    }
    catch (identityError) {
      if (identityError instanceof Error && identityError.message === 'QQ_OPENID_MISMATCH')
      { throw identityError }
      console.warn('[qq-native-auth] openid endpoint unavailable, using SDK openid fallback', {
        stage: 'openid-fallback',
        appId,
        error: identityError instanceof Error ? identityError.message : String(identityError),
      })
    }

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
    console.error('[qq-native-auth] failed', {
      stage: error instanceof Error ? error.message : 'unknown',
      appId,
      error: error instanceof Error ? error.message : String(error),
    })
    if (error instanceof Error && error.message === 'QQ_NOT_BOUND') {
      return NextResponse.json({
        error: '该 QQ 尚未绑定学习账号，请先使用账号密码登录/注册后在“我的画像”中绑定 QQ。',
        needBinding: true,
      }, { status: 409 })
    }
    if (error instanceof Error && (error.message === 'QQ_ACCOUNT_DELETED' || error.message === 'ACCOUNT_DELETED')) {
      return NextResponse.json({ error: '该账号已注销，无法继续登录。' }, { status: 403 })
    }
    return NextResponse.json({ error: 'QQ 登录失败，请稍后重试' }, { status: 401 })
  }
}
