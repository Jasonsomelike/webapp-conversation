import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, isDifyConfigured, setSession } from '@/app/api/utils/common'
import { fetchDifyJson } from '@/lib/dify-server'

export async function GET(request: NextRequest) {
  const { sessionId, user } = getInfo(request)
  if (!user)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!isDifyConfigured) {
    return NextResponse.json({ data: [] }, {
      headers: setSession(sessionId),
    })
  }
  try {
    const data = await fetchDifyJson<Record<string, unknown>>(
      `/conversations?user=${encodeURIComponent(user)}&limit=100`,
    )
    return NextResponse.json(data, {
      headers: setSession(sessionId),
    })
  }
  catch {
    return NextResponse.json({
      data: [],
      has_more: false,
      limit: 100,
      degraded: true,
    }, {
      headers: setSession(sessionId),
    })
  }
}
