import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, isDifyConfigured, requireDifyClient } from '@/app/api/utils/common'
import { db, isDatabaseConfigured } from '@/lib/db'

export async function POST(request: NextRequest, { params }: {
  params: Promise<{ conversationId: string }>
}) {
  const body = await request.json()
  const {
    auto_generate,
    name,
  } = body
  const { conversationId } = await params
  const { session, user } = getInfo(request)
  if (!session || !user)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (isDatabaseConfigured()) {
    const ownedConversation = await db.chatConversation.findFirst({
      where: {
        appUserId: session.id,
        difyConversationId: conversationId,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!ownedConversation)
    { return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) }
  }
  if (!isDifyConfigured)
  { return NextResponse.json({ name: name || '网络学习会话' }) }

  // auto generate name
  const { data } = await requireDifyClient().renameConversation(conversationId, name, user, auto_generate)
  if (isDatabaseConfigured() && data?.name) {
    await db.chatConversation.updateMany({
      where: {
        appUserId: session.id,
        difyConversationId: conversationId,
      },
      data: { title: data.name },
    })
  }
  return NextResponse.json(data)
}
