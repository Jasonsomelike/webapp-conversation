import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createConversationShareToken } from '@/lib/conversation-share'
import { getSessionFromRequest } from '@/lib/session'

const schema = z.object({
  scope: z.enum(['all', 'latest']).default('all'),
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

  const conversation = await db.chatConversation.findFirst({
    where: { appUserId: session.id, difyConversationId: conversationId, deletedAt: null },
    select: { id: true },
  })
  if (!conversation)
  { return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) }

  const token = createConversationShareToken({
    appUserId: session.id,
    conversationId,
    scope: parsed.data.scope,
  })
  return NextResponse.json({
    token,
    url: `${request.nextUrl.origin}/share/${token}`,
    expiresInDays: 30,
  })
}
