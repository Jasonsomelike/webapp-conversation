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
