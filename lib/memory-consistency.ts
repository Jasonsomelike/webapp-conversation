import 'server-only'

import type { Prisma } from '@prisma/client'
import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'

type MemorySourceClient = Prisma.TransactionClient | typeof db

const compactIds = (ids: string[], limit = 12) => ids.slice(0, limit)

const deleteOptionalConversationShares = async (
  client: MemorySourceClient,
  appUserId: string,
  conversationId: string,
) => {
  try {
    return Number(await client.$executeRawUnsafe(
      'DELETE FROM "conversation_shares" WHERE "app_user_id" = $1::uuid AND "dify_conversation_id" = $2',
      appUserId,
      conversationId,
    ))
  }
  catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    if (/relation .* does not exist|42P01/i.test(message))
    { return 0 }
    throw error
  }
}

const compactTitle = (value: string | null | undefined, fallback: string) => {
  const text = (value || '').replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, 120) : fallback
}

export const deleteConversationMemorySources = async ({
  client = db,
  appUserId,
  conversationId,
  reason,
}: {
  client?: MemorySourceClient
  appUserId: string
  conversationId: string
  reason: string
}) => {
  const references = await client.messageReference.deleteMany({
    where: {
      appUserId,
      difyConversationId: conversationId,
    },
  })
  const messages = await client.chatMessage.deleteMany({
    where: {
      appUserId,
      difyConversationId: conversationId,
    },
  })
  const shares = await deleteOptionalConversationShares(client, appUserId, conversationId)

  console.info('[memory-consistency] deleted conversation memory sources', {
    appUserId,
    conversationId,
    reason,
    messages: messages.count,
    references: references.count,
    shares,
  })

  return {
    messages: messages.count,
    references: references.count,
    shares,
  }
}

export const recoverMissingConversationRows = async ({
  appUserId,
  reason,
  limit = 50,
}: {
  appUserId: string
  reason: string
  limit?: number
}) => {
  if (!isDatabaseConfigured())
  { return { recovered: 0 } }

  return withDatabaseRetry(async () => {
    const existingConversations = await db.chatConversation.findMany({
      where: { appUserId },
      select: { difyConversationId: true },
    })
    const existingIds = new Set(existingConversations.map(item => item.difyConversationId))
    const [recentMessages, recentReferences] = await Promise.all([
      db.chatMessage.findMany({
        where: { appUserId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
        select: {
          difyConversationId: true,
          role: true,
          content: true,
          createdAt: true,
        },
      }),
      db.messageReference.findMany({
        where: {
          appUserId,
          difyConversationId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
        select: {
          difyConversationId: true,
          documentName: true,
          createdAt: true,
        },
      }),
    ])

    const missing = new Map<string, {
      title: string
      lastMessageAt: Date
    }>()
    for (const message of recentMessages) {
      if (!message.difyConversationId || existingIds.has(message.difyConversationId))
      { continue }
      const current = missing.get(message.difyConversationId)
      if (!current) {
        missing.set(message.difyConversationId, {
          title: compactTitle(message.content, '网络学习会话'),
          lastMessageAt: message.createdAt,
        })
      }
      else if (message.role === 'user') {
        current.title = compactTitle(message.content, current.title)
      }
      if (missing.size >= limit)
      { break }
    }
    if (missing.size < limit) {
      for (const reference of recentReferences) {
        if (!reference.difyConversationId || existingIds.has(reference.difyConversationId) || missing.has(reference.difyConversationId))
        { continue }
        missing.set(reference.difyConversationId, {
          title: compactTitle(reference.documentName, '知识库引用会话'),
          lastMessageAt: reference.createdAt,
        })
        if (missing.size >= limit)
        { break }
      }
    }

    const rows = [...missing.entries()].map(([difyConversationId, item]) => ({
      appUserId,
      difyConversationId,
      title: item.title,
      lastMessageAt: item.lastMessageAt,
      createdAt: item.lastMessageAt,
    }))
    if (!rows.length)
    { return { recovered: 0 } }

    const result = await db.chatConversation.createMany({
      data: rows,
      skipDuplicates: true,
    })
    if (result.count) {
      console.warn('[memory-consistency] recovered missing conversation rows', {
        appUserId,
        reason,
        recovered: result.count,
        conversationIds: compactIds(rows.map(item => item.difyConversationId)),
      })
    }
    return { recovered: result.count }
  })
}

export const auditMemorySourceConsistency = async ({
  appUserId,
  activeConversationIds,
  reason,
}: {
  appUserId: string
  activeConversationIds: string[]
  reason: string
}) => {
  if (!isDatabaseConfigured())
  { return }

  await withDatabaseRetry(async () => {
    const [conversations, messageSources, referenceSources, nullReferenceCount] = await Promise.all([
      db.chatConversation.findMany({
        where: { appUserId },
        select: { difyConversationId: true, deletedAt: true },
      }),
      db.chatMessage.findMany({
        where: { appUserId },
        distinct: ['difyConversationId'],
        select: { difyConversationId: true },
        take: 1000,
      }),
      db.messageReference.findMany({
        where: { appUserId, difyConversationId: { not: null } },
        distinct: ['difyConversationId'],
        select: { difyConversationId: true },
        take: 1000,
      }),
      db.messageReference.count({
        where: { appUserId, difyConversationId: null },
      }),
    ])
    const allConversationIds = new Set(conversations.map(item => item.difyConversationId))
    const deletedConversationIds = new Set(
      conversations
        .filter(item => item.deletedAt)
        .map(item => item.difyConversationId),
    )
    const activeIds = new Set(activeConversationIds)
    const referenceSourceIds = referenceSources
      .map(item => item.difyConversationId)
      .filter((id): id is string => Boolean(id))
    const sourceIds = new Set([
      ...messageSources.map(item => item.difyConversationId),
      ...referenceSourceIds,
    ])
    const staleDeletedSources = [...sourceIds].filter(id => deletedConversationIds.has(id))
    const missingConversationSources = [...sourceIds].filter(id => !allConversationIds.has(id))
    const inactiveSources = [...sourceIds].filter(id => !activeIds.has(id))

    if (staleDeletedSources.length || missingConversationSources.length || nullReferenceCount) {
      const sourceIdsToDelete = [...new Set([...staleDeletedSources, ...missingConversationSources])]
      const [deletedMessages, deletedReferences, deletedNullReferences] = await Promise.all([
        sourceIdsToDelete.length
          ? db.chatMessage.deleteMany({
            where: {
              appUserId,
              difyConversationId: { in: sourceIdsToDelete },
            },
          })
          : Promise.resolve({ count: 0 }),
        sourceIdsToDelete.length
          ? db.messageReference.deleteMany({
            where: {
              appUserId,
              difyConversationId: { in: sourceIdsToDelete },
            },
          })
          : Promise.resolve({ count: 0 }),
        nullReferenceCount
          ? db.messageReference.deleteMany({
            where: {
              appUserId,
              difyConversationId: null,
            },
          })
          : Promise.resolve({ count: 0 }),
      ])
      console.warn('[memory-consistency] orphan memory sources ignored', {
        appUserId,
        reason,
        staleDeleted: staleDeletedSources.length,
        missingConversations: missingConversationSources.length,
        nullReferences: nullReferenceCount,
        inactiveSources: inactiveSources.length,
        cleanedMessages: deletedMessages.count,
        cleanedReferences: deletedReferences.count + deletedNullReferences.count,
        sampleDeletedIds: compactIds(staleDeletedSources),
        sampleMissingIds: compactIds(missingConversationSources),
      })
    }
  })
}
