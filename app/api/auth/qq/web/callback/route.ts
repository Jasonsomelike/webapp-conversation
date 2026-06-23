import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getQqIdentity, getQqProfile, resolveQqUser } from '@/lib/qq-auth'
import { setSessionCookie } from '@/lib/session'

const stateCookie = 'qq_oauth_state'

export async function GET(request: NextRequest) {
  const origin = process.env.AUTH_URL || request.nextUrl.origin
  const loginUrl = new URL('/login', origin)
  const state = request.nextUrl.searchParams.get('state')
  const code = request.nextUrl.searchParams.get('code')
  const storedState = request.cookies.get(stateCookie)?.value
  if (!state || !code || !storedState || state !== storedState) {
    loginUrl.searchParams.set('qq_error', 'state')
    return NextResponse.redirect(loginUrl)
  }

  const appId = process.env.QQ_WEB_APP_ID || '1904523799'
  const appKey = process.env.QQ_WEB_APP_KEY
  if (!appKey) {
    loginUrl.searchParams.set('qq_error', 'config')
    return NextResponse.redirect(loginUrl)
  }

  const redirectUri = `${origin.replace(/\/$/, '')}/api/auth/qq/web/callback`
  try {
    const tokenUrl = new URL('https://graph.qq.com/oauth2.0/token')
    tokenUrl.searchParams.set('grant_type', 'authorization_code')
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('client_secret', appKey)
    tokenUrl.searchParams.set('code', code)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('fmt', 'json')
    tokenUrl.searchParams.set('need_openid', '1')
    const tokenResponse = await fetch(tokenUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    const token = await tokenResponse.json() as {
      access_token?: string
      openid?: string
      error?: number
    }
    if (!tokenResponse.ok || token.error || !token.access_token)
    { throw new Error('QQ_TOKEN_EXCHANGE_FAILED') }

    const identity = token.openid
      ? { client_id: appId, openid: token.openid }
      : await getQqIdentity(token.access_token, appId)
    const verifiedIdentity = await getQqIdentity(token.access_token, appId)
    if (identity.openid !== verifiedIdentity.openid)
    { throw new Error('QQ_OPENID_MISMATCH') }
    const profile = await getQqProfile(token.access_token, appId, verifiedIdentity.openid)
    const user = await resolveQqUser({
      appId,
      openId: verifiedIdentity.openid,
      unionId: verifiedIdentity.unionid,
      nickname: profile.nickname,
    })

    const response = NextResponse.redirect(new URL('/chat', origin))
    response.cookies.set(stateCookie, '', { path: '/', maxAge: 0 })
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
    console.error('[qq-web-auth] failed', error)
    loginUrl.searchParams.set('qq_error', 'failed')
    const response = NextResponse.redirect(loginUrl)
    response.cookies.set(stateCookie, '', { path: '/', maxAge: 0 })
    return response
  }
}
