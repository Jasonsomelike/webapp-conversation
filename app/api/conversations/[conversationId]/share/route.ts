import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db, withDatabaseRetry } from '@/lib/db'
import { createStoredConversationShare } from '@/lib/conversation-share'
import { getSessionFromRequest } from '@/lib/session'

const schema = z.object({
  scope: z.enum(['all', 'latest', 'selected']).default('all'),
  messageIds: z.array(z.string().min(1).max(128)).max(60).optional(),
}).superRefine((value, context) => {
  if (value.scope === 'selected' && !value.messageIds?.length) {
    context.addIssue({
      code: 'custom',
      message: '请至少选择一组对话',
      path: ['messageIds'],
    })
  }
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { conversationId } = await params
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success)
  { return NextResponse.json({ error: '分享范围无效' }, { status: 400 }) }

  const conversation = await withDatabaseRetry(() => db.chatConversation.findFirst({
    where: { appUserId: session.id, difyConversationId: conversationId, deletedAt: null },
    select: { id: true },
  })).catch((error) => {
    console.error('[conversation-share] failed to load conversation', {
      appUserId: session.id,
      conversationId,
      error,
    })
    return null
  })
  if (!conversation)
  { return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) }

  const messageIds = parsed.data.scope === 'selected'
    ? [...new Set(parsed.data.messageIds)]
    : undefined
  if (messageIds?.length) {
    const ownedMessages = await withDatabaseRetry(() => db.chatMessage.count({
      where: {
        appUserId: session.id,
        difyConversationId: conversationId,
        role: 'assistant',
        difyMessageId: { in: messageIds },
      },
    })).catch((error) => {
      console.error('[conversation-share] failed to verify selected messages', {
        appUserId: session.id,
        conversationId,
        error,
      })
      return -1
    })
    if (ownedMessages !== messageIds.length)
    { return NextResponse.json({ error: '分享内容已变化，请刷新后重试' }, { status: 409 }) }
  }

  const share = await createStoredConversationShare({
    appUserId: session.id,
    conversationId,
    scope: parsed.data.scope,
    messageIds,
  })
  return NextResponse.json({
    token: share.token,
    url: `${request.nextUrl.origin}/share/${share.token}`,
    expiresInDays: 30,
  })
}
