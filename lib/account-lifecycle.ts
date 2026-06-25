import 'server-only'

import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'

let accountLifecycleStorageReady = false

export const ensureAccountLifecycleStorage = async () => {
  if (accountLifecycleStorageReady || !isDatabaseConfigured())
  { return }

  await db.$executeRawUnsafe(`
    ALTER TABLE "app_users"
    ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ
  `)
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "app_users_deleted_at_idx"
    ON "app_users"("deleted_at")
  `)
  accountLifecycleStorageReady = true
}

export const isAppUserDeleted = async (appUserId: string) => {
  if (!isDatabaseConfigured())
  { return false }

  await ensureAccountLifecycleStorage()
  const rows = await db.$queryRaw<Array<{ deletedAt: Date | null }>>`
    SELECT "deleted_at" AS "deletedAt"
    FROM "app_users"
    WHERE "id" = ${appUserId}::uuid
    LIMIT 1
  `
  if (!rows.length)
  { return true }
  return Boolean(rows[0].deletedAt)
}

export const assertAppUserActive = async (appUserId: string) => {
  if (await isAppUserDeleted(appUserId))
  { throw new Error('ACCOUNT_DELETED') }
}

export const softDeleteAppUser = async ({
  appUserId,
  actorUserId,
  allowSelf = false,
}: {
  appUserId: string
  actorUserId: string
  allowSelf?: boolean
}) => {
  if (!isDatabaseConfigured())
  { throw new Error('DATABASE_NOT_CONFIGURED') }
  if (!allowSelf && appUserId === actorUserId)
  { throw new Error('CANNOT_DELETE_SELF') }

  return withDatabaseRetry(async () => {
    await ensureAccountLifecycleStorage()
    const updated = await db.$queryRaw<Array<{ id: string }>>`
      UPDATE "app_users"
      SET
        "deleted_at" = COALESCE("deleted_at", CURRENT_TIMESTAMP),
        "locked_until" = CURRENT_TIMESTAMP + INTERVAL '100 years',
        "failed_login_count" = 0,
        "password_hash" = CONCAT('deleted:', "id"::text, ':', EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text),
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${appUserId}::uuid
        AND "deleted_at" IS NULL
      RETURNING "id"::text AS "id"
    `

    if (!updated.length)
    { throw new Error('USER_NOT_FOUND_OR_DELETED') }

    await db.qqIdentity.deleteMany({ where: { appUserId } }).catch(() => undefined)
    return { ok: true }
  })
}
