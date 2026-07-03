import 'server-only'

import type { AppSession } from '@/lib/session'
import { deleteAppUserAccount } from '@/lib/account-lifecycle'
import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'

export const guestLifetimeDays = 3
const guestLifetimeMs = guestLifetimeDays * 24 * 60 * 60 * 1000
const guestTouchThrottleMs = 30 * 60 * 1000

export const isGuestAccountMarker = (username?: string | null, securityQuestion?: string | null) =>
  String(username || '').startsWith('guest_') || securityQuestion === '游客临时会话'

export const pruneExpiredGuestAccounts = async (limit = 80) => {
  if (!isDatabaseConfigured())
  { return { scanned: 0, deleted: 0, failed: 0 } }

  const cutoff = new Date(Date.now() - guestLifetimeMs)
  const guests = await withDatabaseRetry(() => db.appUser.findMany({
    where: {
      OR: [
        { username: { startsWith: 'guest_' } },
        { securityQuestion: '游客临时会话' },
      ],
      AND: [
        {
          OR: [
            { lastLoginAt: { lt: cutoff } },
            { lastLoginAt: null, createdAt: { lt: cutoff } },
          ],
        },
      ],
    },
    select: { id: true, username: true },
    orderBy: { lastLoginAt: 'asc' },
    take: limit,
  }))

  let deleted = 0
  let failed = 0
  for (const guest of guests) {
    try {
      await deleteAppUserAccount({
        appUserId: guest.id,
        actorUserId: guest.id,
        allowSelf: true,
      })
      deleted += 1
    }
    catch (error) {
      failed += 1
      console.warn('[guest-lifecycle] failed to prune expired guest', {
        appUserId: guest.id,
        username: guest.username,
        error,
      })
    }
  }

  return { scanned: guests.length, deleted, failed }
}

export const validateAndTouchGuestSession = async (session: AppSession | null) => {
  if (!session || session.provider !== 'guest' || session.id === 'guest-textbook-graph')
  { return session }
  if (!isDatabaseConfigured())
  { return null }

  const user = await withDatabaseRetry(() => db.appUser.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      username: true,
      securityQuestion: true,
      lastLoginAt: true,
      createdAt: true,
    },
  }))

  if (!user || !isGuestAccountMarker(user.username, user.securityQuestion))
  { return null }

  const lastActive = user.lastLoginAt || user.createdAt
  if (Date.now() - lastActive.getTime() > guestLifetimeMs) {
    await deleteAppUserAccount({
      appUserId: user.id,
      actorUserId: user.id,
      allowSelf: true,
    })
    return null
  }

  if (Date.now() - lastActive.getTime() > guestTouchThrottleMs) {
    await withDatabaseRetry(() => db.appUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      select: { id: true },
    }))
  }

  return session
}
