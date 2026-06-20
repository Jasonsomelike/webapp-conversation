import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db, isDatabaseConfigured } from '@/lib/db'
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

  const result = await db.chatConversation.updateMany({
    where: {
      appUserId: session.id,
      difyConversationId: conversationId,
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  })

  if (!result.count)
  { return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) }

  return NextResponse.json({ ok: true })
}
