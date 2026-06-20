import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, setSession } from '@/app/api/utils/common'
import { db, isDatabaseConfigured } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { sessionId, session } = getInfo(request)
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

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

  return NextResponse.json({
    data: conversations.map(conversation => ({
      id: conversation.difyConversationId,
      name: conversation.title || '网络学习会话',
      inputs: null,
      introduction: '',
      suggested_questions: [],
    })),
    has_more: false,
    limit: 100,
  }, {
    headers: setSession(sessionId),
  })
}
