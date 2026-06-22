'use client'

import { useState } from 'react'
import {
  CheckIcon,
  ClipboardDocumentIcon,
  LinkIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { ChatItem } from '@/types/app'
import Toast from '@/app/components/base/toast'

const plainText = (value: string) => value
  .replace(/<think>[\s\S]*?<\/think>/gi, '')
  .replace(/!\[[^\]]*\]\([^)]+\)/g, '[图片]')
  .replace(/[#*_>`~]/g, '')
  .trim()

const wrapCanvasText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = []
  text.split(/\n/).forEach((paragraph) => {
    if (!paragraph) {
      lines.push('')
      return
    }
    let line = ''
    Array.from(paragraph).forEach((character) => {
      const candidate = line + character
      if (context.measureText(candidate).width > maxWidth && line) {
        lines.push(line)
        line = character
      }
      else
      { line = candidate }
    })
    if (line)
    { lines.push(line) }
  })
  return lines
}

export default function ConversationShareDialog({
  open,
  onClose,
  conversationId,
  title,
  chatList,
}: {
  open: boolean
  onClose: () => void
  conversationId: string
  title: string
  chatList: ChatItem[]
}) {
  const [scope, setScope] = useState<'all' | 'latest'>('latest')
  const [link, setLink] = useState('')
  const [working, setWorking] = useState(false)
  const { notify } = Toast
  if (!open)
  { return null }

  const allItems = chatList.filter(item => !item.isOpeningStatement)
  const selectedItems = scope === 'latest' ? allItems.slice(-2) : allItems

  const createLink = async () => {
    setWorking(true)
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      })
      if (!response.ok)
      { throw new Error('SHARE_FAILED') }
      const result = await response.json()
      setLink(result.url)
      await navigator.clipboard.writeText(result.url)
      notify({ type: 'success', message: '分享链接已复制，30 天内有效' })
    }
    catch {
      notify({ type: 'error', message: '创建分享链接失败' })
    }
    finally {
      setWorking(false)
    }
  }

  const createImage = async () => {
    setWorking(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      const context = canvas.getContext('2d')
      if (!context)
      { throw new Error('CANVAS_UNAVAILABLE') }
      context.font = '32px sans-serif'
      const blocks = selectedItems.slice(-10).map(item => ({
        role: item.isAnswer ? '计网Agent' : '用户',
        lines: wrapCanvasText(context, plainText(item.content).slice(0, 2400), 840),
        answer: item.isAnswer,
      }))
      const bodyHeight = blocks.reduce((sum, block) => sum + 92 + block.lines.length * 48, 0)
      canvas.height = Math.min(15000, Math.max(900, 300 + bodyHeight))
      context.fillStyle = '#f3f5f3'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = '#17342b'
      context.fillRect(0, 0, canvas.width, 220)
      context.fillStyle = '#d9f36d'
      context.font = 'bold 30px sans-serif'
      context.fillText('知行网络学堂 · 分享对话', 80, 75)
      context.fillStyle = '#ffffff'
      context.font = 'bold 44px sans-serif'
      context.fillText(title.slice(0, 22) || '网络学习会话', 80, 145)
      context.font = '24px sans-serif'
      context.fillStyle = 'rgba(255,255,255,.55)'
      context.fillText(scope === 'latest' ? '最近一轮对话' : '完整对话节选', 80, 190)

      let y = 270
      blocks.forEach((block) => {
        const height = 72 + block.lines.length * 48
        context.fillStyle = block.answer ? '#ffffff' : '#e7f2ff'
        context.fillRect(60, y, 960, height)
        context.fillStyle = block.answer ? '#47715c' : '#3f6590'
        context.font = 'bold 23px sans-serif'
        context.fillText(block.role, 90, y + 42)
        context.fillStyle = '#18231f'
        context.font = '30px sans-serif'
        block.lines.forEach((line, index) => context.fillText(line, 90, y + 91 + index * 48))
        y += height + 28
      })
      context.fillStyle = '#66736c'
      context.font = '22px sans-serif'
      context.fillText('www.jasonsome.cn · 内容由 AI 生成，请仔细甄别', 80, canvas.height - 55)

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.94))
      if (!blob)
      { throw new Error('IMAGE_FAILED') }
      const file = new File([blob], `知行网络学堂-${title || '分享对话'}.png`, { type: 'image/png' })
      if (window.NetworkStudyApp?.saveBase64Image) {
        window.NetworkStudyApp.saveBase64Image(canvas.toDataURL('image/png'), file.name)
        notify({ type: 'success', message: '分享图已保存到 App 下载位置' })
      }
      else if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, files: [file] })
      }
      else {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = file.name
        anchor.click()
        globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    }
    catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
      { notify({ type: 'error', message: '生成分享图失败' }) }
    }
    finally {
      setWorking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-end bg-black/45 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <button className="absolute inset-0" aria-label="关闭分享" onClick={onClose} />
      <div className="relative w-full rounded-t-[28px] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[28px]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">分享本次对话</h2>
            <p className="mt-1 text-xs text-black/45">选择分享范围，再创建链接或分享图。</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black/[0.04]" aria-label="关闭">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            ['latest', '最近一轮', '1 组对话'],
            ['all', '全部对话', `${Math.ceil(allItems.length / 2)} 组对话`],
          ].map(([value, label, description]) => (
            <button key={value} onClick={() => setScope(value as 'all' | 'latest')} className={`rounded-2xl border p-4 text-left ${scope === value ? 'border-[#17342b] bg-[#eef4ef]' : 'border-black/10'}`}>
              <div className="flex items-center justify-between text-sm font-semibold">
                {label}
                {scope === value && <CheckIcon className="h-4 w-4" />}
              </div>
              <div className="mt-1 text-[11px] text-black/40">{description}</div>
            </button>
          ))}
        </div>
        {link && (
          <button onClick={() => void navigator.clipboard.writeText(link)} className="mt-4 flex w-full items-center gap-2 rounded-2xl bg-black/[0.035] px-4 py-3 text-left text-xs">
            <LinkIcon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{link}</span>
            <ClipboardDocumentIcon className="h-4 w-4 shrink-0" />
          </button>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 pb-[env(safe-area-inset-bottom)]">
          <button disabled={working || conversationId === '-1'} onClick={() => void createLink()} className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-black/10 py-3.5 text-sm font-semibold disabled:opacity-40">
            <LinkIcon className="h-5 w-5" />创建链接
          </button>
          <button disabled={working || !selectedItems.length} onClick={() => void createImage()} className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-[var(--studio-deep)] py-3.5 text-sm font-semibold text-white disabled:opacity-40">
            <PhotoIcon className="h-5 w-5" />生成分享图
          </button>
        </div>
      </div>
    </div>
  )
}
