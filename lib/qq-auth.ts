import 'server-only'

import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'
import { assertAppUserActive, ensureAccountLifecycleStorage, isAppUserDeleted } from '@/lib/account-lifecycle'

interface QqIdentityPayload {
  client_id: string
  openid: string
  unionid?: string
  error?: number
  error_description?: string
}

interface QqProfile {
  ret: number
  msg?: string
  nickname?: string
  figureurl_qq_2?: string
  figureurl_2?: string
}

let qqIdentityStorageReady = false

const ensureQqIdentityStorage = async () => {
  if (qqIdentityStorageReady)
  { return }

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "qq_identities" (
      "id" UUID NOT NULL,
      "app_user_id" UUID NOT NULL,
      "app_id" VARCHAR(32) NOT NULL,
      "open_id" VARCHAR(128) NOT NULL,
      "union_id" VARCHAR(128),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "qq_identities_pkey" PRIMARY KEY ("id")
    )
  `)
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "qq_identities_app_id_open_id_key"
    ON "qq_identities"("app_id", "open_id")
  `)
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "qq_identities_union_id_idx"
    ON "qq_identities"("union_id")
  `)
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "qq_identities_app_user_id_idx"
    ON "qq_identities"("app_user_id")
  `)
  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'qq_identities_app_user_id_fkey'
      ) THEN
        ALTER TABLE "qq_identities"
        ADD CONSTRAINT "qq_identities_app_user_id_fkey"
        FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END
    $$
  `)
  qqIdentityStorageReady = true
}

const fetchQqJson = async <T>(url: URL): Promise<T> => {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok)
  { throw new Error(`QQ_HTTP_${response.status}`) }
  const text = await response.text()
  const trimmed = text.trim()
  const jsonpMatch = trimmed.match(/^[\w$]+\(([\s\S]*)\);?$/)
  const payload = jsonpMatch?.[1] || trimmed
  try {
    return JSON.parse(payload) as T
  }
  catch {
    const params = new URLSearchParams(payload)
    const parsed: Record<string, string> = {}
    params.forEach((value, key) => {
      parsed[key] = value
    })
    if (Object.keys(parsed).length)
    { return parsed as T }
    throw new Error('QQ_RESPONSE_PARSE_FAILED')
  }
}

export const getQqIdentity = async (accessToken: string, expectedAppId: string) => {
  const url = new URL('https://graph.qq.com/oauth2.0/me')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fmt', 'json')
  url.searchParams.set('unionid', '1')
  const identity = await fetchQqJson<QqIdentityPayload>(url)
  if (identity.error || !identity.openid || String(identity.client_id) !== expectedAppId)
  { throw new Error('QQ_TOKEN_INVALID') }
  return identity
}

export const getQqProfile = async (accessToken: string, appId: string, openId: string) => {
  const url = new URL('https://graph.qq.com/user/get_user_info')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('oauth_consumer_key', appId)
  url.searchParams.set('openid', openId)
  url.searchParams.set('fmt', 'json')
  const profile = await fetchQqJson<QqProfile>(url)
  if (profile.ret !== 0)
  { throw new Error('QQ_PROFILE_FAILED') }
  return profile
}

export const resolveQqUser = async ({
  appId,
  openId,
  unionId,
  nickname,
}: {
  appId: string
  openId: string
  unionId?: string
  nickname?: string
}) => {
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }

  return withDatabaseRetry(async () => {
    await ensureQqIdentityStorage()
    await ensureAccountLifecycleStorage()
    const exactIdentity = await db.qqIdentity.findUnique({
      where: { appId_openId: { appId, openId } },
      include: { user: true },
    })
    if (exactIdentity) {
      if (await isAppUserDeleted(exactIdentity.appUserId))
      { throw new Error('QQ_ACCOUNT_DELETED') }
      const user = await db.appUser.update({
        where: { id: exactIdentity.appUserId },
        data: {
          lastLoginAt: new Date(),
          ...(exactIdentity.user.username.startsWith('qq_') && nickname?.trim()
            ? { displayName: nickname.trim().slice(0, 64) }
            : {}),
        },
      })
      return user
    }

    const unionIdentity = unionId
      ? await db.qqIdentity.findFirst({
        where: { unionId },
        include: { user: true },
      })
      : null

    if (unionIdentity) {
      if (await isAppUserDeleted(unionIdentity.appUserId))
      { throw new Error('QQ_ACCOUNT_DELETED') }
      await db.qqIdentity.create({
        data: { appUserId: unionIdentity.appUserId, appId, openId, unionId },
      })
      const user = await db.appUser.update({
        where: { id: unionIdentity.appUserId },
        data: { lastLoginAt: new Date() },
      })
      return user
    }

    throw new Error('QQ_NOT_BOUND')
  })
}

export const bindQqIdentityToUser = async ({
  appUserId,
  appId,
  openId,
  unionId,
}: {
  appUserId: string
  appId: string
  openId: string
  unionId?: string
}) => {
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }

  return withDatabaseRetry(async () => {
    await ensureQqIdentityStorage()
    await assertAppUserActive(appUserId)
    const existing = await db.qqIdentity.findFirst({
      where: {
        OR: [
          { appId, openId },
          ...(unionId ? [{ unionId }] : []),
        ],
      },
    })
    if (existing && existing.appUserId !== appUserId)
    { throw new Error('QQ_ALREADY_BOUND') }
    if (!existing) {
      await db.qqIdentity.create({
        data: { appUserId, appId, openId, unionId },
      })
    }
    return { bound: true }
  })
}

export const hasQqIdentity = async (appUserId: string) =>
  withDatabaseRetry(async () => {
    await ensureQqIdentityStorage()
    return (await db.qqIdentity.count({ where: { appUserId } })) > 0
  })
