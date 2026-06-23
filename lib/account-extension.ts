import 'server-only'

import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'

interface AccountExtensionRow {
  avatar_url: string | null
}

let accountExtensionStorageReady = false

export const ensureAccountExtensionStorage = async () => {
  if (accountExtensionStorageReady)
  { return }
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "user_account_extensions" (
      "app_user_id" UUID NOT NULL,
      "avatar_url" TEXT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "user_account_extensions_pkey" PRIMARY KEY ("app_user_id"),
      CONSTRAINT "user_account_extensions_app_user_id_fkey"
        FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `)
  accountExtensionStorageReady = true
}

export const getAccountAvatar = async (appUserId: string) =>
  withDatabaseRetry(async () => {
    await ensureAccountExtensionStorage()
    const rows = await db.$queryRawUnsafe<AccountExtensionRow[]>(
      'SELECT "avatar_url" FROM "user_account_extensions" WHERE "app_user_id" = $1::uuid LIMIT 1',
      appUserId,
    )
    return rows[0]?.avatar_url || null
  })

export const setAccountAvatar = async (appUserId: string, avatarUrl: string | null) =>
  withDatabaseRetry(async () => {
    await ensureAccountExtensionStorage()
    await db.$executeRawUnsafe(
      `INSERT INTO "user_account_extensions" ("app_user_id", "avatar_url")
       VALUES ($1::uuid, $2)
       ON CONFLICT ("app_user_id")
       DO UPDATE SET "avatar_url" = EXCLUDED."avatar_url", "updated_at" = CURRENT_TIMESTAMP`,
      appUserId,
      avatarUrl,
    )
  })
