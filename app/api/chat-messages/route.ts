import type { NextRequest } from 'next/server'
import { demoReferences } from '@/lib/demo-data'
import { getInfo, isDifyConfigured, requireDifyClient } from '@/app/api/utils/common'

export const runtime = 'nodejs'
export const maxDuration = 300

const demoStream = (query: string, user: string) => {
  const encoder = new TextEncoder()
  const conversationId = `demo-conversation-${user.slice(-8)}`
  const messageId = `demo-message-${Date.now()}`
  const answer = `你问的是「${query}」。在演示模式下，我会保留与正式 Dify WebApp 相同的流式交互方式。\n\n以最长前缀匹配为例：路由器会先找出所有能匹配目的地址的路由项，再选择前缀长度最长的一项。前缀越长，代表地址范围越小、路由越具体。\n\n正式配置 DIFY_API_KEY 后，这里会直接复用现有 Skill Agent、知识库、百炼记忆和工具调用链路。`

  return new ReadableStream({
    async start(controller) {
      const chunks = answer.match(/[\s\S]{1,18}/g) || [answer]
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          event: 'message',
          task_id: `demo-task-${messageId}`,
          id: messageId,
          conversation_id: conversationId,
          answer: chunk,
        })}\n\n`))
        await new Promise(resolve => setTimeout(resolve, 24))
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        event: 'message_end',
        id: messageId,
        conversation_id: conversationId,
        metadata: {
          retriever_resources: demoReferences.slice(0, 2).map(reference => ({
            content: reference.quote,
            data_source_type: 'upload_file',
            dataset_name: reference.datasetName,
            dataset_id: 'demo-dataset',
            document_id: reference.id,
            document_name: reference.documentName,
            hit_count: 1,
            index_node_hash: reference.id,
            segment_id: reference.id,
            segment_position: reference.pageNumber,
            score: reference.score,
            word_count: reference.quote?.length || 0,
          })),
        },
      })}\n\n`))
      controller.close()
    },
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    inputs,
    query,
    files,
    conversation_id: conversationId,
    response_mode: responseMode,
  } = body
  const { user } = getInfo(request)

  if (!isDifyConfigured) {
    return new Response(demoStream(query, user), {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  }

  const res = await requireDifyClient().createChatMessage(inputs, query, user, responseMode, conversationId, files)
  return new Response(res.data as any)
}
