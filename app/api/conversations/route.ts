import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, setSession } from '@/app/api/utils/common'
import { db, isDatabaseConfigured } from '@/lib/db'
import { auditMemorySourceConsistency, recoverMissingConversationRows } from '@/lib/memory-consistency'
import { toConversationPreview } from '@/lib/message-preview'

export async function GET(request: NextRequest) {
  const { sessionId, session } = getInfo(request)
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  if (isDatabaseConfigured()) {
    await recoverMissingConversationRows({
      appUserId: session.id,
      reason: 'conversation-list',
    }).catch(error => console.warn('[memory-consistency] failed to recover missing conversation rows', {
      appUserId: session.id,
      error,
    }))
  }

  const conversations = isDatabaseConfigured()
    ? await db.chatConversation.findMany({
      where: {
        appUserId: session.id,
        deletedAt: null,
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    })
    : []
  const conversationIds = conversations.map(conversation => conversation.difyConversationId)
  auditMemorySourceConsistency({
    appUserId: session.id,
    activeConversationIds: conversationIds,
    reason: 'conversation-list',
  }).catch(error => console.warn('[memory-consistency] conversation list audit failed', {
    appUserId: session.id,
    error,
  }))

  const recentMessages = isDatabaseConfigured() && conversationIds.length
    ? await db.chatMessage.findMany({
      where: {
        appUserId: session.id,
        difyConversationId: { in: conversationIds },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(500, conversationIds.length * 6),
      select: {
        difyConversationId: true,
        role: true,
        content: true,
        createdAt: true,
      },
    })
    : []
  const previews = new Map<string, { content: string, createdAt: Date }>()
  recentMessages.forEach((message) => {
    if (message.role === 'assistant' && !previews.has(message.difyConversationId)) {
      previews.set(message.difyConversationId, {
        content: message.content,
        createdAt: message.createdAt,
      })
    }
  })
  recentMessages.forEach((message) => {
    if (!previews.has(message.difyConversationId)) {
      previews.set(message.difyConversationId, {
        content: message.content,
        createdAt: message.createdAt,
      })
    }
  })

  return NextResponse.json({
    data: conversations.map((conversation) => {
      const preview = previews.get(conversation.difyConversationId)
      const previewText = preview ? toConversationPreview(preview.content, 96) : ''
      return {
        id: conversation.difyConversationId,
        name: conversation.title || '网络学习会话',
        inputs: null,
        introduction: '',
        suggested_questions: [],
        preview: previewText || '点击继续本次学习对话',
        updatedAt: (preview?.createdAt || conversation.lastMessageAt || conversation.createdAt).toISOString(),
      }
    }),
    has_more: false,
    limit: 100,
  }, {
    headers: setSession(sessionId),
  })
}
