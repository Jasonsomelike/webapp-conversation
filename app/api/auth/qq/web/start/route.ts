import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const stateCookie = 'qq_oauth_state'
const purposeCookie = 'qq_oauth_purpose'
const callbackPath = '/api/auth/qq/callback'

export async function GET(request: Request) {
  const purpose = new URL(request.url).searchParams.get('purpose') === 'bind' ? 'bind' : 'login'
  if (purpose === 'bind' && !(await getSession()))
  { return NextResponse.redirect(new URL('/login', request.url)) }
  const appId = process.env.QQ_WEB_APP_ID || '1904523799'
  const origin = process.env.AUTH_URL || new URL(request.url).origin
  const redirectUri = `${origin.replace(/\/$/, '')}${callbackPath}`
  const state = randomBytes(24).toString('base64url')
  const authorize = new URL('https://graph.qq.com/oauth2.0/authorize')
  authorize.searchParams.set('response_type', 'code')
  authorize.searchParams.set('client_id', appId)
  authorize.searchParams.set('redirect_uri', redirectUri)
  authorize.searchParams.set('state', state)
  authorize.searchParams.set('scope', 'get_user_info')

  const response = NextResponse.redirect(authorize)
  response.cookies.set(stateCookie, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 10 * 60,
  })
  response.cookies.set(purposeCookie, purpose, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 10 * 60,
  })
  return response
}
