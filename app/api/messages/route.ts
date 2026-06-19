import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, isDifyConfigured, requireDifyClient, setSession } from '@/app/api/utils/common'

export async function GET(request: NextRequest) {
  const { sessionId, user } = getInfo(request)
  if (!user)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')
  if (!isDifyConfigured) {
    return NextResponse.json({ data: [] }, {
      headers: setSession(sessionId),
    })
  }
  const { data }: any = await requireDifyClient().getConversationMessages(user, conversationId as string)
  return NextResponse.json(data, {
    headers: setSession(sessionId),
  })
}
