import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, isDifyConfigured, requireDifyClient, setSession } from '@/app/api/utils/common'

export async function GET(request: NextRequest) {
  const { sessionId, user } = getInfo(request)
  if (!isDifyConfigured) {
    return NextResponse.json({ data: [] }, {
      headers: setSession(sessionId),
    })
  }
  try {
    const { data }: any = await requireDifyClient().getConversations(user)
    return NextResponse.json(data, {
      headers: setSession(sessionId),
    })
  }
  catch (error: any) {
    return NextResponse.json({
      data: [],
      error: error.message,
    })
  }
}
