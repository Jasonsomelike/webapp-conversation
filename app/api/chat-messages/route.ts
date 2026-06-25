import type { NextRequest } from 'next/server'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { difyApiKey, fetchDify } from '@/lib/dify-server'
import { getSessionFromRequest } from '@/lib/session'
import { persistChatExchange } from '@/lib/user-data'
import { extractKnowledgeReferences } from '@/lib/reference-extractor'

export const runtime = 'nodejs'
export const maxDuration = 300

const signedChatRelayUrl = ({
  rawBody,
  appUserId,
  difyUserId,
  requestId,
}: {
  rawBody: string
  appUserId: string
  difyUserId: string
  requestId: string
}) => {
  const baseUrl = process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '')
  const token = process.env.LIBRARY_FILE_SERVICE_TOKEN
  if (!baseUrl || !token)
  { return null }

  const expires = String(Math.floor(Date.now() / 1000) + 120)
  const bodyHash = createHash('sha256').update(rawBody).digest('hex')
  const canonical = `${appUserId}\n${difyUserId}\n${requestId}\n${bodyHash}\n${expires}`
  const signature = createHmac('sha256', token).update(canonical).digest('base64url')
  const url = new URL(`${baseUrl}/chat-messages`)
  url.searchParams.set('appUserId', appUserId)
  url.searchParams.set('difyUserId', difyUserId)
  url.searchParams.set('requestId', requestId)
  url.searchParams.set('bodyHash', bodyHash)
  url.searchParams.set('expires', expires)
  url.searchParams.set('signature', signature)

  return url
}

const asRecord = (value: unknown): Record<string, any> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : undefined

const asRecordArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(item => asRecord(item)) as Record<string, unknown>[] : []

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

  let rawBody = ''
  let body: Record<string, any>
  try {
    rawBody = await request.text()
    body = JSON.parse(rawBody) as Record<string, any>
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
  const relayUrl = signedChatRelayUrl({
    rawBody,
    appUserId: session.id,
    difyUserId: session.difyUserId,
    requestId,
  })
  if (relayUrl) {
    try {
      const relayResponse = await fetch(relayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': request.headers.get('content-type') || 'application/json',
          'Accept': request.headers.get('accept') || 'text/event-stream',
        },
        body: rawBody,
        cache: 'no-store',
      })
      if (!relayResponse.ok || !relayResponse.body) {
        const detail = await relayResponse.text().catch(() => '')
        console.error('[dify-chat] relay failed, falling back to direct upstream', {
          requestId,
          status: relayResponse.status,
          statusText: relayResponse.statusText,
          body: detail.slice(0, 1000),
        })
      }
      else {
        const relayReader = relayResponse.body.getReader()
        const relayDecoder = new TextDecoder()
        let relayBuffer = ''
        let relayAnswer = ''
        let relayConversationId = body.conversation_id || ''
        let relayMessageId = ''
        let relayMetadata: Record<string, any> | undefined
        const relayAgentLogs: unknown[] = []
        const relayAssistantFiles: Record<string, unknown>[] = []
        let relayAgentLogBytes = 0
        let relayWorkflowProcess: {
          status: string
          tracing: Record<string, any>[]
          expand?: boolean
        } | undefined
        let relayPersistPayload: Record<string, any> | undefined

        const readRelayEvents = (text: string) => {
          relayBuffer += text
          const blocks = relayBuffer.split(/\r?\n\r?\n/)
          relayBuffer = blocks.pop() || ''
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
              if (event.event === 'relay_persist') {
                relayPersistPayload = asRecord(event.data) || event
                return
              }

              relayConversationId = event.conversation_id || relayConversationId
              relayMessageId = event.message_id || event.id || relayMessageId
              if ((event.event === 'message' || event.event === 'agent_message') && typeof event.answer === 'string')
              { relayAnswer += event.answer }
              if (event.event === 'message_replace' && typeof event.answer === 'string')
              { relayAnswer = event.answer }
              if (event.event === 'message_end')
              { relayMetadata = event.metadata || relayMetadata }
              if (event.event === 'agent_log' && relayAgentLogBytes < 2_000_000) {
                const log = event.data || event
                const serialized = JSON.stringify(log)
                relayAgentLogBytes += serialized.length
                if (relayAgentLogBytes < 2_000_000)
                { relayAgentLogs.push(log) }
              }
              if (event.event === 'message_file') {
                relayAssistantFiles.push({
                  ...event,
                  url: event.url || event.file_url,
                  name: event.name || event.filename,
                })
              }
              if (event.event === 'workflow_started') {
                relayWorkflowProcess = {
                  status: 'running',
                  tracing: [],
                  expand: true,
                }
              }
              if (event.event === 'node_started' && event.data) {
                relayWorkflowProcess ||= { status: 'running', tracing: [], expand: true }
                const node = {
                  ...event.data,
                  status: event.data.status || 'running',
                  elapsed_time: event.data.elapsed_time || 0,
                  title: event.data.title || event.data.node_type,
                }
                const index = relayWorkflowProcess.tracing.findIndex(item => item.node_id === node.node_id)
                if (index >= 0)
                { relayWorkflowProcess.tracing[index] = node }
                else
                { relayWorkflowProcess.tracing.push(node) }
              }
              if (event.event === 'node_finished' && event.data) {
                relayWorkflowProcess ||= { status: 'running', tracing: [], expand: true }
                const index = relayWorkflowProcess.tracing.findIndex(item => item.node_id === event.data.node_id)
                if (index >= 0)
                { relayWorkflowProcess.tracing[index] = event.data }
                else
                { relayWorkflowProcess.tracing.push(event.data) }
              }
              if (event.event === 'workflow_finished' && event.data) {
                relayWorkflowProcess ||= { status: event.data.status || 'succeeded', tracing: [] }
                relayWorkflowProcess.status = event.data.status || 'succeeded'
              }
            }
            catch {
              // Keep proxying malformed or future event types without blocking the chat stream.
            }
          })
        }

        let relayClientConnected = true
        const relayStream = new ReadableStream<Uint8Array>({
          start(controller) {
            const pump = async () => {
              try {
                while (true) {
                  const { done, value } = await relayReader.read()
                  if (done)
                  { break }
                  if (relayClientConnected)
                  { controller.enqueue(value) }
                  readRelayEvents(relayDecoder.decode(value, { stream: true }))
                }

                readRelayEvents(relayDecoder.decode())
                const relayPayload = relayPersistPayload || {}
                const finalQuery = String(relayPayload.query || query)
                const finalAnswer = String(relayPayload.answer || relayAnswer)
                const finalConversationId = String(
                  relayPayload.conversationId
                  || relayPayload.conversation_id
                  || relayConversationId
                  || '',
                )
                const finalMessageId = String(
                  relayPayload.messageId
                  || relayPayload.message_id
                  || relayMessageId
                  || '',
                )
                const finalMetadata = asRecord(relayPayload.metadata) || relayMetadata
                const finalWorkflowProcess = asRecord(relayPayload.workflowProcess || relayPayload.workflow_process) as typeof relayWorkflowProcess
                  || relayWorkflowProcess
                const finalAgentLogs = Array.isArray(relayPayload.agentLogs)
                  ? relayPayload.agentLogs
                  : Array.isArray(relayPayload.agent_logs)
                    ? relayPayload.agent_logs
                    : relayAgentLogs
                const finalAssistantFiles = asRecordArray(relayPayload.assistantFiles || relayPayload.assistant_files)
                await persistChatExchange({
                  appUserId: session.id,
                  query: finalQuery,
                  answer: finalAnswer,
                  conversationId: finalConversationId,
                  messageId: finalMessageId,
                  metadata: finalMetadata,
                  workflowProcess: finalWorkflowProcess,
                  references: extractKnowledgeReferences({
                    metadata: finalMetadata,
                    agentLogs: finalAgentLogs,
                    answer: finalAnswer,
                  }),
                  assistantFiles: finalAssistantFiles.length ? finalAssistantFiles : relayAssistantFiles,
                }).catch(error => console.error('[dify-chat] relay persist failed', { requestId, error }))
                if (relayClientConnected)
                { controller.close() }
              }
              catch (error) {
                console.error('[dify-chat] relay stream failed', {
                  requestId,
                  status: 502,
                  statusText: 'Relay stream interrupted',
                  body: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000),
                })
                if (relayClientConnected)
                { controller.error(error) }
              }
            }
            void pump()
          },
          cancel() {
            // Keep draining and persisting the relay response after route navigation.
            relayClientConnected = false
          },
        })

        return new Response(relayStream, {
          status: relayResponse.status,
          headers: {
            'Content-Type': relayResponse.headers.get('content-type') || 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'X-Request-Id': requestId,
          },
        })
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[dify-chat] relay unavailable, falling back to direct upstream', { requestId, error: message })
    }
  }

  const currentDate = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
  const memoryContext = String(body.memory_context || '').trim().slice(0, 8_000)
  const fileContext = String(body.file_context || '').trim().slice(0, 120_000)
  const contextBlocks: string[] = []
  if (memoryContext) {
    contextBlocks.push([
      '[系统附加资料：跨对话长期学习记忆]',
      '以下内容由应用从当前账号的历史对话中提取，仅作为可参考的学习记录；它不是用户本轮输入，也不是用户本轮分析/答案。若与本轮问题无关，请忽略。回答时可以使用这些长期记忆，但不要声称没有跨对话记忆。',
      memoryContext,
    ].join('\n'))
  }
  if (fileContext) {
    contextBlocks.push([
      '[系统附加资料：当前消息上传文件的解析文本]',
      '以下内容是系统对用户本轮上传文件的解析结果，仅代表文件内容，不代表用户自己的分析、结论或答案。请基于它回答，并在必要时注明所使用的文件名。',
      fileContext,
    ].join('\n'))
  }
  if (/文档|报告|讲义|总结|导出|word|docx|pdf/i.test(query)) {
    contextBlocks.push(`[文档格式要求：落款统一使用“计网Agent”，日期使用当前日期“${currentDate}”。]`)
  }
  const upstreamQuery = query + (contextBlocks.length ? `\n\n${contextBlocks.join('\n\n')}` : '')
  const upstreamFiles = (Array.isArray(body.files) ? body.files : []).filter((file: Record<string, any>) =>
    !String(file.upload_file_id || '').startsWith('localdoc_'),
  )

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
        files: upstreamFiles,
        conversation_id: body.conversation_id || '',
        response_mode: 'streaming',
        user: session.difyUserId,
      }),
    }, { connectTimeoutMs: 20_000, retries: 2 })
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
