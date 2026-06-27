'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  DocumentMagnifyingGlassIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import type { KnowledgeReference } from '@/lib/learning-types'
import { toDifyAssetProxyUrl } from '@/lib/dify-assets'
import ImagePreview from '@/app/components/base/image-uploader/image-preview'
import { ResizableSplitHandle, useResizableSplit } from '@/app/components/base/resizable-split'

const inferPageFromImageUrl = (value?: string | null) =>
  Number(String(value || '').match(/\/page_(\d+)\./i)?.[1] || 0) || undefined

export default function SourcesView({ initialReferences }: { initialReferences: KnowledgeReference[] }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(initialReferences[0]?.id)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const sourcesSplit = useResizableSplit({
    storageKey: 'network-study-sources-list-width',
    cssVariable: '--sources-list-width',
    defaultSize: 380,
    minSize: 300,
    maxSize: 620,
    minTrailingSize: 620,
    label: '调整引用列表宽度',
  })

  const [imageError, setImageError] = useState(false)
  const filtered = useMemo(() => initialReferences.filter(item =>
    `${item.documentName} ${item.topic} ${item.quote}`.toLowerCase().includes(query.toLowerCase()),
  ), [query, initialReferences])
  const selected = initialReferences.find(item => item.id === selectedId) || filtered[0]
  const documentCount = new Set(initialReferences.map(item => item.documentName)).size
  const selectedPreviewPage = selected
    ? inferPageFromImageUrl(selected.pageImageUrl) || selected.pageNumber || selected.originalPageNumber || 1
    : 1
  const documentPreviewUrl = selected
    ? `/sources/preview/${selected.id}?page=${selectedPreviewPage}&filename=${encodeURIComponent(selected.documentName)}&returnTo=${encodeURIComponent('/sources')}`
    : ''
  const documentDownloadUrl = selected
    ? `/api/sources/${selected.id}/file?disposition=attachment&filename=${encodeURIComponent(selected.documentName)}`
    : ''
  const pageImageHref = selected?.pageImageUrl
    ? toDifyAssetProxyUrl(selected.pageImageUrl)
    : ''

  useEffect(() => {
    setImageError(false)
  }, [selected?.id])
  useEffect(() => {
    if (!mobileDetailOpen)
    { return }
    window.NetworkStudyApp?.hideShell()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
      { setMobileDetailOpen(false) }
    }
    globalThis.addEventListener('keydown', closeOnEscape)
    return () => {
      globalThis.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = previousOverflow
      window.NetworkStudyApp?.setShellState('/sources', '我的文档引用', '可追溯学习')
    }
  }, [mobileDetailOpen])
  const averageScore = initialReferences.length
    ? Math.round(initialReferences.reduce((sum, item) => sum + (item.score || 0), 0) / initialReferences.length * 100)
    : 0

  const exportReferences = () => {
    const rows = [
      ['文档名', '分卷页码', '原 PDF 页码', '相关度', '引用片段'],
      ...filtered.map(item => [
        item.documentName,
        String(item.pageNumber || ''),
        String(item.originalPageNumber || ''),
        String(item.score || ''),
        item.quote || '',
      ]),
    ]
    const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    if (window.NetworkStudyApp?.saveBase64File) {
      const bytes = new TextEncoder().encode(`\uFEFF${csv}`)
      let binary = ''
      bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
      window.NetworkStudyApp.saveBase64File(
        `data:text/csv;charset=utf-8;base64,${btoa(binary)}`,
        '我的知识库引用.csv',
        'text/csv',
      )
      return
    }
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = '我的知识库引用.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const renderActions = (mobile = false) => {
    if (!selected)
    { return null }

    return (
      <div className={mobile ? `grid gap-2 ${selected.conversationId ? 'grid-cols-3' : 'grid-cols-2'}` : 'mt-5 flex flex-wrap gap-3'}>
        {selected.conversationId && (
          <a
            href={`/chat?conversationId=${encodeURIComponent(selected.conversationId)}${selected.messageId ? `&messageId=${encodeURIComponent(selected.messageId)}` : ''}`}
            title={selected.messageId ? '回到产生该引用的回答' : '该引用缺少消息定位信息，仅能回到会话'}
            className={`inline-flex items-center justify-center gap-1.5 font-semibold text-white ${mobile ? 'h-11 rounded-2xl bg-[var(--studio-deep)] px-2 text-[11px]' : 'rounded-xl bg-[var(--studio-deep)] px-4 py-2.5 text-xs'}`}
          >
            {selected.messageId ? '原消息' : '原对话'} <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </a>
        )}
        <a
          href={documentPreviewUrl}
          className={`inline-flex items-center justify-center gap-1.5 font-semibold ${mobile ? 'h-11 rounded-2xl border border-black/10 bg-white px-2 text-[11px]' : 'rounded-xl border border-black/10 px-4 py-2.5 text-xs'}`}
        >
          预览 PDF <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
        </a>
        <a
          href={documentDownloadUrl}
          className={`inline-flex items-center justify-center gap-1.5 bg-[var(--studio-accent)] font-semibold text-[var(--studio-deep)] ${mobile ? 'h-11 rounded-2xl px-2 text-[11px]' : 'rounded-xl px-4 py-2.5 text-xs'}`}
        >
          下载 <ArrowDownTrayIcon className="h-3.5 w-3.5" />
        </a>
      </div>
    )
  }

  const renderSelectedDetails = (mobile = false) => {
    if (!selected)
    { return null }

    const sourcePreview = pageImageHref && !imageError
      ? (
        <div
          className={`group mt-5 inline-block max-w-full overflow-hidden rounded-2xl border border-black/10 bg-black/[0.025] p-2 text-left shadow-sm ${mobile ? 'w-full' : 'sm:max-w-[50%]'}`}
        >
          <button
            type="button"
            className="block w-full cursor-zoom-in overflow-hidden rounded-xl"
            onClick={() => setPreviewImageUrl(pageImageHref)}
            aria-label="放大来源页图片"
          >
            <img
              src={pageImageHref}
              alt={`${selected.documentName} 来源页`}
              loading="lazy"
              onError={() => setImageError(true)}
              className={`w-full rounded-xl object-contain transition-transform duration-200 group-hover:scale-[1.01] ${mobile ? 'max-h-[34dvh]' : 'max-h-[240px]'}`}
            />
          </button>
          <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-2 text-[10px] text-black/45">
            <a href={documentPreviewUrl} className="font-semibold text-[var(--studio-accent-strong)]">点击查看来源 PDF</a>
            <span className="font-semibold text-[var(--studio-accent-strong)]">第 {selectedPreviewPage} 页</span>
          </div>
        </div>
      )
      : (
        <div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-black/[0.025] px-5 py-10 text-center">
          <DocumentMagnifyingGlassIcon className="mx-auto h-7 w-7 text-[var(--studio-muted)]" />
          <div className="mt-2 text-xs font-semibold">{imageError ? '来源页图片加载失败' : '该引用暂无来源页图片'}</div>
          <div className="mt-1 text-[10px] text-[var(--studio-muted)]">可尝试打开或下载对应文档。</div>
        </div>
      )

    return (
      <>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-full bg-[var(--studio-accent)]/35 px-3 py-1.5 font-semibold text-[var(--studio-accent-strong)]">{selected.topic}</span>
          {selected.pageNumber && <span className="rounded-full bg-black/[0.04] px-3 py-1.5">PDF 第 {selected.pageNumber} 页</span>}
          {selected.originalPageNumber && selected.originalPageNumber !== selectedPreviewPage && (
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">原书映射第 {selected.originalPageNumber} 页</span>
          )}
        </div>
        <h2 className={`mt-4 break-words font-semibold ${mobile ? 'text-base leading-6' : 'text-lg leading-7'}`}>{selected.documentName}</h2>
        <div className="mt-1 text-xs text-black/40">{selected.datasetName || '课程知识库'}</div>
        {sourcePreview}
        <div className={`mt-5 rounded-2xl border border-black/[0.07] bg-black/[0.025] ${mobile ? 'p-4' : 'p-5 sm:mt-7 sm:p-6'}`}>
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">Dify 命中片段</div>
          <blockquote className={`break-words border-l-2 border-[var(--studio-accent-strong)]/50 pl-4 text-black/70 [overflow-wrap:anywhere] ${mobile ? 'text-[13px] leading-6' : 'text-sm leading-7'}`}>{selected.quote}</blockquote>
        </div>
        {!mobile && renderActions()}
        <p className="mt-8 text-[11px] leading-5 text-black/35">该记录由当前账号的 Dify 对话产生，并在服务端按用户 ID 隔离保存。</p>
      </>
    )
  }

  return (
    <div className="mx-auto max-w-[1450px] p-4 sm:p-6">
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          ['引用记录', initialReferences.length, '条'],
          ['命中文档', documentCount, '份'],
          ['平均相关度', averageScore, '%'],
        ].map(([label, value, unit]) => (
          <PageCard key={label} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-xs text-black/45">{label}</div>
              <div className="mt-1 text-2xl font-semibold">{value}<span className="ml-1 text-xs font-normal text-black/35">{unit}</span></div>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--studio-accent)]/45 text-[var(--studio-accent-strong)]">
              <BookOpenIcon className="h-5 w-5" />
            </div>
          </PageCard>
        ))}
      </div>

      <PageCard className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-black/[0.07] p-4 sm:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索当前账号命中的文档或引用内容"
              className="h-10 w-full rounded-xl border border-black/10 bg-black/[0.025] pl-10 pr-4 text-xs outline-none focus:border-[var(--studio-accent-strong)]/40"
            />
          </div>
          <button
            onClick={exportReferences}
            disabled={!filtered.length}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--studio-deep)] px-4 text-xs font-semibold text-white disabled:opacity-40"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />导出清单
          </button>
        </div>

        {!initialReferences.length
          ? (
            <div className="grid min-h-[500px] place-items-center p-10 text-center">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[var(--studio-accent)]/40 text-[var(--studio-accent-strong)]">
                  <DocumentMagnifyingGlassIcon className="h-8 w-8" />
                </div>
                <h2 className="mt-5 text-lg font-semibold">还没有属于你的引用记录</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-black/45">在 AI 学习助手中提问并命中知识库后，相关文档片段会自动保存到当前账号，其他用户无法看到。</p>
                <a href="/chat" className="mt-5 inline-flex rounded-xl bg-[var(--studio-deep)] px-4 py-2.5 text-xs font-semibold text-white">开始知识库问答</a>
              </div>
            </div>
          )
          : (
            <div
              ref={sourcesSplit.containerRef}
              style={sourcesSplit.containerStyle}
              className="grid min-h-[580px] min-w-0 lg:grid-cols-[var(--sources-list-width)_8px_minmax(0,1fr)]"
            >
              <aside className="min-w-0 border-b border-black/[0.07] bg-black/[0.018] p-3 lg:border-b-0 lg:border-r">
                <div className="mb-2 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">当前账号引用 · {filtered.length}</div>
                <div className="space-y-2 lg:max-h-[535px] lg:overflow-y-auto">
                  {filtered.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id)
                        if (globalThis.matchMedia('(max-width: 1023px)').matches)
                        { setMobileDetailOpen(true) }
                      }}
                      className={`min-w-0 w-full overflow-hidden rounded-2xl border p-4 text-left transition [contain-intrinsic-size:132px] [content-visibility:auto] ${
                        selected?.id === item.id
                          ? 'border-[var(--studio-accent-strong)]/25 bg-[var(--studio-accent)]/25'
                          : 'border-black/[0.07] bg-white hover:border-black/15'
                      }`}
                    >
                      <div className="line-clamp-2 text-xs font-semibold leading-5">{item.documentName}</div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-black/40">
                        <span>{item.pageNumber ? `第 ${item.pageNumber} 页` : '未标注页码'}</span>
                        <span>{item.score ? `${Math.round(item.score * 100)}%` : '—'}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 break-words text-[11px] leading-5 text-black/45 [overflow-wrap:anywhere]">{item.quote}</p>
                    </button>
                  ))}
                </div>
              </aside>

              <ResizableSplitHandle
                separatorProps={sourcesSplit.separatorProps}
                className="border-r border-black/[0.06] bg-black/[0.018] hover:bg-[var(--studio-accent)]/20"
              />

              <section className="hidden min-w-0 p-6 sm:p-8 lg:block">
                {renderSelectedDetails()}
              </section>
            </div>
          )}
      </PageCard>

      {mobileDetailOpen && selected && typeof document !== 'undefined'
        ? createPortal((
          <div className="fixed inset-0 z-[1000] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[var(--studio-paper)] lg:hidden">
            <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-black/[0.08] bg-[var(--studio-surface)]/95 px-4 py-2 backdrop-blur-xl">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--studio-muted)]">引用详情</div>
                <div className="mt-0.5 truncate text-sm font-semibold">{selected.documentName}</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="ml-3 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-[var(--studio-surface)]"
                aria-label="关闭引用详情"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-5">
              {renderSelectedDetails(true)}
            </div>
            <div className="shrink-0 border-t border-black/[0.08] bg-[var(--studio-surface)]/95 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl">
              {renderActions(true)}
            </div>
          </div>
        ), document.body,
        )
        : null}
      {previewImageUrl && (
        <ImagePreview
          url={previewImageUrl}
          onCancel={() => setPreviewImageUrl('')}
        />
      )}
    </div>
  )
}
