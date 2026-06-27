import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  PENDING_QQ_COOKIE,
  PENDING_QQ_COOKIE_MAX_AGE,
  createPendingQqToken,
  extractQqNumber,
  getQqIdentity,
  getQqProfile,
  resolveQqUser,
} from '@/lib/qq-auth'
import { setSessionCookie } from '@/lib/session'

const schema = z.object({
  accessToken: z.string().min(16).max(512),
  openId: z.string().min(8).max(128),
  unionId: z.string().min(4).max(128).optional(),
  qqNumber: z.string().min(5).max(12).optional(),
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
  let pendingIdentity: {
    openId: string
    unionId?: string
    qqNumber?: string
    nickname?: string
    avatarUrl?: string
  } | undefined
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
    const qqNumber = extractQqNumber(parsed.data, profile)
    pendingIdentity = {
      openId: identity.openid,
      unionId: identity.unionid,
      qqNumber,
      nickname: profile.nickname,
      avatarUrl: profile.figureurl_qq_2 || profile.figureurl_2,
    }
    const user = await resolveQqUser({
      appId,
      openId: identity.openid,
      unionId: identity.unionid,
      qqNumber,
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
      const response = NextResponse.json({
        error: '该 QQ 尚未绑定学习账号，请先使用账号密码登录/注册后在“我的画像”中绑定 QQ。',
        needBinding: true,
      }, { status: 409 })
      if (pendingIdentity) {
        response.cookies.set(PENDING_QQ_COOKIE, createPendingQqToken({
          appId,
          openId: pendingIdentity.openId,
          unionId: pendingIdentity.unionId,
          qqNumber: pendingIdentity.qqNumber,
          nickname: pendingIdentity.nickname,
          avatarUrl: pendingIdentity.avatarUrl,
        }), {
          httpOnly: true,
          sameSite: 'lax',
          secure: true,
          path: '/',
          maxAge: PENDING_QQ_COOKIE_MAX_AGE,
        })
      }
      return response
    }
    if (error instanceof Error && (error.message === 'QQ_ACCOUNT_DELETED' || error.message === 'ACCOUNT_DELETED')) {
      return NextResponse.json({ error: '该账号已注销，无法继续登录。' }, { status: 403 })
    }
    return NextResponse.json({ error: 'QQ 登录失败，请稍后重试' }, { status: 401 })
  }
}
