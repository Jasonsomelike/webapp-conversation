'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChatBubbleOvalLeftEllipsisIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ShareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { ConversationItem } from '@/types/app'
import { toConversationPreview } from '@/lib/message-preview'

interface MobileConversationListProps {
  list: ConversationItem[]
  onOpen: (id: string) => void
  onNew: () => void
  onDelete?: (id: string) => Promise<void> | void
  onShare?: (item: ConversationItem) => Promise<void> | void
}

const colors = [
  'bg-[#e4f0e7] text-[#315f4b]',
  'bg-[#e9effa] text-[#3f5f86]',
  'bg-[#fff0df] text-[#9b5d31]',
  'bg-[#f0e8fa] text-[#745294]',
  'bg-[#fff7d9] text-[#80611b]',
]

const formatTime = (value?: string) => {
  if (!value)
  { return '' }
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
  { return '' }
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}

export default function MobileConversationList({
  list,
  onOpen,
  onNew,
  onDelete,
  onShare,
}: MobileConversationListProps) {
  const [query, setQuery] = useState('')
  const [actionTarget, setActionTarget] = useState<ConversationItem | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressedRef = useRef(false)
  const conversations = useMemo(() => list
    .filter(item => item.id !== '-1')
    .map(item => ({
      ...item,
      preview: toConversationPreview(item.preview || '') || '点击继续本次学习对话',
    }))
    .sort((a, b) => {
      const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return right - left
    })
    .filter(item => `${item.name} ${item.preview}`.toLowerCase().includes(query.trim().toLowerCase())), [list, query])

  const clearLongPressTimer = () => {
    if (!longPressTimerRef.current)
    { return }
    window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = null
  }
  useEffect(() => clearLongPressTimer, [])

  const openActionSheet = (item: ConversationItem) => {
    if (item.id === '-1')
    { return }
    longPressedRef.current = true
    setConfirmingDelete(false)
    setActionTarget(item)
  }

  const handleShare = async () => {
    if (!actionTarget)
    { return }
    await onShare?.(actionTarget)
    setActionTarget(null)
    setConfirmingDelete(false)
  }

  const handleDelete = async () => {
    if (!actionTarget || deleting)
    { return }
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setDeleting(true)
    try {
      await onDelete?.(actionTarget.id)
      setActionTarget(null)
      setConfirmingDelete(false)
    }
    finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--studio-chat-surface)]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-black/[0.07] px-4">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.025em]">对话记录</h2>
          <p className="mt-0.5 text-[11px] text-[var(--studio-muted)]">{conversations.length} 个学习会话</p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--studio-deep)] text-white shadow-[0_10px_26px_rgba(23,52,43,.18)]"
          aria-label="新建对话"
        >
          <PencilSquareIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="shrink-0 px-4 pb-2 pt-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索对话"
            className="h-11 w-full rounded-2xl border border-black/[0.07] bg-black/[0.025] pl-10 pr-4 text-sm outline-none focus:border-[var(--studio-accent-strong)]/35"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
        {conversations.length
          ? conversations.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (longPressedRef.current) {
                  longPressedRef.current = false
                  return
                }
                onOpen(item.id)
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                openActionSheet(item)
              }}
              onTouchStart={() => {
                clearLongPressTimer()
                longPressTimerRef.current = window.setTimeout(() => openActionSheet(item), 520)
              }}
              onTouchMove={clearLongPressTimer}
              onTouchEnd={clearLongPressTimer}
              onTouchCancel={clearLongPressTimer}
              className="flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-3.5 text-left transition active:bg-black/[0.04]"
              title={item.preview || item.name}
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${colors[index % colors.length]}`}>
                <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1 overflow-hidden border-b border-black/[0.065] pb-3">
                <span className="flex min-w-0 items-start gap-3">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{item.name}</span>
                  <span className="shrink-0 pt-0.5 text-[10px] text-[var(--studio-muted)]">{formatTime(item.updatedAt)}</span>
                </span>
                <span className="mt-1.5 block min-w-0 overflow-hidden text-ellipsis break-words text-[12px] leading-5 text-[var(--studio-muted)] line-clamp-2">{item.preview || '点击继续本次学习对话'}</span>
              </span>
            </button>
          ))
          : (
            <div className="grid h-full min-h-[340px] place-items-center px-8 text-center">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--studio-accent)]/35 text-[var(--studio-accent-strong)]">
                  <ChatBubbleOvalLeftEllipsisIcon className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{query ? '没有匹配的对话' : '还没有对话记录'}</h3>
                <p className="mt-2 text-xs leading-6 text-[var(--studio-muted)]">{query ? '换个关键词试试。' : '发起第一次提问后，会话会保存在这里。'}</p>
                {!query && (
                  <button type="button" onClick={onNew} className="mt-5 rounded-xl bg-[var(--studio-deep)] px-5 py-2.5 text-xs font-semibold text-white">
                    开始新对话
                  </button>
                )}
              </div>
            </div>
          )}
      </div>
      {actionTarget && (
        <div
          role="presentation"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[1px]"
          onClick={() => {
            if (deleting)
            { return }
            setActionTarget(null)
            setConfirmingDelete(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_24px_70px_rgba(0,0,0,.22)]"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900">{actionTarget.name}</div>
                <div className="mt-1 line-clamp-2 break-words text-xs leading-5 text-gray-500">{actionTarget.preview || '学习对话'}</div>
              </div>
              <button
                type="button"
                disabled={deleting}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-400 active:bg-gray-100"
                onClick={() => {
                  setActionTarget(null)
                  setConfirmingDelete(false)
                }}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <button type="button" className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-800 active:bg-gray-50" onClick={() => void handleShare()}>
              <span className="flex items-center gap-2"><ShareIcon className="h-4 w-4" />分享对话</span>
              <span className="text-xs text-gray-400">创建链接/分享图</span>
            </button>
            {confirmingDelete && (
              <div className="border-t border-black/5 bg-red-50/70 px-5 py-3 text-xs leading-5 text-red-700">
                将删除整个会话及相关记录。再次点击确认删除。
              </div>
            )}
            <button
              type="button"
              className="flex w-full items-center justify-between border-t border-black/5 px-5 py-4 text-left text-sm font-medium text-red-600 active:bg-red-50 disabled:opacity-60"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              <span className="flex items-center gap-2"><TrashIcon className="h-4 w-4" />{confirmingDelete ? '确认删除' : '删除对话'}</span>
              <span className="text-xs text-red-300">{deleting ? '删除中…' : '不可撤销'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
