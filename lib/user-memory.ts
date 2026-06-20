import 'server-only'

import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'

const compact = (value: string, max = 360) => {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

const stringList = (value: unknown) => Array.isArray(value)
  ? value.map(item => String(item)).filter(Boolean).slice(0, 8)
  : []

export const buildCrossConversationMemory = async ({
  appUserId,
  excludeConversationId,
}: {
  appUserId: string
  excludeConversationId?: string
}) => {
  if (!isDatabaseConfigured())
  { return '' }

  const [profile, conversations, messages, references] = await withDatabaseRetry(() => Promise.all([
    db.userProfile.findUnique({ where: { appUserId } }),
    db.chatConversation.findMany({
      where: {
        appUserId,
        deletedAt: null,
        ...(excludeConversationId ? { difyConversationId: { not: excludeConversationId } } : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 12,
      select: { difyConversationId: true, title: true },
    }),
    db.chatMessage.findMany({
      where: {
        appUserId,
        ...(excludeConversationId ? { difyConversationId: { not: excludeConversationId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 36,
      select: { role: true, content: true, difyConversationId: true, difyMessageId: true, createdAt: true },
    }),
    db.messageReference.findMany({
      where: {
        appUserId,
        ...(excludeConversationId ? { difyConversationId: { not: excludeConversationId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { documentName: true, pageNumber: true, quote: true },
    }),
  ]))

  if (!conversations.length && !messages.length && !references.length && !profile)
  { return '' }

  const sections: string[] = []
  if (profile) {
    sections.push([
      profile.learningStage && `学习阶段：${profile.learningStage}`,
      profile.preferredStyle && `偏好方式：${profile.preferredStyle}`,
      profile.target && `学习目标：${profile.target}`,
      profile.profileSummary && `个人画像：${compact(profile.profileSummary, 500)}`,
      stringList(profile.weakTopics).length && `薄弱点：${stringList(profile.weakTopics).join('、')}`,
      stringList(profile.strongTopics).length && `较强项：${stringList(profile.strongTopics).join('、')}`,
      stringList(profile.interests).length && `兴趣：${stringList(profile.interests).join('、')}`,
    ].filter(Boolean).join('\n'))
  }

  const titles = conversations.map(item => item.title).filter(Boolean).slice(0, 8)
  if (titles.length)
  { sections.push(`历史会话主题：${titles.join('；')}`) }

  const turns: string[] = []
  for (const message of messages) {
    if (message.role !== 'user')
    { continue }
    const answer = messages.find(item =>
      item.role === 'assistant'
      && item.difyConversationId === message.difyConversationId
      && item.difyMessageId === message.difyMessageId,
    )
    turns.push(`用户曾问：${compact(message.content)}${answer ? `\n此前回答要点：${compact(answer.content, 520)}` : ''}`)
    if (turns.length >= 10)
    { break }
  }
  if (turns.length)
  { sections.push(`历史学习记录：\n${turns.join('\n\n')}`) }

  const referenceLines = references.map(reference =>
    `${reference.documentName || '知识库文档'}${reference.pageNumber ? ` 第 ${reference.pageNumber} 页` : ''}${reference.quote ? `：${compact(reference.quote, 180)}` : ''}`,
  )
  if (referenceLines.length)
  { sections.push(`历史知识库命中：\n${referenceLines.join('\n')}`) }

  return sections.join('\n\n').slice(0, 8_000)
}
