import type { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { difyApiKey, fetchDify } from '@/lib/dify-server'
import { getSessionFromRequest } from '@/lib/session'
import { persistChatExchange } from '@/lib/user-data'
import { extractKnowledgeReferences } from '@/lib/reference-extractor'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  const session = getSessionFromRequest(request)
  if (!session) {
    return Response.json(
      { error: '登录状态已失效，请重新登录', requestId },
      { status: 401, headers: { 'X-Request-Id': requestId } },
    )
  }
  if (!difyApiKey) {
    console.error('[dify-chat] failed', { requestId, status: 503, statusText: 'DIFY_API_KEY missing' })
    return Response.json(
      { error: 'Dify 应用服务尚未配置', requestId },
      { status: 503, headers: { 'X-Request-Id': requestId } },
    )
  }

  let body: Record<string, any>
  try {
    body = await request.json()
  }
  catch {
    return Response.json(
      { error: '请求内容不是有效的 JSON', requestId },
      { status: 400, headers: { 'X-Request-Id': requestId } },
    )
  }
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query) {
    return Response.json(
      { error: '请输入问题后再发送', requestId },
      { status: 400, headers: { 'X-Request-Id': requestId } },
    )
  }

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
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[dify-chat] failed', {
      requestId,
      status: 503,
      statusText: 'Unable to connect to Dify',
      body: message.slice(0, 1000),
    })
    return Response.json(
      { error: 'Dify 服务暂时无法连接，请稍后重试', detail: message, requestId },
      { status: 503, headers: { 'X-Request-Id': requestId } },
    )
  }

  if (!upstream.ok || !upstream.body) {
    const errorBody = await upstream.text()
    console.error('[dify-chat] failed', {
      requestId,
      status: upstream.status,
      statusText: upstream.statusText,
      body: errorBody.slice(0, 1000),
    })
    return Response.json({
      error: `Dify 请求失败（HTTP ${upstream.status}）`,
      detail: errorBody.slice(0, 1000),
      requestId,
    }, {
      status: upstream.status || 502,
      headers: { 'X-Request-Id': requestId },
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
          }).catch(error => console.error('[dify-chat] persist failed', { requestId, error }))
          if (clientConnected)
          { controller.close() }
        }
        catch (error) {
          console.error('[dify-chat] stream failed', {
            requestId,
            status: 502,
            statusText: 'Dify stream interrupted',
            body: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000),
          })
          if (clientConnected)
          { controller.error(error) }
          else
          { console.error('[dify-chat] detached stream failed', { requestId, error }) }
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
      'X-Request-Id': requestId,
    },
  })
}
