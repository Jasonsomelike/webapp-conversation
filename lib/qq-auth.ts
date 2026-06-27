import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
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
  qq?: string
  uin?: string
  qq_number?: string
  qqNumber?: string
  [key: string]: unknown
}

let qqIdentityStorageReady = false
let qqIdentityUnionBackfillReady = false

export const PENDING_QQ_COOKIE = 'network_study_pending_qq'
export const PENDING_QQ_COOKIE_MAX_AGE = 10 * 60

export interface PendingQqIdentity {
  appId: string
  openId: string
  unionId?: string
  qqNumber?: string
  nickname?: string
  avatarUrl?: string
  createdAt: number
}

export interface QqIdentitySummary {
  bound: boolean
  displayId?: string
  openIdTail?: string
  unionId?: string
  qqNumber?: string
  appIds: string[]
}

const getSecret = () =>
  process.env.AUTH_SECRET || 'development-only-secret-change-before-production'

const encode = (value: string) => Buffer.from(value).toString('base64url')
const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf8')

const sign = (payload: string) =>
  createHmac('sha256', getSecret()).update(payload).digest('base64url')

export const createPendingQqToken = (identity: Omit<PendingQqIdentity, 'createdAt'>) => {
  const payload = encode(JSON.stringify({ ...identity, createdAt: Date.now() } satisfies PendingQqIdentity))
  return `${payload}.${sign(payload)}`
}

export const verifyPendingQqToken = (token?: string | null): PendingQqIdentity | null => {
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
    const identity = JSON.parse(decode(payload)) as PendingQqIdentity
    if (!identity.appId || !identity.openId || !identity.createdAt)
    { return null }
    if (Date.now() - Number(identity.createdAt) > PENDING_QQ_COOKIE_MAX_AGE * 1000)
    { return null }
    return identity
  }
  catch {
    return null
  }
}

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
      "canonical_id" VARCHAR(160),
      "qq_number" VARCHAR(32),
      "display_id" VARCHAR(32),
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
    ALTER TABLE "qq_identities"
    ADD COLUMN IF NOT EXISTS "canonical_id" VARCHAR(160),
    ADD COLUMN IF NOT EXISTS "qq_number" VARCHAR(32),
    ADD COLUMN IF NOT EXISTS "display_id" VARCHAR(32)
  `)
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "qq_identities_canonical_id_idx"
    ON "qq_identities"("canonical_id")
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
  await backfillKnownUserUnionIds()
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

const normalizeQqIdentityPart = (value?: string | null) => {
  const normalized = String(value || '').trim()
  return normalized || undefined
}

const normalizeQqNumber = (value?: unknown) => {
  const normalized = String(value || '').replace(/\D/g, '')
  return normalized.length >= 5 && normalized.length <= 12 ? normalized : undefined
}

const maskOpenId = (value?: string | null) => {
  const normalized = normalizeQqIdentityPart(value)
  if (!normalized)
  { return undefined }
  if (normalized.length <= 10)
  { return `…${normalized.slice(-6)}` }
  return `${normalized.slice(0, 4)}…${normalized.slice(-6)}`
}

export const extractQqNumber = (...sources: unknown[]) => {
  for (const source of sources) {
    if (!source || typeof source !== 'object' || Array.isArray(source))
    { continue }
    const record = source as Record<string, unknown>
    const direct = normalizeQqNumber(
      record.qq
      || record.uin
      || record.qq_number
      || record.qqNumber
      || record.qq_no
      || record.qqNo
      || record.account,
    )
    if (direct)
    { return direct }
    const openIdentity = String(record.openId || record.openid || '').trim()
    const qqOpenIdMatch = openIdentity.match(/^QQ(\d{5,12})$/i)
    if (qqOpenIdMatch?.[1])
    { return qqOpenIdMatch[1] }
  }
  return undefined
}

const buildCanonicalId = ({ openId }: { openId: string }) =>
  `openid:${openId}`

const insensitiveEquals = (value: string) =>
  ({ equals: value, mode: 'insensitive' as const })

const sameIdentityPart = (left?: string | null, right?: string | null) =>
  Boolean(left && right && left.toLocaleLowerCase() === right.toLocaleLowerCase())

const uniqueUnionIds = (values: Array<string | null | undefined>) => {
  const unions = new Map<string, string>()
  values.forEach((value) => {
    const normalized = normalizeQqIdentityPart(value)
    if (normalized)
    { unions.set(normalized.toLocaleLowerCase(), normalized) }
  })
  return unions
}

const getKnownSingleUnionIdForUser = async (appUserId: string, preferredUnionId?: string) => {
  const identities = await db.qqIdentity.findMany({
    where: { appUserId },
    select: { unionId: true },
  })
  const unions = uniqueUnionIds([preferredUnionId, ...identities.map(identity => identity.unionId)])
  return unions.size === 1 ? [...unions.values()][0] : undefined
}

const syncQqIdentityUnionForUser = async (appUserId: string, preferredUnionId?: string) => {
  const identities = await db.qqIdentity.findMany({
    where: { appUserId },
    select: { id: true, appId: true, unionId: true },
  })
  const unions = uniqueUnionIds([preferredUnionId, ...identities.map(identity => identity.unionId)])
  if (unions.size === 0)
  { return undefined }
  if (unions.size > 1) {
    console.warn('[qq-auth] skip union backfill because one learning account has multiple QQ union IDs', {
      appUserId,
      appIds: identities.map(identity => identity.appId),
    })
    return normalizeQqIdentityPart(preferredUnionId)
  }

  const unionId = [...unions.values()][0]
  const result = await db.qqIdentity.updateMany({
    where: {
      appUserId,
      unionId: null,
    },
    data: { unionId },
  })
  if (result.count > 0) {
    console.info('[qq-auth] backfilled QQ union ID for existing identities', {
      appUserId,
      count: result.count,
      appIds: identities.map(identity => identity.appId),
    })
  }
  return unionId
}

const backfillKnownUserUnionIds = async () => {
  if (qqIdentityUnionBackfillReady)
  { return }
  try {
    const identities = await db.qqIdentity.findMany({
      select: { appUserId: true, unionId: true },
    })
    const byUser = new Map<string, Array<string | null>>()
    identities.forEach((identity) => {
      const list = byUser.get(identity.appUserId) || []
      list.push(identity.unionId)
      byUser.set(identity.appUserId, list)
    })
    await Promise.all([...byUser.entries()].map(async ([appUserId, unionIds]) => {
      const unions = uniqueUnionIds(unionIds)
      if (unions.size !== 1)
      { return }
      await syncQqIdentityUnionForUser(appUserId, [...unions.values()][0])
    }))
    qqIdentityUnionBackfillReady = true
  }
  catch (error) {
    qqIdentityUnionBackfillReady = false
    throw error
  }
}

const findQqIdentityByAppOpenId = async (
  appId: string,
  openId: string,
) => {
  const exact = await db.qqIdentity.findUnique({
    where: { appId_openId: { appId, openId } },
  })
  if (exact)
  { return exact }

  return await db.qqIdentity.findFirst({
    where: { appId, openId: insensitiveEquals(openId) },
    orderBy: { updatedAt: 'desc' },
  })
}

const findQqIdentityWithUserByAppOpenId = async (
  appId: string,
  openId: string,
) => {
  const exact = await db.qqIdentity.findUnique({
    where: { appId_openId: { appId, openId } },
    include: { user: true },
  })
  if (exact)
  { return exact }

  return await db.qqIdentity.findFirst({
    where: { appId, openId: insensitiveEquals(openId) },
    include: { user: true },
    orderBy: { updatedAt: 'desc' },
  })
}

const saveQqIdentityForUser = async ({
  appUserId,
  appId,
  openId,
  unionId,
  qqNumber,
  canonicalId,
}: {
  appUserId: string
  appId: string
  openId: string
  unionId?: string
  qqNumber?: string
  canonicalId?: string
}) => {
  const displayId = maskOpenId(openId)
  const existing = await findQqIdentityByAppOpenId(appId, openId)
  if (existing) {
    return db.qqIdentity.update({
      where: { id: existing.id },
      data: {
        appUserId,
        openId,
        ...(unionId ? { unionId } : {}),
        ...(canonicalId ? { canonicalId } : {}),
        ...(qqNumber ? { qqNumber } : {}),
        displayId,
      },
    })
  }

  return db.qqIdentity.create({
    data: { appUserId, appId, openId, unionId, canonicalId, qqNumber, displayId },
  })
}

const getQqUnionId = async (accessToken: string) => {
  const candidates = [
    'https://graph.qq.com/oauth2.0/get_unionid',
    'https://graph.qq.com/oauth2.0/get_unionid_by_token',
  ]

  for (const endpoint of candidates) {
    try {
      const url = new URL(endpoint)
      url.searchParams.set('access_token', accessToken)
      url.searchParams.set('fmt', 'json')
      const payload = await fetchQqJson<{ unionid?: string, error?: number | string }>(url)
      if (!payload.error && payload.unionid)
      { return normalizeQqIdentityPart(payload.unionid) }
    }
    catch {
      // QQ has returned unionid through different endpoints across SDK
      // versions/app types. Treat this as best-effort; openid still verifies
      // the token, while unionid is the cross-app account key when available.
    }
  }
  return undefined
}

export const getQqIdentity = async (accessToken: string, expectedAppId: string) => {
  const url = new URL('https://graph.qq.com/oauth2.0/me')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fmt', 'json')
  url.searchParams.set('unionid', '1')
  const identity = await fetchQqJson<QqIdentityPayload>(url)
  if (identity.error || !identity.openid || String(identity.client_id) !== expectedAppId)
  { throw new Error('QQ_TOKEN_INVALID') }
  return {
    ...identity,
    openid: normalizeQqIdentityPart(identity.openid)!,
    unionid: normalizeQqIdentityPart(identity.unionid) || await getQqUnionId(accessToken),
  }
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
  qqNumber,
  nickname,
}: {
  appId: string
  openId: string
  unionId?: string
  qqNumber?: string
  nickname?: string
}) => {
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }

  const normalizedOpenId = normalizeQqIdentityPart(openId)
  const normalizedUnionId = normalizeQqIdentityPart(unionId)
  const normalizedQqNumber = normalizeQqNumber(qqNumber)
  if (!normalizedOpenId)
  { throw new Error('QQ_TOKEN_INVALID') }
  const canonicalId = buildCanonicalId({ openId: normalizedOpenId })

  return withDatabaseRetry(async () => {
    await ensureQqIdentityStorage()
    await ensureAccountLifecycleStorage()
    const canonicalIdentity = await db.qqIdentity.findFirst({
      where: { canonicalId: insensitiveEquals(canonicalId) },
      include: { user: true },
      orderBy: { updatedAt: 'desc' },
    })
    const exactIdentity = canonicalIdentity || await findQqIdentityWithUserByAppOpenId(appId, normalizedOpenId)
    if (exactIdentity) {
      if (await isAppUserDeleted(exactIdentity.appUserId))
      { throw new Error('QQ_ACCOUNT_DELETED') }
      if (
        normalizedUnionId
        && !sameIdentityPart(exactIdentity.unionId, normalizedUnionId)
      ) {
        await db.qqIdentity.update({
          where: { id: exactIdentity.id },
          data: {
            openId: normalizedOpenId,
            unionId: normalizedUnionId,
            canonicalId,
            ...(normalizedQqNumber ? { qqNumber: normalizedQqNumber } : {}),
            displayId: maskOpenId(normalizedOpenId),
          },
        })
      }
      else if (!sameIdentityPart(exactIdentity.canonicalId, canonicalId) || (normalizedQqNumber && !sameIdentityPart(exactIdentity.qqNumber, normalizedQqNumber))) {
        await db.qqIdentity.update({
          where: { id: exactIdentity.id },
          data: {
            canonicalId,
            ...(normalizedQqNumber ? { qqNumber: normalizedQqNumber } : {}),
            displayId: maskOpenId(normalizedOpenId),
          },
        })
      }
      if (exactIdentity.appId !== appId || !sameIdentityPart(exactIdentity.openId, normalizedOpenId)) {
        await saveQqIdentityForUser({
          appUserId: exactIdentity.appUserId,
          appId,
          openId: normalizedOpenId,
          unionId: normalizedUnionId || exactIdentity.unionId || undefined,
          qqNumber: normalizedQqNumber || exactIdentity.qqNumber || undefined,
          canonicalId,
        })
      }
      await syncQqIdentityUnionForUser(exactIdentity.appUserId, normalizedUnionId || exactIdentity.unionId || undefined)
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

    // Some QQ Connect combinations return the same OpenID for Android and Web
    // but with different app IDs, while UnionID may be missing or delayed. In
    // that case, treating the identical OpenID as the same QQ identity lets an
    // already-bound account log in from the other client and records the new
    // app ID for future exact matches.
    const sameOpenIdIdentity = await db.qqIdentity.findFirst({
      where: { openId: insensitiveEquals(normalizedOpenId) },
      include: { user: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (sameOpenIdIdentity) {
      if (await isAppUserDeleted(sameOpenIdIdentity.appUserId))
      { throw new Error('QQ_ACCOUNT_DELETED') }
      await saveQqIdentityForUser({
        appUserId: sameOpenIdIdentity.appUserId,
        appId,
        openId: normalizedOpenId,
        unionId: normalizedUnionId,
        qqNumber: normalizedQqNumber,
        canonicalId,
      })
      await syncQqIdentityUnionForUser(sameOpenIdIdentity.appUserId, normalizedUnionId || sameOpenIdIdentity.unionId || undefined)
      const user = await db.appUser.update({
        where: { id: sameOpenIdIdentity.appUserId },
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
  qqNumber,
}: {
  appUserId: string
  appId: string
  openId: string
  unionId?: string
  qqNumber?: string
}) => {
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }

  const normalizedOpenId = normalizeQqIdentityPart(openId)
  const normalizedUnionId = normalizeQqIdentityPart(unionId)
  const normalizedQqNumber = normalizeQqNumber(qqNumber)
  if (!normalizedOpenId)
  { throw new Error('QQ_TOKEN_INVALID') }

  return withDatabaseRetry(async () => {
    await ensureQqIdentityStorage()
    await assertAppUserActive(appUserId)
    const unionIdForBinding = normalizedUnionId || await getKnownSingleUnionIdForUser(appUserId)
    const canonicalId = buildCanonicalId({ openId: normalizedOpenId })
    const [exactIdentity, canonicalIdentity] = await Promise.all([
      findQqIdentityByAppOpenId(appId, normalizedOpenId),
      db.qqIdentity.findFirst({
        where: { canonicalId: insensitiveEquals(canonicalId) },
        orderBy: { updatedAt: 'desc' },
      }),
    ])
    const conflict = [exactIdentity, canonicalIdentity].find(identity => identity && identity.appUserId !== appUserId)
    if (conflict)
    { throw new Error('QQ_ALREADY_BOUND') }

    const saved = await saveQqIdentityForUser({
      appUserId,
      appId,
      openId: normalizedOpenId,
      unionId: unionIdForBinding,
      qqNumber: normalizedQqNumber,
      canonicalId,
    })
    await syncQqIdentityUnionForUser(appUserId, unionIdForBinding || saved.unionId || undefined)
    return { bound: true, identity: saved }
  })
}

export const hasQqIdentity = async (appUserId: string) =>
  withDatabaseRetry(async () => {
    await ensureQqIdentityStorage()
    return (await db.qqIdentity.count({ where: { appUserId } })) > 0
  })

export const unbindQqIdentitiesFromUser = async (appUserId: string) => {
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }

  return withDatabaseRetry(async () => {
    await ensureQqIdentityStorage()
    await assertAppUserActive(appUserId)
    const result = await db.qqIdentity.deleteMany({ where: { appUserId } })
    return { bound: false, removed: result.count, appIds: [] as string[] }
  })
}

export const getQqIdentitySummary = async (appUserId: string): Promise<QqIdentitySummary> =>
  withDatabaseRetry(async () => {
    await ensureQqIdentityStorage()
    const identities = await db.qqIdentity.findMany({
      where: { appUserId },
      orderBy: { updatedAt: 'desc' },
      select: { appId: true, openId: true, unionId: true, qqNumber: true, displayId: true, canonicalId: true },
    })
    const primary = identities[0]
    if (!primary)
    { return { bound: false, appIds: [] } }
    const openIdTail = primary.openId.slice(-8)
    const displayId = primary.displayId
      || maskOpenId(primary.openId)
      || `QQ …${openIdTail}`
    return {
      bound: true,
      displayId,
      openIdTail,
      unionId: primary.unionId || undefined,
      qqNumber: primary.qqNumber || undefined,
      appIds: Array.from(new Set(identities.map(identity => identity.appId))),
    }
  })
