'use client'

import { useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { stripReasoningContent } from '@/lib/message-preview'

interface AdminConversation {
  difyConversationId: string
  title: string | null
  preview: string
  messageCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface AdminMessage {
  id: string
  difyMessageId: string | null
  role: string
  content: string
  createdAt: string
}

export default function AdminUserConversations({
  userId,
  displayName,
  username,
  onClose,
}: {
  userId: string
  displayName: string
  username: string
  onClose: () => void
}) {
  const [conversations, setConversations] = useState<AdminConversation[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/conversations`, {
          credentials: 'include',
        })
        if (!response.ok)
        { throw new Error('LOAD_FAILED') }
        const result = await response.json()
        if (!cancelled) {
          setConversations(result.conversations || [])
          setSelectedId(result.conversations?.[0]?.difyConversationId || '')
        }
      }
      catch {
        if (!cancelled)
        { setError('对话记录加载失败') }
      }
      finally {
        if (!cancelled)
        { setLoading(false) }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setMessagesLoading(true)
        const response = await fetch(
          `/api/admin/users/${encodeURIComponent(userId)}/conversations?conversationId=${encodeURIComponent(selectedId)}`,
          { credentials: 'include' },
        )
        if (!response.ok)
        { throw new Error('LOAD_FAILED') }
        const result = await response.json()
        if (!cancelled)
        { setMessages(result.messages || []) }
      }
      catch {
        if (!cancelled)
        { setError('消息记录加载失败') }
      }
      finally {
        if (!cancelled)
        { setMessagesLoading(false) }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId, userId])

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-hidden bg-black/45 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex h-[min(88dvh,900px)] w-full max-w-[1500px] flex-col overflow-hidden rounded-[28px] bg-[var(--studio-surface)] shadow-2xl">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-black/10 px-4 sm:px-6">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-[var(--studio-accent-strong)]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{displayName} 的对话记录</div>
            <div className="text-[10px] text-black/40">@{username}</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-black/10" aria-label="关闭">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        {loading
          ? <div className="grid min-h-0 flex-1 place-items-center"><ArrowPathIcon className="h-6 w-6 animate-spin text-black/35" /></div>
          : error && !conversations.length
            ? <div className="grid min-h-0 flex-1 place-items-center text-sm text-red-600">{error}</div>
            : (
              <div className="grid min-h-0 flex-1 md:grid-cols-[360px_1fr]">
                <aside className="min-h-0 overflow-y-auto border-b border-black/10 bg-black/[0.02] p-3 md:border-b-0 md:border-r">
                  {!conversations.length && <div className="p-8 text-center text-sm text-black/40">该用户暂无对话记录</div>}
                  <div className="space-y-2">
                    {conversations.map(conversation => (
                      <button
                        type="button"
                        key={conversation.difyConversationId}
                        onClick={() => setSelectedId(conversation.difyConversationId)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                          selectedId === conversation.difyConversationId
                            ? 'border-[var(--studio-accent-strong)]/30 bg-[var(--studio-accent)]/25'
                            : 'border-black/[0.07] bg-[var(--studio-surface)] hover:border-black/15'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold">{conversation.title || '网络学习会话'}</div>
                          <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-black/40">{conversation.preview || '暂无消息摘要'}</div>
                          <div className="mt-2 text-[10px] text-black/30">
                            {conversation.messageCount} 条消息 · {new Date(conversation.updatedAt).toLocaleString('zh-CN')}
                            {conversation.deletedAt ? ' · 已删除' : ''}
                          </div>
                        </div>
                        <ChevronRightIcon className="h-4 w-4 shrink-0 text-black/25" />
                      </button>
                    ))}
                  </div>
                </aside>

                <main className="min-h-0 overflow-y-auto px-4 py-5 sm:px-7">
                  {messagesLoading
                    ? <div className="grid h-full place-items-center"><ArrowPathIcon className="h-6 w-6 animate-spin text-black/35" /></div>
                    : !selectedId
                      ? <div className="grid h-full place-items-center text-sm text-black/40">请选择一组对话</div>
                      : (
                        <div className="mx-auto max-w-4xl space-y-5">
                          {messages.map(message => (
                            <article
                              key={message.id}
                              className={`max-w-[92%] rounded-2xl border px-4 py-3 sm:max-w-[82%] ${
                                message.role === 'user'
                                  ? 'ml-auto border-blue-100 bg-blue-50'
                                  : 'border-black/[0.07] bg-[var(--studio-surface)] shadow-sm'
                              }`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-3 text-[10px] text-black/35">
                                <span className="font-semibold">{message.role === 'user' ? '用户' : '计网Agent'}</span>
                                <span>{new Date(message.createdAt).toLocaleString('zh-CN')}</span>
                              </div>
                              <div className="whitespace-pre-wrap break-words text-xs leading-6 [overflow-wrap:anywhere]">
                                {stripReasoningContent(message.content)}
                              </div>
                            </article>
                          ))}
                          {!messages.length && <div className="py-16 text-center text-sm text-black/40">该会话暂无已保存消息</div>}
                        </div>
                      )}
                </main>
              </div>
            )}
      </div>
    </div>
  )
}
