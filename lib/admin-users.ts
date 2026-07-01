import 'server-only'

import { db, withDatabaseRetry } from '@/lib/db'
import { ensureAccountLifecycleStorage } from '@/lib/account-lifecycle'

export interface AdminUserListItem {
  id: string
  username: string
  displayName: string
  difyUserId: string
  theme: string
  failedLoginCount: number
  lockedUntil: string | null
  createdAt: string
  lastLoginAt: string | null
  _count: { conversations: number, messages: number, references: number }
}

interface AdminUserRaw {
  id: string
  username: string
  displayName: string
  difyUserId: string
  theme: string
  failedLoginCount: number
  lockedUntil: Date | string | null
  createdAt: Date | string
  lastLoginAt: Date | string | null
  conversations: number
  messages: number
  references: number
}

const toIso = (value: Date | string | null) =>
  !value ? null : value instanceof Date ? value.toISOString() : new Date(value).toISOString()

export const listVisibleAdminUsers = async (): Promise<AdminUserListItem[]> =>
  withDatabaseRetry(async () => {
    await ensureAccountLifecycleStorage()
    const rows = await db.$queryRaw<AdminUserRaw[]>`
      SELECT
        u."id"::text AS "id",
        u."username" AS "username",
        u."display_name" AS "displayName",
        u."dify_user_id" AS "difyUserId",
        u."theme" AS "theme",
        u."failed_login_count" AS "failedLoginCount",
        u."locked_until" AS "lockedUntil",
        u."created_at" AS "createdAt",
        u."last_login_at" AS "lastLoginAt",
        (
          SELECT COUNT(*)::int
          FROM "chat_conversations" c
          WHERE c."app_user_id" = u."id"
            AND c."deleted_at" IS NULL
        ) AS "conversations",
        (
          SELECT COUNT(*)::int
          FROM "chat_messages" m
          WHERE m."app_user_id" = u."id"
            AND m."role" = 'user'
            AND EXISTS (
              SELECT 1
              FROM "chat_conversations" c
              WHERE c."app_user_id" = u."id"
                AND c."dify_conversation_id" = m."dify_conversation_id"
                AND c."deleted_at" IS NULL
            )
        ) AS "messages",
        (
          SELECT COUNT(*)::int
          FROM "message_references" r
          WHERE r."app_user_id" = u."id"
            AND r."dify_conversation_id" IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM "chat_conversations" c
              WHERE c."app_user_id" = u."id"
                AND c."dify_conversation_id" = r."dify_conversation_id"
                AND c."deleted_at" IS NULL
            )
        ) AS "references"
      FROM "app_users" u
      WHERE u."deleted_at" IS NULL
      ORDER BY u."created_at" DESC
      LIMIT 500
    `

    return rows.map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      difyUserId: row.difyUserId,
      theme: row.theme,
      failedLoginCount: Number(row.failedLoginCount || 0),
      lockedUntil: toIso(row.lockedUntil),
      createdAt: toIso(row.createdAt) || new Date().toISOString(),
      lastLoginAt: toIso(row.lastLoginAt),
      _count: {
        conversations: Number(row.conversations || 0),
        messages: Number(row.messages || 0),
        references: Number(row.references || 0),
      },
    }))
  })
