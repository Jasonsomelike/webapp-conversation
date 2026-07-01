import { NextResponse } from 'next/server'
import { db, withDatabaseRetry } from '@/lib/db'
import { isAdminSession } from '@/lib/admin'
import { getSession } from '@/lib/session'
import { toConversationPreview } from '@/lib/message-preview'

const requireAdmin = async () => {
  const session = await getSession()
  return session && isAdminSession(session) ? session : null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!await requireAdmin())
  { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const { userId } = await params
  const conversationId = new URL(request.url).searchParams.get('conversationId')?.trim()
  const user = await withDatabaseRetry(() => db.appUser.findUnique({
    where: { id: userId },
    select: { id: true, username: true, displayName: true },
  }))
  if (!user)
  { return NextResponse.json({ error: 'User not found' }, { status: 404 }) }

  if (conversationId) {
    const conversation = await withDatabaseRetry(() => db.chatConversation.findFirst({
      where: { appUserId: userId, difyConversationId: conversationId, deletedAt: null },
      select: {
        difyConversationId: true,
        title: true,
        createdAt: true,
        lastMessageAt: true,
        deletedAt: true,
      },
    }))
    if (!conversation)
    { return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) }

    const messages = await withDatabaseRetry(() => db.chatMessage.findMany({
      where: { appUserId: userId, difyConversationId: conversationId },
      orderBy: { createdAt: 'asc' },
      take: 1000,
      select: {
        id: true,
        difyMessageId: true,
        role: true,
        content: true,
        createdAt: true,
      },
    }))
    return NextResponse.json({ user, conversation, messages })
  }

  const conversations = await withDatabaseRetry(() => db.chatConversation.findMany({
    where: { appUserId: userId, deletedAt: null },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    take: 200,
    select: {
      difyConversationId: true,
      title: true,
      createdAt: true,
      lastMessageAt: true,
      deletedAt: true,
    },
  }))
  const ids = conversations.map(item => item.difyConversationId)
  const counts = ids.length
    ? await withDatabaseRetry(() => db.chatMessage.groupBy({
      by: ['difyConversationId'],
      where: { appUserId: userId, difyConversationId: { in: ids } },
      _count: { _all: true },
      _max: { createdAt: true },
    }))
    : []
  const latestMessages = ids.length
    ? await withDatabaseRetry(() => db.chatMessage.findMany({
      where: { appUserId: userId, difyConversationId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(2000, Math.max(200, ids.length * 12)),
      select: {
        difyConversationId: true,
        content: true,
        createdAt: true,
      },
    }))
    : []

  const countMap = new Map(counts.map(item => [item.difyConversationId, item._count._all]))
  const previewMap = new Map<string, { content: string, createdAt: Date }>()
  latestMessages.forEach((message) => {
    if (!previewMap.has(message.difyConversationId)) {
      previewMap.set(message.difyConversationId, {
        content: message.content,
        createdAt: message.createdAt,
      })
    }
  })

  return NextResponse.json({
    user,
    conversations: conversations.map((conversation) => {
      const preview = previewMap.get(conversation.difyConversationId)
      return {
        ...conversation,
        messageCount: countMap.get(conversation.difyConversationId) || 0,
        preview: preview ? toConversationPreview(preview.content, 180) : '',
        updatedAt: preview?.createdAt || conversation.lastMessageAt || conversation.createdAt,
      }
    }),
  })
}
