'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from '@heroicons/react/24/outline'
import { toBrowserImageFallbackUrl, toDifyAssetProxyUrl } from '@/lib/dify-assets'

let pdfJsPromise: Promise<typeof import('pdfjs-dist')> | undefined

const loadPdfJs = () => {
  pdfJsPromise ||= import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    return pdfjs
  })
  return pdfJsPromise
}

const withProxyFallback = (url: string) => {
  try {
    const parsed = new URL(url, globalThis.location.origin)
    // The normal same-origin file route returns a short-lived signed redirect
    // to the library file service. Let the browser/PDF.js follow that redirect
    // directly; forcing Vercel serverless to proxy large range streams is more
    // fragile and can surface intermittent 502 "failed to fetch" previews.
    if (parsed.pathname.startsWith('/api/library/documents/'))
    { return undefined }
    if (parsed.origin !== globalThis.location.origin)
    { return undefined }
    if (!/\/api\/(?:library\/documents|sources)\/.+\/file$/.test(parsed.pathname))
    { return undefined }
    if (parsed.searchParams.get('proxy') === '1')
    { return undefined }
    parsed.searchParams.set('proxy', '1')
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }
  catch {
    return undefined
  }
}

const inferPageCountFromFilename = (filename: string) => {
  const matched = filename.match(/(?:^|[_\-\s])p(\d{1,5})-(\d{1,5})(?:\.|_|-|$)/i)
  if (!matched)
  { return 0 }
  const start = Number(matched[1])
  const end = Number(matched[2])
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
  { return 0 }
  return end - start + 1
}

const nearbyPages = (page: number, pageCount: number, distance = 2) =>
  Array.from({ length: distance * 2 }, (_item, index) => page + index - distance)
    .filter(nextPage => nextPage !== page && nextPage >= 1 && nextPage <= pageCount)

const unwrapDifyProxyUrl = (value: string) => {
  try {
    const parsed = new URL(value, globalThis.location.origin)
    if (parsed.origin === globalThis.location.origin && parsed.pathname === '/api/dify/file-proxy')
    { return parsed.searchParams.get('url') || value }
  }
  catch {
    // Keep the already usable value.
  }
  return value
}

interface PdfReferenceViewerProps {
  referenceId?: string
  filename: string
  initialPage: number
  sourceUrl?: string
  downloadUrl?: string
  pageImageUrl?: string
  pageImageCount?: number
  backHref?: string
}

export default function PdfReferenceViewer({
  referenceId,
  filename,
  initialPage,
  sourceUrl: explicitSourceUrl,
  downloadUrl: explicitDownloadUrl,
  pageImageUrl,
  pageImageCount: explicitPageImageCount,
  backHref = '/library',
}: PdfReferenceViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<HTMLElement>(null)
  const renderTaskRef = useRef<{ cancel: () => void }>()
  const touchStartRef = useRef<{ x: number, y: number }>()
  const [pdf, setPdf] = useState<any>()
  const [page, setPage] = useState(Math.max(1, initialPage))
  const [scale, setScale] = useState(1)
  const [viewerWidth, setViewerWidth] = useState(0)
  const [retryKey, setRetryKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [imageLoading, setImageLoading] = useState(Boolean(pageImageUrl))
  const [error, setError] = useState('')
  const [imageFallback, setImageFallback] = useState(false)
  const [imageRawFallback, setImageRawFallback] = useState(false)
  const pageImageCount = useMemo(
    () => pageImageUrl ? Math.max(page, explicitPageImageCount || inferPageCountFromFilename(filename) || page) : 0,
    [explicitPageImageCount, filename, page, pageImageUrl],
  )
  const pageImageBaseUrl = useMemo(
    () => pageImageUrl ? unwrapDifyProxyUrl(pageImageUrl) : '',
    [pageImageUrl],
  )
  const currentPageImageUrl = useMemo(() => {
    if (!pageImageUrl)
    { return '' }
    const nextRawUrl = pageImageBaseUrl.replace(
      /\/page_\d+(\.(?:jpe?g|png|webp)(?:[?#].*)?)$/i,
      `/page_${page}$1`,
    )
    return toDifyAssetProxyUrl(nextRawUrl || pageImageBaseUrl || pageImageUrl)
  }, [page, pageImageBaseUrl, pageImageUrl])
  const currentRawPageImageUrl = useMemo(() => {
    if (!pageImageUrl)
    { return '' }
    const nextRawUrl = pageImageBaseUrl.replace(
      /\/page_\d+(\.(?:jpe?g|png|webp)(?:[?#].*)?)$/i,
      `/page_${page}$1`,
    )
    return toBrowserImageFallbackUrl(nextRawUrl || pageImageBaseUrl || pageImageUrl)
  }, [page, pageImageBaseUrl, pageImageUrl])
  const renderedPageImageUrl = imageRawFallback && currentRawPageImageUrl
    ? currentRawPageImageUrl
    : currentPageImageUrl
  // This authenticated same-origin route issues a short-lived signed redirect
  // to the file service. Keep source references on the same path style as the
  // knowledge-library preview; forcing Vercel to proxy large range streams is
  // fragile and was the source of intermittent 502/failed-fetch previews.
  const sourceUrl = explicitSourceUrl || `/api/sources/${encodeURIComponent(referenceId || '')}/file?disposition=inline&filename=${encodeURIComponent(filename)}`
  const downloadUrl = explicitDownloadUrl || `/api/sources/${encodeURIComponent(referenceId || '')}/file?disposition=attachment&filename=${encodeURIComponent(filename)}`
  const sourceUrlWithPage = (() => {
    try {
      const isRelative = sourceUrl.startsWith('/')
      const url = new URL(sourceUrl, isRelative ? 'https://network-study.local' : undefined)
      if (isRelative && /\/api\/(?:library\/documents|sources)\/.+\/file$/.test(url.pathname))
      { url.searchParams.set('page', String(page)) }
      url.hash = `page=${page}`
      return isRelative
        ? `${url.pathname}${url.search}${url.hash}`
        : url.toString()
    }
    catch {
      const separator = sourceUrl.includes('#') ? '' : `#page=${page}`
      return `${sourceUrl}${separator}`
    }
  })()

  useEffect(() => {
    window.NetworkStudyApp?.hideShell()
    const viewer = viewerRef.current
    if (!viewer)
    { return }
    const updateWidth = () => setViewerWidth(viewer.clientWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(viewer)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let disposed = false
    let loadingTask: any
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        setImageFallback(false)
        setImageRawFallback(false)
        setImageLoading(Boolean(pageImageUrl))
        if (pageImageUrl) {
          setPdf(undefined)
          setImageFallback(true)
          setLoading(false)
          return
        }
        const pdfjs = await loadPdfJs()
        const loadDocument = async (url: string) => {
          loadingTask = pdfjs.getDocument({
            url,
            withCredentials: true,
            rangeChunkSize: 512 * 1024,
            disableAutoFetch: true,
            // Keep previews responsive behind the same-origin proxy. The first
            // non-range full PDF fetch can be slow or fail on mobile networks,
            // while range requests are fast and enough for page-by-page viewing.
            disableStream: true,
          })
          return await loadingTask.promise
        }
        let document
        try {
          document = await loadDocument(sourceUrl)
        }
        catch (directError) {
          const proxyUrl = withProxyFallback(sourceUrl)
          if (!proxyUrl)
          { throw directError }
          void loadingTask?.destroy()
          loadingTask = undefined
          document = await loadDocument(proxyUrl)
        }
        if (disposed)
        { return }
        setPdf(document)
        setPage(current => Math.min(document.numPages, Math.max(1, current)))
      }
      catch (reason) {
        if (disposed)
        { return }
        if (pageImageUrl) {
          setPdf(undefined)
          setImageFallback(true)
          setError('')
          return
        }
        setError(reason instanceof Error ? reason.message : 'PDF 加载失败')
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
  }, [retryKey, sourceUrl, pageImageUrl])

  const renderPage = useCallback(async () => {
    const canvas = canvasRef.current
    if (!pdf || !canvas)
    { return }
    const pdfPage = await pdf.getPage(page)
    const baseViewport = pdfPage.getViewport({ scale: 1 })
    const availableWidth = Math.max(280, Math.min((viewerWidth || globalThis.innerWidth) - 24, 1100))
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
  }, [page, pdf, scale, viewerWidth])

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

  useEffect(() => {
    if (!imageFallback || !pageImageUrl)
    { return }
    setError('')
    setImageRawFallback(false)
    setImageLoading(true)
  }, [imageFallback, page, pageImageUrl])

  const pageCount = Number(pdf?.numPages || (imageFallback ? pageImageCount || page : 0))
  const updatePage = useCallback((value: number) => {
    if (!pageCount)
    { return }
    setPage(Math.min(pageCount, Math.max(1, Math.round(value))))
  }, [pageCount])
  const changeScale = (delta: number) =>
    setScale(value => Math.min(2.4, Math.max(0.65, Number((value + delta).toFixed(2)))))

  useEffect(() => {
    if (!pageCount)
    { return }
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
      { return }
      const key = event.key.toLowerCase()
      if (key === 'arrowleft' || key === 'a') {
        event.preventDefault()
        updatePage(page - 1)
      }
      else if (key === 'arrowright' || key === 'd') {
        event.preventDefault()
        updatePage(page + 1)
      }
    }
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [page, pageCount, updatePage])

  useEffect(() => {
    if (!pdf || !pageCount)
    { return }
    nearbyPages(page, pageCount, 2)
      .forEach(nextPage => void pdf.getPage(nextPage).catch(() => undefined))
  }, [page, pageCount, pdf])

  useEffect(() => {
    if (!imageFallback || !pageImageUrl || !pageCount)
    { return }
    nearbyPages(page, pageCount, 2).forEach((nextPage) => {
      const nextRawUrl = pageImageBaseUrl.replace(
        /\/page_\d+(\.(?:jpe?g|png|webp)(?:[?#].*)?)$/i,
        `/page_${nextPage}$1`,
      )
      const proxiedUrl = toDifyAssetProxyUrl(nextRawUrl || pageImageBaseUrl || pageImageUrl)
      const rawUrl = toBrowserImageFallbackUrl(nextRawUrl || pageImageBaseUrl || pageImageUrl)
      ;[proxiedUrl, rawUrl]
        .filter(Boolean)
        .forEach((url) => {
          const image = new Image()
          image.decoding = 'async'
          image.src = url
        })
    })
  }, [imageFallback, page, pageCount, pageImageBaseUrl, pageImageUrl])

  const goBack = () => {
    if (backHref && backHref !== '/library' && backHref !== '/sources') {
      globalThis.location.assign(backHref)
      return
    }
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null
      if (referrer?.origin === globalThis.location.origin && globalThis.history.length > 1) {
        globalThis.history.back()
        return
      }
    }
    catch {
      // Fall through to the explicit workspace route.
    }
    globalThis.location.assign(backHref)
  }

  return (
    <div className="relative flex h-[100dvh] min-h-0 flex-col bg-[#eef1ef] text-[#18231f]">
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-black/10 bg-white/95 px-3 py-2 backdrop-blur">
        <button type="button" onClick={goBack} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-white shadow-sm" aria-label="返回">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{filename}</div>
          <div className="mt-0.5 text-[10px] text-black/45">已定位到第 {page} 页{pageCount ? ` / 共 ${pageCount} 页` : ''}</div>
        </div>
        <a href={downloadUrl} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#17342b] text-white shadow-[0_9px_20px_rgba(23,52,43,.18)]" aria-label="下载文档">
          <ArrowDownTrayIcon className="h-5 w-5" />
        </a>
      </header>

      <main
        ref={viewerRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-5"
        onTouchStart={(event) => {
          const touch = event.changedTouches[0]
          touchStartRef.current = { x: touch.clientX, y: touch.clientY }
        }}
        onTouchEnd={(event) => {
          const start = touchStartRef.current
          const touch = event.changedTouches[0]
          touchStartRef.current = undefined
          if (!start || scale > 1.05)
          { return }
          const deltaX = touch.clientX - start.x
          const deltaY = touch.clientY - start.y
          if (Math.abs(deltaX) < 72 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5)
          { return }
          updatePage(page + (deltaX < 0 ? 1 : -1))
        }}
      >
        {loading && (
          <div className="grid h-full place-items-center">
            <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-5 py-3 text-sm text-black/50 shadow-sm backdrop-blur">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-[var(--studio-accent-strong)]" />
              正在按需加载 PDF 第 {page} 页…
            </div>
          </div>
        )}
        {error && (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center">
            <div className="font-semibold text-red-700">PDF 预览失败</div>
            <div className="mt-2 break-all text-xs leading-6 text-black/50">{error}</div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setRetryKey(value => value + 1)}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold"
              >
                <ArrowPathIcon className="h-4 w-4" />重新加载
              </button>
              <a href={sourceUrlWithPage} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-[#17342b] px-4 py-2.5 text-xs font-semibold text-white">使用系统查看器打开</a>
            </div>
          </div>
        )}
        {!loading && !error && imageFallback && renderedPageImageUrl && (
          <div
            className="mx-auto flex w-fit max-w-full flex-col items-center gap-3"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
            onDoubleClick={() => setScale(value => value > 1.05 ? 1 : 1.65)}
          >
            {imageLoading && (
              <div className="rounded-2xl bg-white/80 px-5 py-3 text-sm text-black/50 shadow-sm backdrop-blur">
                正在加载第 {page} 页图片…
              </div>
            )}
            <img
              src={renderedPageImageUrl}
              alt={`${filename} 第 ${page} 页`}
              className={`block max-h-none max-w-[min(100%,1100px)] rounded-xl bg-white object-contain shadow-[0_18px_55px_rgba(20,40,31,.16)] transition-opacity ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                if (!imageRawFallback && currentRawPageImageUrl && currentRawPageImageUrl !== renderedPageImageUrl) {
                  setImageRawFallback(true)
                  setImageLoading(true)
                  return
                }
                setImageLoading(false)
                setError('来源页图片加载失败，可使用系统查看器打开 PDF。')
              }}
            />
            <a
              href={sourceUrlWithPage}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-black/10 bg-white/85 px-4 py-2 text-xs font-semibold text-[#17342b] shadow-sm backdrop-blur"
            >
              使用系统查看器打开完整 PDF
            </a>
          </div>
        )}
        <div
          className={loading || error || imageFallback ? 'hidden' : 'mx-auto w-fit overflow-hidden rounded-xl bg-white shadow-[0_18px_55px_rgba(20,40,31,.16)]'}
          onDoubleClick={() => setScale(value => value > 1.05 ? 1 : 1.65)}
        >
          <canvas ref={canvasRef} className="block max-w-none" />
        </div>
      </main>

      {!loading && !error && pageCount > 1 && (
        <>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updatePage(page - 1)}
            className="absolute left-5 top-1/2 z-20 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/90 shadow-xl backdrop-blur transition hover:bg-white disabled:opacity-25 lg:grid"
            aria-label="上一页"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => updatePage(page + 1)}
            className="absolute right-5 top-1/2 z-20 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/90 shadow-xl backdrop-blur transition hover:bg-white disabled:opacity-25 lg:grid"
            aria-label="下一页"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </>
      )}

      {!error && (
        <div className="shrink-0 border-t border-black/10 bg-white/95 px-3 pb-[calc(9px+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur">
          {pageCount > 1 && (
            <input
              type="range"
              min={1}
              max={pageCount}
              value={page}
              onChange={event => updatePage(Number(event.target.value))}
              className="mb-2 h-1.5 w-full accent-[#17342b]"
              aria-label="选择 PDF 页码"
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="flex overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm lg:hidden">
              <button type="button" disabled={page <= 1} onClick={() => updatePage(page - 1)} className="grid h-11 w-11 place-items-center disabled:opacity-30" aria-label="上一页">
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <label className="flex min-w-[112px] items-center justify-center gap-1 border-x border-black/10 px-2 text-xs font-semibold">
                <input
                  type="number"
                  min={1}
                  max={pageCount || 1}
                  value={page}
                  onChange={event => updatePage(Number(event.target.value))}
                  className="w-12 bg-transparent text-center outline-none"
                  aria-label="当前页码"
                />
                <span className="text-black/35">/ {pageCount || '—'}</span>
              </label>
              <button type="button" disabled={!pageCount || page >= pageCount} onClick={() => updatePage(page + 1)} className="grid h-11 w-11 place-items-center disabled:opacity-30" aria-label="下一页">
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
              <button type="button" onClick={() => changeScale(-0.15)} className="grid h-11 w-11 place-items-center border-r border-black/10" aria-label="缩小">
                <MagnifyingGlassMinusIcon className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => setScale(1)} className="min-w-12 px-2 text-[10px] font-semibold text-black/50" aria-label="恢复适合宽度">
                {Math.round(scale * 100)}%
              </button>
              <button type="button" onClick={() => changeScale(0.15)} className="grid h-11 w-11 place-items-center border-l border-black/10" aria-label="放大">
                <MagnifyingGlassPlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-1.5 text-center text-[9px] text-black/35">左右滑动翻页 · 双击切换缩放</div>
        </div>
      )}
    </div>
  )
}
