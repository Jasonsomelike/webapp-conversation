import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, isDifyConfigured, requireDifyClient } from '@/app/api/utils/common'

export async function POST(request: NextRequest, { params }: {
  params: Promise<{ conversationId: string }>
}) {
  const body = await request.json()
  const {
    auto_generate,
    name,
  } = body
  const { conversationId } = await params
  const { user } = getInfo(request)
  if (!isDifyConfigured)
  { return NextResponse.json({ name: name || '网络学习会话' }) }

  // auto generate name
  const { data } = await requireDifyClient().renameConversation(conversationId, name, user, auto_generate)
  return NextResponse.json(data)
}
