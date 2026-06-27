import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db, isDatabaseConfigured } from '@/lib/db'
import { deleteConversationMemorySources } from '@/lib/memory-consistency'
import { getSessionFromRequest } from '@/lib/session'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!isDatabaseConfigured())
  { return NextResponse.json({ error: 'Conversation storage is unavailable' }, { status: 503 }) }

  const { conversationId } = await params
  if (!conversationId || conversationId === '-1')
  { return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 }) }

  const deletedAt = new Date()
  const result = await db.$transaction(async (tx) => {
    const conversation = await tx.chatConversation.updateMany({
      where: {
        appUserId: session.id,
        difyConversationId: conversationId,
        deletedAt: null,
      },
      data: { deletedAt },
    })

    if (!conversation.count)
    { return null }

    const memorySources = await deleteConversationMemorySources({
      client: tx,
      appUserId: session.id,
      conversationId,
      reason: 'conversation-delete',
    })
    console.info('[memory-consistency] conversation deleted with memory cleanup', {
      appUserId: session.id,
      conversationId,
      deletedAt: deletedAt.toISOString(),
      memorySources,
    })

    return {
      conversations: conversation.count,
      memorySources,
    }
  })

  if (!result)
  { return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) }

  return NextResponse.json({ ok: true, deleted: result })
}
