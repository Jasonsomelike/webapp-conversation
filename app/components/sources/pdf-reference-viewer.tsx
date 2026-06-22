'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from '@heroicons/react/24/outline'

interface PdfReferenceViewerProps {
  referenceId: string
  filename: string
  initialPage: number
}

export default function PdfReferenceViewer({ referenceId, filename, initialPage }: PdfReferenceViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<{ cancel: () => void }>()
  const [pdf, setPdf] = useState<any>()
  const [page, setPage] = useState(Math.max(1, initialPage))
  const [scale, setScale] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const sourceUrl = `/api/sources/${encodeURIComponent(referenceId)}/file?disposition=inline&proxy=1&filename=${encodeURIComponent(filename)}`
  const downloadUrl = `/api/sources/${encodeURIComponent(referenceId)}/file?disposition=attachment&filename=${encodeURIComponent(filename)}`

  useEffect(() => {
    let disposed = false
    let loadingTask: any
    ;(async () => {
      try {
        setLoading(true)
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        loadingTask = pdfjs.getDocument({
          url: sourceUrl,
          withCredentials: true,
        })
        const document = await loadingTask.promise
        if (disposed)
        { return }
        setPdf(document)
        setPage(current => Math.min(document.numPages, Math.max(1, current)))
      }
      catch (reason) {
        if (!disposed)
        { setError(reason instanceof Error ? reason.message : 'PDF 加载失败') }
      }
      finally {
        if (!disposed)
        { setLoading(false) }
      }
    })()
    return () => {
      disposed = true
      renderTaskRef.current?.cancel()
      void loadingTask?.destroy()
    }
  }, [sourceUrl])

  const renderPage = useCallback(async () => {
    const canvas = canvasRef.current
    if (!pdf || !canvas)
    { return }
    const pdfPage = await pdf.getPage(page)
    const baseViewport = pdfPage.getViewport({ scale: 1 })
    const availableWidth = Math.max(280, Math.min(globalThis.innerWidth - 24, 1100))
    const fitScale = availableWidth / baseViewport.width
    const viewport = pdfPage.getViewport({ scale: fitScale * scale })
    const ratio = globalThis.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * ratio)
    canvas.height = Math.floor(viewport.height * ratio)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    const context = canvas.getContext('2d')
    if (!context)
    { return }
    renderTaskRef.current?.cancel()
    const renderTask = pdfPage.render({
      canvasContext: context,
      viewport,
      transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
    })
    renderTaskRef.current = renderTask
    await renderTask.promise
  }, [page, pdf, scale])

  useEffect(() => {
    void renderPage().catch((reason) => {
      if (reason?.name !== 'RenderingCancelledException')
      { setError(reason instanceof Error ? reason.message : 'PDF 页面渲染失败') }
    })
  }, [renderPage])

  useEffect(() => {
    const url = new URL(globalThis.location.href)
    url.searchParams.set('page', String(page))
    globalThis.history.replaceState({}, '', `${url.pathname}${url.search}`)
  }, [page])

  const pageCount = Number(pdf?.numPages || 0)

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-[#eef1ef] text-[#18231f]">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-black/10 bg-white/95 px-3 backdrop-blur">
        <button type="button" onClick={() => globalThis.history.back()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10" aria-label="返回">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{filename}</div>
          <div className="mt-0.5 text-[10px] text-black/45">已定位到第 {page} 页{pageCount ? ` / 共 ${pageCount} 页` : ''}</div>
        </div>
        <a href={downloadUrl} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#17342b] text-white" aria-label="下载文档">
          <ArrowDownTrayIcon className="h-5 w-5" />
        </a>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        {loading && <div className="grid h-full place-items-center text-sm text-black/50">正在加载 PDF 第 {page} 页…</div>}
        {error && (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center">
            <div className="font-semibold text-red-700">PDF 预览失败</div>
            <div className="mt-2 break-all text-xs leading-6 text-black/50">{error}</div>
            <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-[#17342b] px-4 py-2.5 text-xs font-semibold text-white">使用系统查看器打开</a>
          </div>
        )}
        <div className={loading || error ? 'hidden' : 'mx-auto w-fit overflow-hidden rounded-xl bg-white shadow-[0_18px_55px_rgba(20,40,31,.16)]'}>
          <canvas ref={canvasRef} className="block max-w-none" />
        </div>
      </main>

      {!error && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-black/10 bg-white/95 px-3 py-2 pb-[calc(8px+env(safe-area-inset-bottom))] backdrop-blur">
          <div className="flex overflow-hidden rounded-xl border border-black/10">
            <button type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="grid h-10 w-10 place-items-center disabled:opacity-30" aria-label="上一页">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="grid min-w-[76px] place-items-center border-x border-black/10 px-2 text-xs font-semibold">{page} / {pageCount || '—'}</div>
            <button type="button" disabled={!pageCount || page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))} className="grid h-10 w-10 place-items-center disabled:opacity-30" aria-label="下一页">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex overflow-hidden rounded-xl border border-black/10">
            <button type="button" onClick={() => setScale(value => Math.max(0.65, value - 0.15))} className="grid h-10 w-10 place-items-center border-r border-black/10" aria-label="缩小">
              <MagnifyingGlassMinusIcon className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setScale(value => Math.min(2.2, value + 0.15))} className="grid h-10 w-10 place-items-center" aria-label="放大">
              <MagnifyingGlassPlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
