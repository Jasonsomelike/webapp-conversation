import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'
import { db, withDatabaseRetry } from '@/lib/db'

export type ConversationShareScope = 'all' | 'latest' | 'selected'

export interface ConversationSharePayload {
  conversationId: string
  appUserId: string
  scope: ConversationShareScope
  messageIds?: string[]
  expiresAt: number
}

const key = () => createHash('sha256')
  .update(process.env.AUTH_SECRET || 'development-only-secret-change-before-production')
  .digest()

const shareLifetimeMs = 30 * 24 * 60 * 60 * 1000

const ensureConversationSharesTable = async () => {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "conversation_shares" (
      "id" UUID PRIMARY KEY,
      "token" VARCHAR(64) NOT NULL UNIQUE,
      "app_user_id" UUID NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
      "dify_conversation_id" VARCHAR(128) NOT NULL,
      "scope" VARCHAR(16) NOT NULL,
      "message_ids" JSONB,
      "expires_at" TIMESTAMPTZ NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `
  await db.$executeRaw`
    CREATE INDEX IF NOT EXISTS "conversation_shares_app_user_conversation_idx"
    ON "conversation_shares" ("app_user_id", "dify_conversation_id")
  `
  await db.$executeRaw`
    CREATE INDEX IF NOT EXISTS "conversation_shares_expires_at_idx"
    ON "conversation_shares" ("expires_at")
  `
}

const normalisePayload = (payload: ConversationSharePayload): ConversationSharePayload | null => {
  if (
    !payload.appUserId
    || !payload.conversationId
    || !['all', 'latest', 'selected'].includes(payload.scope)
    || (payload.messageIds !== undefined && (
      !Array.isArray(payload.messageIds)
      || payload.messageIds.length > 60
      || payload.messageIds.some(id => typeof id !== 'string' || !id || id.length > 128)
    ))
    || (payload.scope === 'selected' && !payload.messageIds?.length)
    || payload.expiresAt < Date.now()
  )
  { return null }
  return payload
}

export const createStoredConversationShare = async (
  payload: Omit<ConversationSharePayload, 'expiresAt'>,
) => {
  const token = randomBytes(16).toString('base64url')
  const expiresAt = Date.now() + shareLifetimeMs
  const messageIdsJson = JSON.stringify(payload.messageIds || [])
  await withDatabaseRetry(async () => {
    await ensureConversationSharesTable()
    await db.$executeRaw`
      INSERT INTO "conversation_shares" (
        "id",
        "token",
        "app_user_id",
        "dify_conversation_id",
        "scope",
        "message_ids",
        "expires_at"
      )
      VALUES (
        ${randomUUID()}::uuid,
        ${token},
        ${payload.appUserId}::uuid,
        ${payload.conversationId},
        ${payload.scope},
        ${messageIdsJson}::jsonb,
        ${new Date(expiresAt)}
      )
    `
  })
  return { token, expiresAt }
}

interface StoredShareRow {
  app_user_id: string
  dify_conversation_id: string
  scope: ConversationShareScope
  message_ids: unknown
  expires_at: Date
}

export const getStoredConversationShare = async (token: string): Promise<ConversationSharePayload | null> => {
  try {
    const rows = await withDatabaseRetry(async () => {
      await ensureConversationSharesTable()
      return db.$queryRaw<StoredShareRow[]>`
        SELECT
          "app_user_id",
          "dify_conversation_id",
          "scope",
          "message_ids",
          "expires_at"
        FROM "conversation_shares"
        WHERE "token" = ${token}
          AND "expires_at" > CURRENT_TIMESTAMP
        LIMIT 1
      `
    })
    const row = rows[0]
    if (!row)
    { return null }
    const messageIds = Array.isArray(row.message_ids)
      ? row.message_ids.map(id => String(id)).filter(Boolean)
      : []
    return normalisePayload({
      appUserId: row.app_user_id,
      conversationId: row.dify_conversation_id,
      scope: row.scope,
      messageIds: messageIds.length ? messageIds : undefined,
      expiresAt: row.expires_at.getTime(),
    })
  }
  catch (error) {
    console.error('[conversation-share] failed to read stored share', { tokenLength: token.length, error })
    return null
  }
}

export const createConversationShareToken = (
  payload: Omit<ConversationSharePayload, 'expiresAt'>,
) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const expiresAt = Date.now() + shareLifetimeMs
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ ...payload, expiresAt }), 'utf8'),
    cipher.final(),
  ])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
}

export const verifyConversationShareToken = (token: string): ConversationSharePayload | null => {
  try {
    const bytes = Buffer.from(token, 'base64url')
    if (bytes.length < 29)
    { return null }
    const decipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12))
    decipher.setAuthTag(bytes.subarray(12, 28))
    const payload = JSON.parse(Buffer.concat([
      decipher.update(bytes.subarray(28)),
      decipher.final(),
    ]).toString('utf8')) as ConversationSharePayload
    return normalisePayload(payload)
  }
  catch {
    return null
  }
}

export const getConversationSharePayload = async (token: string) =>
  token.length <= 64
    ? await getStoredConversationShare(token) || verifyConversationShareToken(token)
    : verifyConversationShareToken(token)
