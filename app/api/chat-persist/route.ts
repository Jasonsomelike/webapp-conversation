import type { NextRequest } from 'next/server'
import { extractKnowledgeReferences } from '@/lib/reference-extractor'
import { getSessionFromRequest } from '@/lib/session'
import { persistChatExchange } from '@/lib/user-data'
import { toMessageText } from '@/lib/safe-text'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return Response.json({ error: 'Unauthorized' }, { status: 401 }) }

  try {
    const body = await request.json() as Record<string, any>
    const query = toMessageText(body.query)
    const answer = toMessageText(body.answer)
    await persistChatExchange({
      appUserId: session.id,
      query,
      answer,
      conversationId: String(body.conversationId || ''),
      messageId: String(body.messageId || ''),
      metadata: body.metadata,
      workflowProcess: body.workflowProcess,
      references: extractKnowledgeReferences({
        metadata: body.metadata,
        agentLogs: Array.isArray(body.agentLogs) ? body.agentLogs : [],
        answer,
      }),
      assistantFiles: Array.isArray(body.assistantFiles) ? body.assistantFiles : [],
      userFiles: Array.isArray(body.userFiles) ? body.userFiles : Array.isArray(body.user_files) ? body.user_files : [],
    })
    return Response.json({ ok: true })
  }
  catch (error) {
    console.error('[chat-persist] failed', { appUserId: session.id, error })
    return Response.json({ error: 'Persist failed' }, { status: 500 })
  }
}
