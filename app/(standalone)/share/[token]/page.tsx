import { notFound } from 'next/navigation'
import { AcademicCapIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { db } from '@/lib/db'
import { verifyConversationShareToken } from '@/lib/conversation-share'

const compactMarkdown = (content: string) =>
  content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '[图片]')
    .trim()

export default async function SharedConversationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const payload = verifyConversationShareToken(token)
  if (!payload)
  { notFound() }

  const [conversation, owner, messages] = await Promise.all([
    db.chatConversation.findFirst({
      where: {
        appUserId: payload.appUserId,
        difyConversationId: payload.conversationId,
        deletedAt: null,
      },
    }),
    db.appUser.findUnique({
      where: { id: payload.appUserId },
      select: { displayName: true },
    }),
    db.chatMessage.findMany({
      where: {
        appUserId: payload.appUserId,
        difyConversationId: payload.conversationId,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])
  if (!conversation)
  { notFound() }

  const groups = new Map<string, typeof messages>()
  messages.forEach((message) => {
    const key = message.difyMessageId || message.id
    const current = groups.get(key) || []
    current.push(message)
    groups.set(key, current)
  })
  const exchanges = [...groups.values()].map(group => [
    ...group.filter(message => message.role === 'user'),
    ...group.filter(message => message.role === 'assistant'),
  ]).flat()
  const visibleMessages = payload.scope === 'latest'
    ? exchanges.slice(Math.max(0, exchanges.length - 2))
    : exchanges

  return (
    <main className="min-h-screen bg-[#f3f5f3] px-3 py-6 text-[#18231f] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="rounded-[26px] bg-[#17342b] p-6 text-white shadow-[0_22px_60px_rgba(23,52,43,.18)]">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d9f36d] text-[#17342b]">
              <AcademicCapIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#d9f36d]">知行网络学堂 · 分享对话</div>
              <h1 className="mt-1 text-xl font-semibold">{conversation.title || '网络学习会话'}</h1>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-white/50">
            <span>分享者：{owner?.displayName || '学习者'}</span>
            <span className="flex items-center gap-1"><CalendarDaysIcon className="h-4 w-4" />{conversation.createdAt.toLocaleDateString('zh-CN')}</span>
            <span>{payload.scope === 'latest' ? '最近一轮对话' : '完整对话'}</span>
          </div>
        </header>

        <div className="mt-5 space-y-4">
          {visibleMessages.map(message => (
            <article
              key={message.id}
              className={`rounded-[22px] border p-5 shadow-[0_10px_30px_rgba(31,54,46,.05)] ${
                message.role === 'user'
                  ? 'ml-auto max-w-[88%] border-[#bcd3ea] bg-[#e7f2ff]'
                  : 'border-black/[0.07] bg-white'
              }`}
            >
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/35">
                {message.role === 'user' ? '用户' : '计网Agent'}
              </div>
              <div className="whitespace-pre-wrap break-words text-sm leading-7">{compactMarkdown(message.content)}</div>
            </article>
          ))}
        </div>

        <footer className="py-8 text-center text-xs text-black/35">
          本页为用户主动分享的只读对话，链接 30 天内有效 · www.jasonsome.cn
        </footer>
      </div>
    </main>
  )
}
