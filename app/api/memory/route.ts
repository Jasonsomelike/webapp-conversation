import type { NextRequest } from 'next/server'
import { buildCrossConversationMemory } from '@/lib/user-memory'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  const excludeConversationId = request.nextUrl.searchParams.get('excludeConversationId') || undefined
  try {
    const context = await buildCrossConversationMemory({
      appUserId: session.id,
      excludeConversationId,
    })
    return Response.json({ context }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }
  catch (error) {
    console.error('[cross-conversation-memory] failed', { appUserId: session.id, error })
    return Response.json({ context: '' })
  }
}
