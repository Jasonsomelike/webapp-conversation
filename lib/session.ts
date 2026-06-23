import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'

export const SESSION_COOKIE = 'network_study_session'

export interface AppSession {
  id: string
  difyUserId: string
  username: string
  name: string
  theme: string
  provider: 'account' | 'qq'
  createdAt: number
}

const sessionMaxAge = 30 * 24 * 60 * 60
const shouldUseSecureCookies = () =>
  Boolean(process.env.VERCEL) || process.env.AUTH_URL?.startsWith('https://') === true

const getSecret = () =>
  process.env.AUTH_SECRET || 'development-only-secret-change-before-production'

const encode = (value: string) => Buffer.from(value).toString('base64url')
const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf8')

const sign = (payload: string) =>
  createHmac('sha256', getSecret()).update(payload).digest('base64url')

export const createSessionToken = (session: AppSession) => {
  const payload = encode(JSON.stringify(session))
  return `${payload}.${sign(payload)}`
}

export const verifySessionToken = (token?: string | null): AppSession | null => {
  if (!token)
  { return null }

  const [payload, signature] = token.split('.')
  if (!payload || !signature)
  { return null }

  const expected = Buffer.from(sign(payload))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received))
  { return null }

  try {
    const session = JSON.parse(decode(payload)) as AppSession
    if (
      !['account', 'qq'].includes(session.provider)
      || !session.id
      || !session.difyUserId
      || !session.username
      || !session.name
    )
    { return null }
    const expired = Date.now() - session.createdAt > sessionMaxAge * 1000
    return expired ? null : session
  }
  catch {
    return null
  }
}

export const getSession = async () => {
  const store = await cookies()
  return verifySessionToken(store.get(SESSION_COOKIE)?.value)
}

export const getSessionFromRequest = (request: NextRequest) =>
  verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)

export const setSessionCookie = (response: NextResponse, session: AppSession) => {
  response.cookies.set(SESSION_COOKIE, createSessionToken(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookies(),
    path: '/',
    maxAge: sessionMaxAge,
  })
}

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookies(),
    path: '/',
    maxAge: 0,
  })
}
