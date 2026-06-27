import 'server-only'

import type { Prisma } from '@prisma/client'
import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'

let accountLifecycleStorageReady = false

type AccountDeletionClient = Prisma.TransactionClient

type OptionalAppUserScopedTable = 'conversation_shares' | 'user_account_extensions'

const deleteFromOptionalAppUserScopedTable = async (
  client: AccountDeletionClient,
  tableName: OptionalAppUserScopedTable,
  appUserId: string,
) => {
  try {
    return Number(await client.$executeRawUnsafe(
      `DELETE FROM "${tableName}" WHERE "app_user_id" = $1::uuid`,
      appUserId,
    ))
  }
  catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    if (/relation .* does not exist|42P01/i.test(message))
    { return 0 }
    throw error
  }
}

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

export const deleteAppUserAccount = async ({
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
    return db.$transaction(async (tx) => {
      const users = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"::text AS "id"
        FROM "app_users"
        WHERE "id" = ${appUserId}::uuid
        LIMIT 1
      `

      if (!users.length)
      { throw new Error('USER_NOT_FOUND_OR_DELETED') }

      const deleted = {
        conversationShares: await deleteFromOptionalAppUserScopedTable(tx, 'conversation_shares', appUserId),
        accountExtensions: await deleteFromOptionalAppUserScopedTable(tx, 'user_account_extensions', appUserId),
        qqIdentities: (await tx.qqIdentity.deleteMany({ where: { appUserId } })).count,
        references: (await tx.messageReference.deleteMany({ where: { appUserId } })).count,
        messages: (await tx.chatMessage.deleteMany({ where: { appUserId } })).count,
        conversations: (await tx.chatConversation.deleteMany({ where: { appUserId } })).count,
        graphEdges: (await tx.graphEdge.deleteMany({ where: { appUserId } })).count,
        graphNodes: (await tx.graphNode.deleteMany({ where: { appUserId } })).count,
        reports: (await tx.userAnalysisReport.deleteMany({ where: { appUserId } })).count,
        parsedUploads: (await tx.parsedUpload.deleteMany({ where: { appUserId } })).count,
        profile: (await tx.userProfile.deleteMany({ where: { appUserId } })).count,
        user: (await tx.appUser.deleteMany({ where: { id: appUserId } })).count,
      }

      if (!deleted.user)
      { throw new Error('USER_NOT_FOUND_OR_DELETED') }

      console.info('[account-lifecycle] account deleted with scoped data cleanup', {
        appUserId,
        actorUserId,
        allowSelf,
        deleted,
      })

      return { ok: true, deleted }
    })
  })
}

export const softDeleteAppUser = deleteAppUserAccount
