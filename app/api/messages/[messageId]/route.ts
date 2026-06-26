import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db, isDatabaseConfigured } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/session'

const normalizeMessageId = (messageId: string) =>
  decodeURIComponent(messageId).replace(/^question-/, '').trim()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!isDatabaseConfigured())
  { return NextResponse.json({ error: 'Message storage is unavailable' }, { status: 503 }) }

  const { messageId } = await params
  const normalizedId = normalizeMessageId(messageId)
  if (!normalizedId || normalizedId.startsWith('answer-placeholder-'))
  { return NextResponse.json({ error: 'Invalid message id' }, { status: 400 }) }

  const conversationId = request.nextUrl.searchParams.get('conversation_id') || undefined
  const result = await db.chatMessage.deleteMany({
    where: {
      appUserId: session.id,
      difyMessageId: normalizedId,
      ...(conversationId ? { difyConversationId: conversationId } : {}),
    },
  })

  const references = await db.messageReference.deleteMany({
    where: {
      appUserId: session.id,
      difyMessageId: normalizedId,
      ...(conversationId ? { difyConversationId: conversationId } : {}),
    },
  })

  if (!result.count)
  { return NextResponse.json({ error: 'Message not found' }, { status: 404 }) }

  console.info('[memory-consistency] deleted message memory sources', {
    appUserId: session.id,
    messageId: normalizedId,
    conversationId,
    messages: result.count,
    references: references.count,
  })

  return NextResponse.json({ ok: true, deleted: result.count, references: references.count })
}
