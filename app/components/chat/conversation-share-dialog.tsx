'use client'

import { useEffect, useMemo, useState } from 'react'
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
  const [selectedExchangeIds, setSelectedExchangeIds] = useState<string[]>([])
  const [link, setLink] = useState('')
  const [working, setWorking] = useState(false)
  const { notify } = Toast
  const exchanges = useMemo(() => {
    const items = chatList.filter(item => !item.isOpeningStatement)
    const result: Array<{
      id: string
      items: ChatItem[]
      question: string
      answer: string
    }> = []
    for (let index = 0; index < items.length; index += 1) {
      const first = items[index]
      if (first.isAnswer) {
        result.push({
          id: first.id,
          items: [first],
          question: '续接回答',
          answer: plainText(first.content),
        })
        continue
      }
      const answer = items[index + 1]?.isAnswer ? items[index + 1] : undefined
      const id = answer?.id || first.id.replace(/^question-/, '')
      result.push({
        id,
        items: answer ? [first, answer] : [first],
        question: plainText(first.content),
        answer: plainText(answer?.content || ''),
      })
      if (answer)
      { index += 1 }
    }
    return result.filter(exchange => exchange.id && exchange.items.length)
  }, [chatList])

  useEffect(() => {
    if (!open)
    { return }
    setLink('')
    setSelectedExchangeIds((current) => {
      const available = new Set(exchanges.map(exchange => exchange.id))
      const preserved = current.filter(id => available.has(id))
      return preserved.length
        ? preserved
        : exchanges.length ? [exchanges[exchanges.length - 1].id] : []
    })
  }, [exchanges, open])

  if (!open)
  { return null }

  const selectedIdSet = new Set(selectedExchangeIds)
  const selectedExchanges = exchanges.filter(exchange => selectedIdSet.has(exchange.id))
  const selectedItems = selectedExchanges.flatMap(exchange => exchange.items)
  const toggleExchange = (id: string) => {
    setSelectedExchangeIds(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id])
    setLink('')
  }

  const createLink = async () => {
    setWorking(true)
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'selected',
          messageIds: selectedExchangeIds,
        }),
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
      context.fillText(`精选 ${selectedExchanges.length} 组对话`, 80, 190)

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
    <div className="fixed inset-0 z-[100] grid max-w-[100vw] place-items-end overflow-x-hidden bg-black/45 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <button className="absolute inset-0" aria-label="关闭分享" onClick={onClose} />
      <div className="relative max-h-[calc(100dvh-env(safe-area-inset-bottom))] w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-t-[28px] bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-lg sm:rounded-[28px] sm:p-5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">分享本次对话</h2>
            <p className="mt-1 text-xs text-black/45">选择分享范围，再创建链接或分享图。</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black/[0.04]" aria-label="关闭">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold">选择要分享的对话</div>
          <div className="flex gap-2 text-[11px]">
            <button type="button" onClick={() => setSelectedExchangeIds(exchanges.map(item => item.id))} className="rounded-lg bg-black/[0.04] px-2.5 py-1.5">全选</button>
            <button type="button" onClick={() => setSelectedExchangeIds(exchanges.length ? [exchanges[exchanges.length - 1].id] : [])} className="rounded-lg bg-black/[0.04] px-2.5 py-1.5">仅最近</button>
          </div>
        </div>
        <div className="mt-3 max-h-[min(42dvh,340px)] space-y-2 overflow-y-auto overscroll-contain pr-1">
          {exchanges.map((exchange, index) => {
            const checked = selectedIdSet.has(exchange.id)
            return (
              <button
                key={exchange.id}
                type="button"
                onClick={() => toggleExchange(exchange.id)}
                className={`flex w-full min-w-0 items-start gap-3 rounded-2xl border p-3 text-left transition ${
                  checked ? 'border-[#17342b]/35 bg-[#eef4ef]' : 'border-black/10 hover:bg-black/[0.025]'
                }`}
              >
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                  checked ? 'border-[#17342b] bg-[#17342b] text-white' : 'border-black/20 bg-white'
                }`}>
                  {checked && <CheckIcon className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold text-black/35">第 {index + 1} 组</span>
                  <span className="mt-0.5 block break-words text-xs font-semibold">{exchange.question || '用户消息'}</span>
                  {exchange.answer && <span className="mt-1 block line-clamp-2 text-[11px] leading-5 text-black/45">{exchange.answer}</span>}
                </span>
              </button>
            )
          })}
        </div>
        {link && (
          <button onClick={() => void navigator.clipboard.writeText(link)} className="mt-4 flex w-full min-w-0 items-center gap-2 rounded-2xl bg-black/[0.035] px-4 py-3 text-left text-xs">
            <LinkIcon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{link}</span>
            <ClipboardDocumentIcon className="h-4 w-4 shrink-0" />
          </button>
        )}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button disabled={working || conversationId === '-1' || !selectedItems.length} onClick={() => void createLink()} className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-black/10 py-3.5 text-sm font-semibold disabled:opacity-40">
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
