import type { NextRequest } from 'next/server'
import { difyApiKey, fetchDify } from '@/lib/dify-server'
import { getSessionFromRequest } from '@/lib/session'
import { persistChatExchange } from '@/lib/user-data'
import { extractKnowledgeReferences } from '@/lib/reference-extractor'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!difyApiKey)
  { return Response.json({ error: 'Dify application API is not configured' }, { status: 503 }) }

  const body = await request.json()
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query)
  { return Response.json({ error: 'Query is required' }, { status: 400 }) }

  const currentDate = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
  const documentRequest = /文档|报告|讲义|总结|导出|word|docx|pdf/i.test(query)
  const upstreamQuery = documentRequest
    ? `${query}\n\n[文档格式要求：落款统一使用“计网Agent”，日期使用当前日期“${currentDate}”。]`
    : query

  let upstream: Response
  try {
    upstream = await fetchDify('/chat-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: body.inputs || {},
        query: upstreamQuery,
        files: body.files || [],
        conversation_id: body.conversation_id || '',
        response_mode: 'streaming',
        user: session.difyUserId,
      }),
    }, { connectTimeoutMs: 12_000, retries: 0 })
  }
  catch {
    return Response.json(
      { error: 'Dify 服务暂时无法连接，请稍后重试' },
      { status: 503 },
    )
  }

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
  const agentLogs: unknown[] = []
  const assistantFiles: Record<string, unknown>[] = []
  let agentLogBytes = 0
  let workflowProcess: {
    status: string
    tracing: Record<string, any>[]
    expand?: boolean
  } | undefined

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
        if (event.event === 'agent_log' && agentLogBytes < 2_000_000) {
          const log = event.data || event
          const serialized = JSON.stringify(log)
          agentLogBytes += serialized.length
          if (agentLogBytes < 2_000_000)
          { agentLogs.push(log) }
        }
        if (event.event === 'message_file') {
          assistantFiles.push({
            ...event,
            url: event.url || event.file_url,
            name: event.name || event.filename,
          })
        }
        if (event.event === 'workflow_started') {
          workflowProcess = {
            status: 'running',
            tracing: [],
            expand: true,
          }
        }
        if (event.event === 'node_started' && event.data) {
          workflowProcess ||= { status: 'running', tracing: [], expand: true }
          const node = {
            ...event.data,
            status: event.data.status || 'running',
            elapsed_time: event.data.elapsed_time || 0,
            title: event.data.title || event.data.node_type,
          }
          const index = workflowProcess.tracing.findIndex(item => item.node_id === node.node_id)
          if (index >= 0)
          { workflowProcess.tracing[index] = node }
          else
          { workflowProcess.tracing.push(node) }
        }
        if (event.event === 'node_finished' && event.data) {
          workflowProcess ||= { status: 'running', tracing: [], expand: true }
          const index = workflowProcess.tracing.findIndex(item => item.node_id === event.data.node_id)
          if (index >= 0)
          { workflowProcess.tracing[index] = event.data }
          else
          { workflowProcess.tracing.push(event.data) }
        }
        if (event.event === 'workflow_finished' && event.data) {
          workflowProcess ||= { status: event.data.status || 'succeeded', tracing: [] }
          workflowProcess.status = event.data.status || 'succeeded'
        }
      }
      catch {
        // Keep proxying malformed or future event types without blocking the chat stream.
      }
    })
  }

  let clientConnected = true
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done)
            { break }
            if (clientConnected)
            { controller.enqueue(value) }
            readEvents(decoder.decode(value, { stream: true }))
          }

          readEvents(decoder.decode())
          await persistChatExchange({
            appUserId: session.id,
            query,
            answer,
            conversationId,
            messageId,
            metadata,
            workflowProcess,
            references: extractKnowledgeReferences({
              metadata,
              agentLogs,
              answer,
            }),
            assistantFiles,
          }).catch(error => console.error('Failed to persist chat exchange', error))
          if (clientConnected)
          { controller.close() }
        }
        catch (error) {
          if (clientConnected)
          { controller.error(error) }
          else
          { console.error('Detached Dify stream failed', error) }
        }
      }
      void pump()
    },
    cancel() {
      // Keep draining and persisting the upstream response after route navigation.
      clientConnected = false
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
