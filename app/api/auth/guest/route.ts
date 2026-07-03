import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db, isDatabaseConfigured } from '@/lib/db'
import { deriveAccountDifyUserId } from '@/lib/auth'
import { setSessionCookie } from '@/lib/session'
import { pruneExpiredGuestAccounts } from '@/lib/guest-lifecycle'

export async function POST() {
  if (!isDatabaseConfigured())
  { return NextResponse.json({ error: '游客模式需要数据库服务可用' }, { status: 503 }) }

  void pruneExpiredGuestAccounts().catch(error => console.warn('[guest-auth] expired guest cleanup failed', error))

  const suffix = randomBytes(8).toString('hex')
  const username = `guest_${suffix}`
  const [passwordHash, securityAnswerHash] = await Promise.all([
    bcrypt.hash(randomBytes(32).toString('base64url'), 12),
    bcrypt.hash(randomBytes(24).toString('base64url'), 12),
  ])
  const user = await db.appUser.create({
    data: {
      username,
      displayName: '游客',
      passwordHash,
      securityQuestion: '游客临时会话',
      securityAnswerHash,
      difyUserId: deriveAccountDifyUserId(username),
      lastLoginAt: new Date(),
    },
  })

  const response = NextResponse.json({ ok: true })
  setSessionCookie(response, {
    id: user.id,
    difyUserId: user.difyUserId,
    username: user.username,
    name: user.displayName,
    theme: user.theme,
    provider: 'guest',
    createdAt: Date.now(),
  })
  return response
}
