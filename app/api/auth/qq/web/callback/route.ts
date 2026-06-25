import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  PENDING_QQ_COOKIE,
  PENDING_QQ_COOKIE_MAX_AGE,
  bindQqIdentityToUser,
  createPendingQqToken,
  getQqIdentity,
  getQqProfile,
  resolveQqUser,
} from '@/lib/qq-auth'
import { getSession, setSessionCookie } from '@/lib/session'

const stateCookie = 'qq_oauth_state'
const purposeCookie = 'qq_oauth_purpose'
const defaultCallbackPath = '/api/auth/qq/callback'

interface QqTokenPayload {
  access_token?: string
  openid?: string
  unionid?: string
  expires_in?: string | number
  refresh_token?: string
  error?: number | string
  error_description?: string
}

const parseQqTokenPayload = async (response: Response): Promise<QqTokenPayload> => {
  const text = await response.text()
  const trimmed = text.trim()
  if (!trimmed)
  { return {} }

  try {
    if (trimmed.startsWith('{'))
    { return JSON.parse(trimmed) as QqTokenPayload }
  }
  catch {
    // Fall through to form parsing. QQ may still return x-www-form-urlencoded
    // even when fmt=json is requested, depending on error path and app status.
  }

  const params = new URLSearchParams(trimmed)
  const payload: QqTokenPayload = {}
  params.forEach((value, key) => {
    ;(payload as Record<string, string>)[key] = value
  })
  return payload
}

const qqErrorParam = (error: unknown) => {
  if (!(error instanceof Error))
  { return 'failed' }
  if (error.message === 'QQ_NOT_BOUND')
  { return 'unbound' }
  if (error.message === 'QQ_ACCOUNT_DELETED' || error.message === 'ACCOUNT_DELETED')
  { return 'deleted' }
  if (error.message.startsWith('QQ_TOKEN_EXCHANGE_FAILED'))
  { return 'token' }
  if (error.message === 'QQ_OPENID_MISMATCH' || error.message === 'QQ_TOKEN_INVALID')
  { return 'openid' }
  if (error.message === 'QQ_PROFILE_FAILED')
  { return 'profile' }
  if (error.message === 'QQ_BIND_SESSION_MISSING')
  { return 'session' }
  return 'failed'
}

export async function GET(request: NextRequest) {
  const origin = process.env.AUTH_URL || request.nextUrl.origin
  const loginUrl = new URL('/login', origin)
  const state = request.nextUrl.searchParams.get('state')
  const code = request.nextUrl.searchParams.get('code')
  const storedState = request.cookies.get(stateCookie)?.value
  const purpose = request.cookies.get(purposeCookie)?.value === 'bind' ? 'bind' : 'login'
  if (!state || !code || !storedState || state !== storedState) {
    loginUrl.searchParams.set('qq_error', 'state')
    return NextResponse.redirect(loginUrl)
  }

  const appId = process.env.QQ_WEB_APP_ID || '1904523799'
  const appKey = process.env.QQ_WEB_APP_KEY
  if (!appKey) {
    console.error('[qq-web-auth] failed', {
      stage: 'config',
      appId,
      callback: defaultCallbackPath,
      reason: 'QQ_WEB_APP_KEY missing',
    })
    loginUrl.searchParams.set('qq_error', 'config')
    return NextResponse.redirect(loginUrl)
  }

  const callbackPath = request.nextUrl.pathname.endsWith('/web/callback')
    ? '/api/auth/qq/web/callback'
    : defaultCallbackPath
  const redirectUri = `${origin.replace(/\/$/, '')}${callbackPath}`
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
    const token = await parseQqTokenPayload(tokenResponse)
    if (!tokenResponse.ok || token.error || !token.access_token) {
      console.error('[qq-web-auth] token exchange failed', {
        stage: 'token',
        appId,
        status: tokenResponse.status,
        qqError: token.error,
        qqErrorDescription: token.error_description,
        redirectUri,
      })
      throw new Error(`QQ_TOKEN_EXCHANGE_FAILED:${token.error || tokenResponse.status}`)
    }

    let verifiedIdentity = token.openid
      ? { client_id: appId, openid: token.openid, unionid: token.unionid }
      : await getQqIdentity(token.access_token, appId)
    try {
      const identityFromMe = await getQqIdentity(token.access_token, appId)
      if (verifiedIdentity.openid !== identityFromMe.openid)
      { throw new Error('QQ_OPENID_MISMATCH') }
      verifiedIdentity = {
        ...verifiedIdentity,
        unionid: identityFromMe.unionid || verifiedIdentity.unionid,
      }
    }
    catch (identityError) {
      if (identityError instanceof Error && identityError.message === 'QQ_OPENID_MISMATCH')
      { throw identityError }
      if (!token.openid)
      { throw identityError }
      console.warn('[qq-web-auth] openid endpoint unavailable, using token openid fallback', {
        stage: 'openid-fallback',
        appId,
        error: identityError instanceof Error ? identityError.message : String(identityError),
      })
    }
    const profile = await getQqProfile(token.access_token, appId, verifiedIdentity.openid)
    if (purpose === 'bind') {
      const session = await getSession()
      if (!session)
      { throw new Error('QQ_BIND_SESSION_MISSING') }
      await bindQqIdentityToUser({
        appUserId: session.id,
        appId,
        openId: verifiedIdentity.openid,
        unionId: verifiedIdentity.unionid,
      })
      const response = NextResponse.redirect(new URL('/profile?qq_bound=1', origin))
      response.cookies.set(stateCookie, '', { path: '/', maxAge: 0 })
      response.cookies.set(purposeCookie, '', { path: '/', maxAge: 0 })
      return response
    }
    let user
    try {
      user = await resolveQqUser({
        appId,
        openId: verifiedIdentity.openid,
        unionId: verifiedIdentity.unionid,
        nickname: profile.nickname,
      })
    }
    catch (resolveError) {
      if (resolveError instanceof Error && resolveError.message === 'QQ_NOT_BOUND') {
        const failureUrl = new URL('/login', origin)
        failureUrl.searchParams.set('qq_error', 'unbound')
        const response = NextResponse.redirect(failureUrl)
        response.cookies.set(PENDING_QQ_COOKIE, createPendingQqToken({
          appId,
          openId: verifiedIdentity.openid,
          unionId: verifiedIdentity.unionid,
          nickname: profile.nickname,
          avatarUrl: profile.figureurl_qq_2 || profile.figureurl_2,
        }), {
          httpOnly: true,
          sameSite: 'lax',
          secure: origin.startsWith('https://'),
          path: '/',
          maxAge: PENDING_QQ_COOKIE_MAX_AGE,
        })
        response.cookies.set(stateCookie, '', { path: '/', maxAge: 0 })
        response.cookies.set(purposeCookie, '', { path: '/', maxAge: 0 })
        return response
      }
      throw resolveError
    }

    const response = NextResponse.redirect(new URL('/chat', origin))
    response.cookies.set(stateCookie, '', { path: '/', maxAge: 0 })
    response.cookies.set(purposeCookie, '', { path: '/', maxAge: 0 })
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
    console.error('[qq-web-auth] failed', {
      stage: qqErrorParam(error),
      appId,
      callbackPath,
      error: error instanceof Error ? error.message : String(error),
    })
    const failureUrl = purpose === 'bind' ? new URL('/profile?qq_bind_error=1', origin) : loginUrl
    if (purpose !== 'bind') {
      failureUrl.searchParams.set(
        'qq_error',
        qqErrorParam(error),
      )
    }
    const response = NextResponse.redirect(failureUrl)
    response.cookies.set(stateCookie, '', { path: '/', maxAge: 0 })
    response.cookies.set(purposeCookie, '', { path: '/', maxAge: 0 })
    return response
  }
}
