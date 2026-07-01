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

  const result = await db.$transaction(async (tx) => {
    const conversation = await tx.chatConversation.findFirst({
      where: {
        appUserId: session.id,
        difyConversationId: conversationId,
      },
      select: { id: true },
    })

    if (!conversation)
    { return null }

    const memorySources = await deleteConversationMemorySources({
      client: tx,
      appUserId: session.id,
      conversationId,
      reason: 'conversation-delete',
    })
    const conversations = await tx.chatConversation.deleteMany({
      where: {
        appUserId: session.id,
        difyConversationId: conversationId,
      },
    })
    const derivedMemory = {
      graphEdges: (await tx.graphEdge.deleteMany({ where: { appUserId: session.id } })).count,
      graphNodes: (await tx.graphNode.deleteMany({ where: { appUserId: session.id } })).count,
      reports: (await tx.userAnalysisReport.deleteMany({ where: { appUserId: session.id } })).count,
    }
    console.info('[memory-consistency] conversation deleted with memory cleanup', {
      appUserId: session.id,
      conversationId,
      hardDeleted: true,
      memorySources,
      derivedMemory,
    })

    return {
      conversations: conversations.count,
      memorySources,
      derivedMemory,
    }
  })

  if (!result)
  { return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) }

  return NextResponse.json({ ok: true, deleted: result })
}
