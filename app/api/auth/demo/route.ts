import { NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/session'

export async function POST() {
  if (process.env.VERCEL_ENV === 'production' && process.env.ALLOW_DEMO_LOGIN !== 'true')
  { return NextResponse.json({ error: 'Demo login is disabled' }, { status: 403 }) }

  const response = NextResponse.json({ ok: true })
  setSessionCookie(response, {
    id: 'demo-user',
    difyUserId: 'demo_network_learner',
    name: '网络学习者',
    provider: 'demo',
    createdAt: Date.now(),
  })
  return response
}
