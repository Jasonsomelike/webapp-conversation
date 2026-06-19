import type { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { persistChatExchange } from '@/lib/user-data'

export const runtime = 'nodejs'
export const maxDuration = 300

const apiUrl = (process.env.DIFY_API_BASE_URL || 'https://dify.jasonsome.cn:22380/v1').replace(/\/$/, '')

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!process.env.DIFY_API_KEY)
  { return Response.json({ error: 'Dify application API is not configured' }, { status: 503 }) }

  const body = await request.json()
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query)
  { return Response.json({ error: 'Query is required' }, { status: 400 }) }

  const upstream = await fetch(`${apiUrl}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: body.inputs || {},
      query,
      files: body.files || [],
      conversation_id: body.conversation_id || '',
      response_mode: 'streaming',
      user: session.difyUserId,
    }),
    signal: request.signal,
  })

  if (!upstream.ok || !upstream.body) {
    const errorBody = await upstream.text()
    return new Response(errorBody, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
    })
  }

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let answer = ''
  let conversationId = body.conversation_id || ''
  let messageId = ''
  let metadata: Record<string, any> | undefined

  const readEvents = (text: string) => {
    buffer += text
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() || ''
    blocks.forEach((block) => {
      const data = block
        .split(/\r?\n/)
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trim())
        .join('\n')
      if (!data || data === '[DONE]')
      { return }
      try {
        const event = JSON.parse(data)
        conversationId = event.conversation_id || conversationId
        messageId = event.message_id || event.id || messageId
        if ((event.event === 'message' || event.event === 'agent_message') && typeof event.answer === 'string')
        { answer += event.answer }
        if (event.event === 'message_replace' && typeof event.answer === 'string')
        { answer = event.answer }
        if (event.event === 'message_end')
        { metadata = event.metadata || metadata }
      }
      catch {
        // Keep proxying malformed or future event types without blocking the chat stream.
      }
    })
  }

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (!done) {
          controller.enqueue(value)
          readEvents(decoder.decode(value, { stream: true }))
          return
        }

        readEvents(decoder.decode())
        await persistChatExchange({
          appUserId: session.id,
          query,
          answer,
          conversationId,
          messageId,
          metadata,
        }).catch(error => console.error('Failed to persist chat exchange', error))
        controller.close()
      }
      catch (error) {
        controller.error(error)
      }
    },
    cancel() {
      reader.cancel().catch(() => undefined)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
