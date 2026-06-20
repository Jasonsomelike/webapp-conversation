import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, setSession } from '@/app/api/utils/common'
import { db, isDatabaseConfigured } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { sessionId, session } = getInfo(request)
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')
  if (!conversationId)
  { return NextResponse.json({ data: [] }, { headers: setSession(sessionId) }) }

  const activeConversation = isDatabaseConfigured()
    ? await db.chatConversation.findFirst({
      where: {
        appUserId: session.id,
        difyConversationId: conversationId,
        deletedAt: null,
      },
      select: { id: true },
    })
    : null
  if (isDatabaseConfigured() && !activeConversation)
  { return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) }

  const messages = isDatabaseConfigured()
    ? await db.chatMessage.findMany({
      where: {
        appUserId: session.id,
        difyConversationId: conversationId,
      },
      orderBy: { createdAt: 'asc' },
    })
    : []

  const userMessages = new Map(
    messages
      .filter(message => message.role === 'user')
      .map(message => [message.difyMessageId, message]),
  )
  const data = messages
    .filter(message => message.role === 'assistant')
    .map((message) => {
      const rawPayload = message.rawPayload && typeof message.rawPayload === 'object' && !Array.isArray(message.rawPayload)
        ? message.rawPayload as Record<string, any>
        : undefined
      return {
        id: message.difyMessageId || message.id,
        query: userMessages.get(message.difyMessageId)?.content || '',
        answer: message.content,
        message_files: rawPayload?.assistantFiles || [],
        agent_thoughts: [],
        feedback: null,
        workflowProcess: rawPayload?.workflowProcess,
      }
    })

  return NextResponse.json({
    data,
    has_more: false,
    limit: data.length,
  }, {
    headers: setSession(sessionId),
  })
}
