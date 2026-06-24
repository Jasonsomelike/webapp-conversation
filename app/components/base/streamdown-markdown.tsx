'use client'
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Streamdown } from 'streamdown'
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import 'katex/dist/katex.min.css'
import ImagePreview from '@/app/components/base/image-uploader/image-preview'
import {
  isDownloadableAsset,
  normalizeAssistantMarkdown,
  toAbsoluteDifyAssetUrl,
  toDifyAssetProxyUrl,
} from '@/lib/dify-assets'

interface StreamdownMarkdownProps {
  content: string
  className?: string
}

const MarkdownImage = ({ src = '', alt = '' }: ImgHTMLAttributes<HTMLImageElement>) => {
  const [preview, setPreview] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sourceInfo, setSourceInfo] = useState<{
    referenceId?: string
    previewUrl?: string
    documentName?: string
    pageNumber?: number
  }>()
  const sourceUrl = String(src)
  const absoluteSourceUrl = toAbsoluteDifyAssetUrl(sourceUrl)
  const imageUrl = toDifyAssetProxyUrl(sourceUrl)

  const pageNumber = sourceInfo?.pageNumber || Number(sourceUrl.match(/\/page-images\/[^/]+\/page_(\d+)\./i)?.[1] || 0) || undefined
  const sourceFilename = sourceInfo?.documentName || String(alt).match(/([^\n|]+?\.(?:pdf|docx?|pptx?))/i)?.[1]?.replace(/^[\s\-–—*#>|![\]()"'“”‘’]+/, '').trim()
  const isKnowledgeSource = Boolean(pageNumber || sourceUrl.includes('/page-images/'))
  const isGeneratedImage = sourceUrl.includes('/files/tools/')
  const sourceLabel = isKnowledgeSource
    ? `来源：${sourceFilename || '课程知识库原页'}${pageNumber ? ` · 第 ${pageNumber} 页` : ''}`
    : isGeneratedImage
      ? '来源：计网Agent AI 生成图片'
      : alt
        ? `图片说明：${alt}`
        : '来源：回答附图'
  const originalLabel = isKnowledgeSource ? '查看来源' : '查看原图'
  const sourceHref = isKnowledgeSource
    ? sourceInfo?.previewUrl || `/api/sources/image-info?redirect=1&url=${encodeURIComponent(absoluteSourceUrl)}`
    : imageUrl
  const sourceHrefWithReturn = () => {
    if (!isKnowledgeSource || typeof window === 'undefined')
    { return sourceHref }
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`
    const separator = sourceHref.includes('?') ? '&' : '?'
    return `${sourceHref}${separator}returnTo=${encodeURIComponent(returnTo)}`
  }
  const rememberReturnPosition = (element?: HTMLElement | null) => {
    if (!isKnowledgeSource || typeof window === 'undefined')
    { return }
    const scrollParent = (() => {
      let current = element?.parentElement || null
      while (current) {
        const style = window.getComputedStyle(current)
        if (/(auto|scroll)/.test(style.overflowY))
        { return current }
        current = current.parentElement
      }
      return null
    })()
    sessionStorage.setItem('network-study-source-return', JSON.stringify({
      href: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      y: scrollParent?.scrollTop ?? window.scrollY,
      at: Date.now(),
    }))
  }

  useEffect(() => {
    if (!absoluteSourceUrl.includes('/page-images/'))
    { return }
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const loadSourceInfo = async (attempt = 0) => {
      const response = await fetch(`/api/sources/image-info?url=${encodeURIComponent(absoluteSourceUrl)}`, {
        credentials: 'include',
      }).catch(() => null)
      if (cancelled)
      { return }
      if (response?.ok) {
        setSourceInfo(await response.json())
        return
      }
      if (attempt < 2)
      { timers.push(setTimeout(() => void loadSourceInfo(attempt + 1), attempt === 0 ? 4000 : 8000)) }
    }
    void loadSourceInfo()
    return () => {
      cancelled = true
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [absoluteSourceUrl])

  if (!imageUrl)
  { return null }

  if (failed) {
    return (
      <span className='markdown-media-error'>
        <span>{sourceLabel} · 图片加载失败</span>
        <button type='button' onClick={() => setFailed(false)}>重试</button>
        <a href={sourceHrefWithReturn()} onClick={event => rememberReturnPosition(event.currentTarget)}>{originalLabel}</a>
      </span>
    )
  }

  return (
    <>
      <figure className='markdown-source-figure my-4 max-w-full overflow-hidden rounded-xl border border-black/10 bg-black/[0.025] shadow-sm'>
        <span
          role='button'
          tabIndex={0}
          className='markdown-media group relative block max-w-full overflow-hidden text-left'
          onClick={() => setPreview(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ')
            { setPreview(true) }
          }}
        >
          <img src={imageUrl} alt={alt} loading='lazy' onError={() => setFailed(true)} />
          <span className='pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-black/65 px-3 py-2 text-[11px] text-white transition-transform group-hover:translate-y-0'>
            点击放大查看
          </span>
        </span>
        <figcaption className='flex flex-wrap items-center justify-between gap-2 border-t border-black/10 px-3 py-2 text-[11px] text-[var(--studio-muted)]'>
          <span>{sourceLabel}</span>
          <a
            href={sourceHrefWithReturn()}
            rel='noreferrer'
            onClick={(event) => {
              event.stopPropagation()
              rememberReturnPosition(event.currentTarget)
            }}
            className='font-semibold text-[var(--studio-accent-strong)]'
          >
            {originalLabel}
          </a>
        </figcaption>
      </figure>
      {preview && <ImagePreview url={imageUrl} onCancel={() => setPreview(false)} />}
    </>
  )
}
const childText = (children: ReactNode) => Array.isArray(children)
  ? children.map(child => String(child)).join('').trim()
  : String(children || '').trim()

const MarkdownLink = ({
  href = '',
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const downloadable = isDownloadableAsset(href)
  const filename = (() => {
    const label = childText(children)
    if (/\.(?:csv|docx?|md|pdf|pptx?|rtf|txt|xlsx?|zip)$/i.test(label))
    { return label }
    try {
      return decodeURIComponent(new URL(href, 'https://local.invalid').pathname.split('/').pop() || '下载文件')
    }
    catch {
      return '下载文件'
    }
  })()
  const target = toDifyAssetProxyUrl(href, downloadable, filename)

  if (downloadable) {
    const extension = filename.split('.').pop()?.toUpperCase() || 'FILE'
    return (
      <a {...props} href={target} download={filename} className='markdown-file-card'>
        <span className='markdown-file-icon'><DocumentTextIcon /></span>
        <span className='min-w-0 flex-1'>
          <span className='markdown-file-name'>{filename}</span>
          <span className='markdown-file-type'>{extension} 文件</span>
        </span>
        <span className='markdown-file-download'><ArrowDownTrayIcon />下载</span>
      </a>
    )
  }

  return (
    <a {...props} href={target} target='_blank' rel='noreferrer' className='markdown-link'>
      {children}
    </a>
  )
}

export function StreamdownMarkdown({ content, className = '' }: StreamdownMarkdownProps) {
  return (
    <div className={`streamdown-markdown ${className}`}>
      <Streamdown
        defaultOrigin='https://dify.jasonsome.cn:22380'
        components={{
          img: MarkdownImage,
          a: MarkdownLink,
        }}
      >
        {normalizeAssistantMarkdown(content)}
      </Streamdown>
    </div>
  )
}

export default StreamdownMarkdown
