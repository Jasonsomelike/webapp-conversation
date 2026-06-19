import 'server-only'

import type { Prisma } from '@prisma/client'
import { db, isDatabaseConfigured } from '@/lib/db'
import type { KnowledgeReference, LearningAnalysis, WeakTopic } from '@/lib/learning-types'
import type { ExtractedReference } from '@/lib/reference-extractor'
import { extractKnowledgeReferences } from '@/lib/reference-extractor'

interface RetrieverResource extends ExtractedReference {
  content?: string
  dataset_name?: string
  document_name?: string
  segment_id?: string
  segment_position?: number
  score?: number
  page?: number
  page_number?: number
  original_page_number?: number
  page_image_url?: string
  url?: string
  [key: string]: unknown
}

interface PersistChatExchangeInput {
  appUserId: string
  query: string
  answer: string
  conversationId: string
  messageId: string
  metadata?: {
    retriever_resources?: RetrieverResource[]
    [key: string]: unknown
  }
  workflowProcess?: {
    status: string
    tracing: Record<string, unknown>[]
    expand?: boolean
  }
  references?: ExtractedReference[]
  assistantFiles?: Record<string, unknown>[]
}

const pageFromDocumentName = (name: string, segmentPosition?: number) => {
  if (!segmentPosition)
  { return undefined }
  const matched = name.match(/_p(\d+)-(\d+)\.pdf$/i)
  return matched ? Number(matched[1]) + segmentPosition - 1 : undefined
}

const toJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue

export const persistChatExchange = async ({
  appUserId,
  query,
  answer,
  conversationId,
  messageId,
  metadata,
  workflowProcess,
  references,
  assistantFiles,
}: PersistChatExchangeInput) => {
  if (!isDatabaseConfigured() || !conversationId || !messageId)
  { return }

  const resources = references || metadata?.retriever_resources || []
  await db.$transaction(async (tx) => {
    await tx.chatConversation.upsert({
      where: {
        appUserId_difyConversationId: {
          appUserId,
          difyConversationId: conversationId,
        },
      },
      update: { lastMessageAt: new Date() },
      create: {
        appUserId,
        difyConversationId: conversationId,
        title: query.slice(0, 120),
        lastMessageAt: new Date(),
      },
    })

    await tx.chatMessage.createMany({
      data: [
        {
          appUserId,
          difyConversationId: conversationId,
          difyMessageId: messageId,
          role: 'user',
          content: query,
        },
        {
          appUserId,
          difyConversationId: conversationId,
          difyMessageId: messageId,
          role: 'assistant',
          content: answer,
          rawPayload: metadata || workflowProcess || assistantFiles?.length
            ? toJson({
              ...(metadata || {}),
              workflowProcess,
              assistantFiles,
            })
            : undefined,
        },
      ],
      skipDuplicates: true,
    })

    if (resources.length) {
      await tx.messageReference.createMany({
        data: resources.map((resource, index) => {
          const documentName = resource.document_name || '未命名文档'
          const pageNumber = resource.segment_position || resource.page || resource.page_number
          return {
            appUserId,
            difyConversationId: conversationId,
            difyMessageId: messageId,
            documentName,
            datasetName: resource.dataset_name,
            segmentId: resource.segment_id || `${messageId}-${index}`,
            pageNumber,
            originalPageNumber: resource.original_page_number || pageFromDocumentName(documentName, pageNumber),
            quote: resource.content,
            score: resource.score,
            pageImageUrl: resource.page_image_url,
            sourceUrl: resource.url,
            rawPayload: toJson(resource),
          }
        }),
        skipDuplicates: true,
      })
    }
  })
}

export const getUserReferences = async (appUserId: string): Promise<KnowledgeReference[]> => {
  if (!isDatabaseConfigured())
  { return [] }

  const storedMessages = await db.chatMessage.findMany({
    where: {
      appUserId,
      role: 'assistant',
      difyMessageId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
    select: {
      content: true,
      createdAt: true,
      difyConversationId: true,
      difyMessageId: true,
      rawPayload: true,
    },
  })
  const recoveredReferences = storedMessages.flatMap((message) => {
    const metadata = message.rawPayload && typeof message.rawPayload === 'object' && !Array.isArray(message.rawPayload)
      ? message.rawPayload as Record<string, any>
      : undefined
    return extractKnowledgeReferences({
      metadata,
      agentLogs: [],
      answer: message.content,
    }).map((resource, index) => {
      const documentName = resource.document_name || '未命名文档'
      const pageNumber = resource.segment_position || resource.page || resource.page_number
      return {
        appUserId,
        difyConversationId: message.difyConversationId,
        difyMessageId: message.difyMessageId,
        documentName,
        datasetName: resource.dataset_name,
        segmentId: resource.segment_id || `${message.difyMessageId || message.createdAt.getTime()}-recovered-${index}`,
        pageNumber,
        originalPageNumber: resource.original_page_number || pageFromDocumentName(documentName, pageNumber),
        quote: resource.content,
        score: resource.score,
        pageImageUrl: resource.page_image_url,
        sourceUrl: resource.url,
        rawPayload: toJson(resource),
        createdAt: message.createdAt,
      }
    })
  })
  if (recoveredReferences.length)
  {
    await db.messageReference.createMany({ data: recoveredReferences, skipDuplicates: true })
    await Promise.all(recoveredReferences
      .filter(reference => reference.pageImageUrl || reference.sourceUrl)
      .map(reference => db.messageReference.updateMany({
        where: {
          appUserId,
          difyMessageId: reference.difyMessageId,
          segmentId: reference.segmentId,
        },
        data: {
          pageImageUrl: reference.pageImageUrl,
          sourceUrl: reference.sourceUrl,
          rawPayload: reference.rawPayload,
        },
      })))
  }

  const references = await db.messageReference.findMany({
    where: { appUserId },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })

  return references.map(reference => ({
    ...(reference.rawPayload && typeof reference.rawPayload === 'object' && !Array.isArray(reference.rawPayload)
      ? { documentId: (reference.rawPayload as Record<string, any>).document_id as string | undefined }
      : {}),
    id: reference.id,
    conversationId: reference.difyConversationId || '',
    messageId: reference.difyMessageId || undefined,
    documentName: reference.documentName || '未命名文档',
    datasetName: reference.datasetName || undefined,
    pageNumber: reference.pageNumber || undefined,
    originalPageNumber: reference.originalPageNumber || undefined,
    quote: reference.quote || undefined,
    score: reference.score ? Number(reference.score) : undefined,
    pageImageUrl: reference.pageImageUrl || undefined,
    sourceUrl: reference.sourceUrl || undefined,
    topic: '知识库引用',
    createdAt: reference.createdAt.toISOString(),
  }))
}

const emptyAnalysis: LearningAnalysis = {
  summary: '当前账号还没有足够的学习记录。开始与 AI 学习助手对话后，这里会根据你的会话和知识库引用生成专属分析。',
  currentStage: '等待学习数据',
  momentum: 0,
  conversations: 0,
  references: 0,
  documents: 0,
  studyMinutes: 0,
  weakTopics: [],
  strongTopics: [],
  trend: [0, 0, 0, 0, 0, 0, 0],
  recommendations: [
    {
      title: '开始第一次知识库问答',
      reason: '提出一个课程问题，建立当前账号的学习记录',
      priority: '现在',
      tone: 'primary',
    },
  ],
}

export const getUserAnalysis = async (appUserId: string): Promise<LearningAnalysis> => {
  if (!isDatabaseConfigured())
  { return emptyAnalysis }

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 6)

  const [conversationCount, referenceCount, messages, references, profile] = await Promise.all([
    db.chatConversation.count({ where: { appUserId } }),
    db.messageReference.count({ where: { appUserId } }),
    db.chatMessage.findMany({
      where: { appUserId, createdAt: { gte: start } },
      select: { createdAt: true, role: true },
    }),
    db.messageReference.findMany({
      where: { appUserId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { documentName: true },
    }),
    db.userProfile.findUnique({ where: { appUserId } }),
  ])

  if (!conversationCount && !referenceCount && !messages.length)
  { return emptyAnalysis }

  const trend = Array.from({ length: 7 }, () => 0)
  messages.filter(message => message.role === 'user').forEach((message) => {
    const day = new Date(message.createdAt)
    day.setHours(0, 0, 0, 0)
    const index = Math.floor((day.getTime() - start.getTime()) / 86_400_000)
    if (index >= 0 && index < 7)
    { trend[index] += 1 }
  })

  const documents = new Map<string, number>()
  references.forEach((reference) => {
    const name = reference.documentName || '未命名文档'
    documents.set(name, (documents.get(name) || 0) + 1)
  })
  const rankedDocuments = [...documents.entries()].sort((a, b) => b[1] - a[1])
  const weakTopics: WeakTopic[] = rankedDocuments.slice(0, 3).map(([topic, count], index) => ({
    topic: topic.replace(/\.pdf$/i, '').slice(0, 42),
    reason: `近期在该文档中产生 ${count} 次知识命中，建议集中复盘相关概念`,
    confidence: Math.max(60, 88 - index * 12),
  }))

  const userMessages = messages.filter(message => message.role === 'user').length
  const momentum = Math.min(100, userMessages * 8 + Math.min(referenceCount, 20) * 2)
  const studyMinutes = Math.max(userMessages * 4, conversationCount * 6)
  const currentStage = profile?.learningStage
    ? `${profile.learningStage}阶段`
    : conversationCount >= 8 ? '持续强化阶段' : '知识探索阶段'

  return {
    summary: `当前分析仅基于你的 ${conversationCount} 个会话和 ${referenceCount} 条知识库引用。最近 7 天提出了 ${userMessages} 个问题，学习关注主要集中在 ${rankedDocuments.slice(0, 2).map(([name]) => name.replace(/\.pdf$/i, '')).join('、') || '课程基础内容'}。`,
    currentStage,
    momentum,
    conversations: conversationCount,
    references: referenceCount,
    documents: documents.size,
    studyMinutes,
    weakTopics,
    strongTopics: rankedDocuments.slice(0, 3).map(([name]) => name.replace(/\.pdf$/i, '').slice(0, 30)),
    trend,
    recommendations: weakTopics.length
      ? weakTopics.map((topic, index) => ({
        title: `复盘：${topic.topic}`,
        reason: topic.reason,
        priority: index === 0 ? '今天' : '本周',
        tone: index === 0 ? 'primary' : index === 1 ? 'mint' : 'orange',
      }))
      : emptyAnalysis.recommendations,
  }
}
