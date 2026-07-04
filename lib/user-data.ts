import 'server-only'

import type { Prisma } from '@prisma/client'
import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'
import type { KnowledgeReference, LearningAnalysis, WeakTopic } from '@/lib/learning-types'
import type { ExtractedReference } from '@/lib/reference-extractor'
import { cleanReferenceDocumentName, extractKnowledgeReferences } from '@/lib/reference-extractor'
import { toMessageText } from '@/lib/safe-text'

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
  userFiles?: Record<string, unknown>[]
}

const pageFromDocumentName = (name: string, segmentPosition?: number) => {
  if (!segmentPosition)
  { return undefined }
  const matched = name.match(/_p(\d+)-(\d+)\.pdf$/i)
  return matched ? Number(matched[1]) + segmentPosition - 1 : undefined
}

const toJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue

const isDataUrl = (value: unknown) => typeof value === 'string' && /^data:/i.test(value)

const normalizePersistedFile = (file: Record<string, unknown>, belongsTo: 'user' | 'assistant') => {
  const stableUrl = [file.url, file.preview_url, file.display_url]
    .find(value => typeof value === 'string' && value && !isDataUrl(value)) as string | undefined
  const {
    base64Url: _base64Url,
    base64_url: _base64UrlSnake,
    ...rest
  } = file
  return {
    ...rest,
    url: stableUrl || '',
    preview_url: stableUrl || '',
    display_url: stableUrl || '',
    belongs_to: belongsTo,
  }
}

const recoverReferencesFromStoredMessages = async (
  appUserId: string,
  activeConversationIds: string[],
  referencedMessageIds: string[],
) => {
  const storedMessages = await db.chatMessage.findMany({
    where: {
      appUserId,
      role: 'assistant',
      difyMessageId: referencedMessageIds.length
        ? { not: null, notIn: referencedMessageIds }
        : { not: null },
      difyConversationId: { in: activeConversationIds },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
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

  if (!recoveredReferences.length)
  { return 0 }

  const result = await db.messageReference.createMany({ data: recoveredReferences, skipDuplicates: true })
  return result.count
}

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
  userFiles,
}: PersistChatExchangeInput) => {
  if (!isDatabaseConfigured() || !conversationId || !messageId)
  { return }

  const resources = references || metadata?.retriever_resources || []
  const safeQuery = toMessageText(query, '')
  const safeAnswer = toMessageText(answer, '')
  const normalizedUserFiles = (userFiles || []).map(file => normalizePersistedFile(file, 'user'))
  const normalizedAssistantFiles = (assistantFiles || []).map(file => normalizePersistedFile(file, 'assistant'))
  const userRawPayload = normalizedUserFiles.length
    ? toJson({ userFiles: normalizedUserFiles })
    : undefined
  const assistantRawPayload = metadata || workflowProcess || normalizedAssistantFiles.length
    ? toJson({
      ...(metadata || {}),
      workflowProcess,
      assistantFiles: normalizedAssistantFiles,
    })
    : undefined
  await db.$transaction(async (tx) => {
    const now = new Date()
    await tx.chatConversation.createMany({
      data: [{
        appUserId,
        difyConversationId: conversationId,
        title: safeQuery.slice(0, 120),
        lastMessageAt: now,
      }],
      skipDuplicates: true,
    })

    const activeConversation = await tx.chatConversation.findFirst({
      where: {
        appUserId,
        difyConversationId: conversationId,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!activeConversation) {
      console.warn('[memory-consistency] skipped persisting exchange for deleted conversation', {
        appUserId,
        conversationId,
        messageId,
      })
      return
    }

    await tx.chatConversation.updateMany({
      where: {
        appUserId,
        difyConversationId: conversationId,
        deletedAt: null,
      },
      data: { lastMessageAt: now },
    })

    await tx.chatMessage.createMany({
      data: [
        {
          appUserId,
          difyConversationId: conversationId,
          difyMessageId: messageId,
          role: 'user',
          content: safeQuery,
          rawPayload: userRawPayload,
        },
        {
          appUserId,
          difyConversationId: conversationId,
          difyMessageId: messageId,
          role: 'assistant',
          content: safeAnswer,
          rawPayload: assistantRawPayload,
        },
      ],
      skipDuplicates: true,
    })

    if (userRawPayload) {
      await tx.chatMessage.updateMany({
        where: {
          appUserId,
          difyMessageId: messageId,
          role: 'user',
        },
        data: {
          content: safeQuery,
          rawPayload: userRawPayload,
        },
      })
    }
    if (assistantRawPayload) {
      await tx.chatMessage.updateMany({
        where: {
          appUserId,
          difyMessageId: messageId,
          role: 'assistant',
        },
        data: {
          content: safeAnswer,
          rawPayload: assistantRawPayload,
        },
      })
    }

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

const getUserReferencesOnce = async (appUserId: string): Promise<KnowledgeReference[]> => {
  if (!isDatabaseConfigured())
  { return [] }

  const activeConversationIds = (await db.chatConversation.findMany({
    where: { appUserId, deletedAt: null },
    select: { difyConversationId: true },
  })).map(item => item.difyConversationId)
  if (!activeConversationIds.length)
  { return [] }

  let references = await db.messageReference.findMany({
    where: {
      appUserId,
      difyConversationId: { in: activeConversationIds },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })

  // Old or relay-persisted conversations may contain page-image/document
  // citations in the assistant markdown even when message_references was never
  // populated. Incrementally recover recent assistant messages that do not yet
  // have any stored reference so the "我的文档引用" page stays traceable.
  const referencedMessageIds = [...new Set(references
    .map(reference => reference.difyMessageId)
    .filter((id): id is string => Boolean(id)))]
  const recoveredCount = await recoverReferencesFromStoredMessages(appUserId, activeConversationIds, referencedMessageIds)
  if (recoveredCount > 0) {
    references = await db.messageReference.findMany({
      where: {
        appUserId,
        difyConversationId: { in: activeConversationIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    })
  }

  return references.map((reference) => {
    const documentName = cleanReferenceDocumentName(reference.documentName || '未命名文档')
    const inferredPage = Number(reference.pageImageUrl?.match(/\/page_(\d+)\./i)?.[1] || 0) || undefined
    const rawDocumentId = reference.rawPayload && typeof reference.rawPayload === 'object' && !Array.isArray(reference.rawPayload)
      ? (reference.rawPayload as Record<string, any>).document_id as string | undefined
      : undefined
    return {
      id: reference.id,
      conversationId: reference.difyConversationId || '',
      messageId: reference.difyMessageId || undefined,
      documentId: rawDocumentId,
      documentName,
      datasetName: reference.datasetName || undefined,
      pageNumber: reference.pageNumber || inferredPage,
      originalPageNumber: reference.originalPageNumber || undefined,
      quote: reference.quote || undefined,
      score: reference.score ? Number(reference.score) : undefined,
      pageImageUrl: reference.pageImageUrl || undefined,
      sourceUrl: reference.sourceUrl || undefined,
      topic: '知识库引用',
      createdAt: reference.createdAt.toISOString(),
    }
  })
}

export const getUserReferences = async (appUserId: string): Promise<KnowledgeReference[]> => {
  try {
    return await withDatabaseRetry(() => getUserReferencesOnce(appUserId))
  }
  catch (error) {
    console.error('[user-references] database unavailable', { appUserId, error })
    return []
  }
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

const conceptPatterns: Array<{ key: string, label: string, hints: string[], advice: string }> = [
  {
    key: 'tcp-reliable',
    label: 'TCP 可靠传输',
    hints: ['tcp', '可靠', '重传', '确认', 'ack', '拥塞', '窗口', 'rto', 'rtt'],
    advice: '把确认、超时重传、快速重传和窗口变化放到同一张时序图里复盘。',
  },
  {
    key: 'ip-routing',
    label: 'IP 与路由',
    hints: ['ip', '路由', '转发', '子网', '掩码', 'cidr', '最长前缀', 'icmp'],
    advice: '用“目的地址 → 最长前缀匹配 → 下一跳”的链路复盘典型题。',
  },
  {
    key: 'link-layer',
    label: '数据链路层',
    hints: ['mac', '以太网', '交换机', '帧', 'crc', 'csma', '碰撞', '链路'],
    advice: '把帧格式、差错检测和交换机学习表分开整理，避免概念串线。',
  },
  {
    key: 'dns-http',
    label: 'DNS / HTTP 应用层',
    hints: ['dns', 'http', 'https', 'url', '缓存', 'cookie', '状态码', '报文'],
    advice: '按一次网页访问的完整路径复盘 DNS、TCP、TLS 与 HTTP 的先后关系。',
  },
  {
    key: 'transport',
    label: '运输层基础',
    hints: ['udp', '端口', '运输层', '复用', '分用', '校验和', '流量控制'],
    advice: '先区分 UDP/TCP 的服务模型，再对照可靠性和拥塞控制机制。',
  },
  {
    key: 'physical',
    label: '物理层与信道',
    hints: ['物理层', '带宽', '信道', '码元', '奈奎斯特', '香农', '传输速率'],
    advice: '把公式题的单位、条件和适用场景列成小抄再练题。',
  },
]

const normalizeLearningText = (value: string) => value.toLowerCase().replace(/\s+/g, '')

const extractConceptSignals = (texts: string[]) => {
  const joined = normalizeLearningText(texts.join('\n'))
  return conceptPatterns
    .map((pattern) => {
      const hits = pattern.hints.reduce((count, hint) => count + (joined.includes(hint.toLowerCase()) ? 1 : 0), 0)
      return { ...pattern, hits }
    })
    .filter(item => item.hits > 0)
    .sort((a, b) => b.hits - a.hits)
}

const stripPdfSuffix = (name: string) => name.replace(/\.pdf$/i, '')

const compactTopic = (name: string, length = 42) => stripPdfSuffix(name).slice(0, length)

const jsonToAnalysisText = (value: unknown): string => {
  if (!value)
  { return '' }
  if (typeof value === 'string')
  { return value }
  if (typeof value === 'number' || typeof value === 'boolean')
  { return String(value) }
  if (Array.isArray(value))
  { return value.map(jsonToAnalysisText).filter(Boolean).join('、') }
  if (typeof value === 'object')
  { return Object.values(value as Record<string, unknown>).map(jsonToAnalysisText).filter(Boolean).join('、') }
  return ''
}

const getUserAnalysisOnce = async (appUserId: string): Promise<LearningAnalysis> => {
  if (!isDatabaseConfigured())
  { return emptyAnalysis }

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 6)

  const activeConversationIds = (await db.chatConversation.findMany({
    where: { appUserId, deletedAt: null },
    select: { difyConversationId: true },
  })).map(item => item.difyConversationId)

  const [conversationCount, referenceCount, messages, recentUserMessages, references, profile] = await Promise.all([
    Promise.resolve(activeConversationIds.length),
    activeConversationIds.length
      ? db.messageReference.count({
        where: {
          appUserId,
          difyConversationId: { in: activeConversationIds },
        },
      })
      : Promise.resolve(0),
    db.chatMessage.findMany({
      where: {
        appUserId,
        createdAt: { gte: start },
        difyConversationId: { in: activeConversationIds },
      },
      select: { createdAt: true, role: true },
    }),
    db.chatMessage.findMany({
      where: {
        appUserId,
        role: 'user',
        difyConversationId: { in: activeConversationIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: { content: true, createdAt: true },
    }),
    db.messageReference.findMany({
      where: {
        appUserId,
        difyConversationId: { in: activeConversationIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { documentName: true, quote: true, score: true },
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
  const conceptSignals = extractConceptSignals([
    ...recentUserMessages.map(message => message.content),
    ...references.map(reference => `${reference.documentName || ''}\n${reference.quote || ''}`),
    jsonToAnalysisText(profile?.weakTopics),
    jsonToAnalysisText(profile?.strongTopics),
    profile?.profileSummary || '',
  ])
  const weakTopics: WeakTopic[] = [
    ...conceptSignals.slice(0, 2).map((signal, index) => ({
      topic: signal.label,
      reason: `${signal.advice} 近期提问/引用中命中 ${signal.hits} 类相关线索。`,
      confidence: Math.min(94, 70 + signal.hits * 6 - index * 4),
    })),
    ...rankedDocuments.slice(0, 3).map(([topic, count], index) => ({
      topic: compactTopic(topic),
      reason: `该文档近期被命中 ${count} 次，适合回到原文集中复盘。`,
      confidence: Math.max(58, 84 - index * 9),
    })),
  ]
    .filter((item, index, array) => array.findIndex(other => other.topic === item.topic) === index)
    .slice(0, 4)

  const userMessages = messages.filter(message => message.role === 'user').length
  const activeDays = trend.filter(Boolean).length
  const todayMessages = trend[6] || 0
  const yesterdayMessages = trend[5] || 0
  const momentum = Math.min(100, userMessages * 8 + Math.min(referenceCount, 20) * 2 + activeDays * 5)
  const studyMinutes = Math.max(userMessages * 5 + referenceCount, conversationCount * 7)
  const currentStage = profile?.learningStage
    ? `${profile.learningStage}阶段`
    : conversationCount >= 8
      ? '持续强化阶段'
      : referenceCount >= 6
        ? '证据复盘阶段'
        : '知识探索阶段'
  const topDocumentNames = rankedDocuments.slice(0, 2).map(([name]) => compactTopic(name, 24))
  const topConceptNames = conceptSignals.slice(0, 2).map(signal => signal.label)
  const cadenceText = activeDays >= 4
    ? `近 7 天有 ${activeDays} 天保持提问，学习节奏比较连续`
    : todayMessages > yesterdayMessages
      ? '今天提问量较昨天上升，适合趁热做一次小结'
      : '近期学习节奏偏分散，建议安排一次短时集中复盘'
  const profileText = [
    profile?.learningStage && `画像阶段为“${profile.learningStage}”`,
    profile?.preferredStyle && `偏好“${profile.preferredStyle}”式回答`,
    profile?.target && `目标是“${profile.target}”`,
  ].filter(Boolean).join('，')

  return {
    summary: `当前分析仅基于你的 ${conversationCount} 个会话、${referenceCount} 条知识库引用和近 7 天 ${userMessages} 个提问。${cadenceText}；关注点主要集中在 ${[...topConceptNames, ...topDocumentNames].slice(0, 3).join('、') || '课程基础内容'}。${profileText ? `结合你的${profileText}，建议把回答进一步压到“概念辨析 + 例题演练 + 原文定位”的节奏。` : '完善学习画像后，建议会更贴近你的阶段和答题偏好。'}`,
    currentStage,
    momentum,
    conversations: conversationCount,
    references: referenceCount,
    documents: documents.size,
    studyMinutes,
    weakTopics,
    strongTopics: [
      ...conceptSignals.slice(0, 2).map(signal => signal.label),
      ...rankedDocuments.slice(0, 3).map(([name]) => compactTopic(name, 30)),
    ].filter((item, index, array) => array.indexOf(item) === index).slice(0, 4),
    trend,
    recommendations: weakTopics.length
      ? weakTopics.slice(0, 3).map((topic, index) => ({
        title: index === 0 ? `今日主线：${topic.topic}` : `补强：${topic.topic}`,
        reason: `${topic.reason} 建议先让 AI 生成 3 道辨析题，再回到引用原文核对。`,
        priority: index === 0 ? '今天' : '本周',
        tone: index === 0 ? 'primary' : index === 1 ? 'mint' : 'orange',
      }))
      : emptyAnalysis.recommendations,
  }
}
export const getUserAnalysis = async (appUserId: string): Promise<LearningAnalysis> => {
  try {
    return await withDatabaseRetry(() => getUserAnalysisOnce(appUserId))
  }
  catch (error) {
    console.error('[user-analysis] database unavailable', { appUserId, error })
    return {
      ...emptyAnalysis,
      summary: '学习数据服务暂时繁忙，页面已安全降级。请稍后刷新查看你的个性化分析。',
      currentStage: '数据连接恢复中',
    }
  }
}
