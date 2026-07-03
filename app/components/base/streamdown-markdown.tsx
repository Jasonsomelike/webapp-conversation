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
  toBrowserImageFallbackUrl,
  toDirectDifyAssetUrl,
  toDifyAssetProxyUrl,
} from '@/lib/dify-assets'
import { isNetworkStudyApp } from '@/lib/native-app'

interface StreamdownMarkdownProps {
  content: string
  className?: string
  shareToken?: string
}

const toSharedAssetProxyUrl = (value: string, shareToken?: string, download = false, filename = '') => {
  if (!shareToken)
  { return toDifyAssetProxyUrl(value, download, filename) }
  const url = toAbsoluteDifyAssetUrl(value)
  if (!url)
  { return '' }
  try {
    const target = new URL(url)
    const isDifyAsset = ['http:', 'https:'].includes(target.protocol)
      && ['dify.jasonsome.cn', 'www.jasonsome.cn', 'jasonsome.cn'].includes(target.hostname)
      && (target.hostname !== 'dify.jasonsome.cn' || !target.port || target.port === '22380')
      && (target.pathname.startsWith('/files/') || target.pathname.startsWith('/page-images/'))
    if (!isDifyAsset)
    { return toDifyAssetProxyUrl(value, download, filename) }
  }
  catch {
    return toDifyAssetProxyUrl(value, download, filename)
  }
  const params = new URLSearchParams({ url })
  if (download)
  { params.set('download', '1') }
  if (filename)
  { params.set('filename', filename) }
  return `/api/share/${encodeURIComponent(shareToken)}/file-proxy?${params}`
}

interface MarkdownImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  shareToken?: string
}

const MarkdownImage = ({ src = '', alt = '', shareToken }: MarkdownImageProps) => {
  const [preview, setPreview] = useState(false)
  const [failed, setFailed] = useState(false)
  const [useProxyImage, setUseProxyImage] = useState(false)
  const [useRefreshedSourceImage, setUseRefreshedSourceImage] = useState(false)
  const [skipRefreshedSourceImage, setSkipRefreshedSourceImage] = useState(false)
  const [sourceInfo, setSourceInfo] = useState<{
    referenceId?: string
    previewUrl?: string
    imageUrl?: string
    documentName?: string
    pageNumber?: number
  }>()
  const sourceUrl = String(src)
  const absoluteSourceUrl = toAbsoluteDifyAssetUrl(sourceUrl)
  const imageUrl = toSharedAssetProxyUrl(sourceUrl, shareToken)
  const directImageUrl = !shareToken
    ? toBrowserImageFallbackUrl(sourceUrl) || toDirectDifyAssetUrl(sourceUrl)
    : ''
  const refreshedSourceImageUrl = !shareToken && useRefreshedSourceImage && !skipRefreshedSourceImage && sourceInfo?.imageUrl ? sourceInfo.imageUrl : ''
  const renderedImageUrl = refreshedSourceImageUrl || (!useProxyImage && directImageUrl ? directImageUrl : imageUrl)

  const isPdfPageImage = /\/page-images\/[^/]+\/page_(\d+)\.(?:jpe?g|png|webp)(?:[?#].*)?$/i.test(absoluteSourceUrl || sourceUrl)
  const isReferencePageImageApi = /\/api\/sources\/[0-9a-f-]+\/page-image(?:[?#].*)?$/i.test(sourceUrl)
  const isInlineKnowledgeIllustration = Boolean((absoluteSourceUrl || sourceUrl).includes('/page-images/') && !isPdfPageImage)
  const hintedFilename = String(alt).match(/([^\n|]+?\.(?:pdf|docx?|pptx?))/i)?.[1]?.replace(/^[\s\-–—*#>|![\]()"'“”‘’]+/, '').trim()
  const hintedPageNumber = Number(String(alt).match(/(?:第\s*(\d{1,5})\s*页|page\s*(\d{1,5}))/i)?.slice(1).find(Boolean) || 0) || undefined
  const pageNumber = sourceInfo?.pageNumber
    || Number(sourceUrl.match(/\/page-images\/[^/]+\/page_(\d+)\./i)?.[1] || 0)
    || (() => {
      try {
        return Number(new URL(sourceUrl, 'https://www.jasonsome.cn').searchParams.get('page') || 0) || undefined
      }
      catch {
        return undefined
      }
    })()
    || hintedPageNumber
  const sourceFilename = sourceInfo?.documentName || hintedFilename
  const sourceInfoHref = (() => {
    const params = new URLSearchParams({ url: absoluteSourceUrl })
    if (sourceFilename)
    { params.set('filename', sourceFilename) }
    if (pageNumber)
    { params.set('page', String(pageNumber)) }
    return `/api/sources/image-info?${params}`
  })()
  const isKnowledgeSource = Boolean((isPdfPageImage || isReferencePageImageApi) && (pageNumber || sourceInfo?.previewUrl || sourceUrl.includes('/page-images/') || isReferencePageImageApi))
  const isGeneratedImage = sourceUrl.includes('/files/tools/') || sourceUrl.includes('/api/generated-files/')
  const sourceLabel = isKnowledgeSource
    ? `来源：${sourceFilename || '课程知识库原页'}${pageNumber ? ` · 第 ${pageNumber} 页` : ''}`
    : isGeneratedImage
      ? '来源：计网Agent AI 生成图片'
      : alt
        ? `图片说明：${alt}`
        : '来源：回答附图'
  const originalLabel = isKnowledgeSource ? '查看来源' : '查看原图'
  const showOriginalLink = !isGeneratedImage
  const sourceHref = isKnowledgeSource
    ? sourceInfo?.previewUrl || `${sourceInfoHref}&redirect=1`
    : directImageUrl || imageUrl
  const disableNativeGeneratedPreview = isGeneratedImage && isNetworkStudyApp()
  const openPreview = () => {
    if (disableNativeGeneratedPreview)
    { return }
    if (isNetworkStudyApp())
    { setPreview(true) }
    else
    { window.open(renderedImageUrl, '_blank', 'noopener,noreferrer') }
  }
  const getReturnContext = (element?: HTMLElement | null) => {
    if (typeof window === 'undefined')
    { return { returnTo: '', messageId: '', conversationId: '' } }
    const messageElement = element?.closest<HTMLElement>('.chat-message-target')
    const messageId = messageElement?.dataset.messageId
      || messageElement?.id?.replace(/^message-/, '')
      || ''
    const conversationId = String((window as any).__NETWORK_STUDY_CURRENT_CONVERSATION_ID || '')
    const returnUrl = new URL(window.location.href)
    if (conversationId)
    { returnUrl.searchParams.set('conversationId', conversationId) }
    if (messageId)
    { returnUrl.searchParams.set('messageId', messageId) }
    return {
      returnTo: `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`,
      messageId,
      conversationId,
    }
  }
  const sourceHrefWithReturn = (element?: HTMLElement | null) => {
    if (!isKnowledgeSource || typeof window === 'undefined')
    { return sourceHref }
    const { returnTo } = getReturnContext(element)
    const separator = sourceHref.includes('?') ? '&' : '?'
    return `${sourceHref}${separator}returnTo=${encodeURIComponent(returnTo)}`
  }
  const rememberReturnPosition = (element?: HTMLElement | null) => {
    if (!isKnowledgeSource || typeof window === 'undefined')
    { return }
    const { returnTo, messageId, conversationId } = getReturnContext(element)
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
    const parentRect = scrollParent?.getBoundingClientRect()
    const elementRect = element?.getBoundingClientRect()
    const anchorDelta = parentRect && elementRect ? elementRect.top - parentRect.top : undefined
    sessionStorage.setItem('network-study-source-return', JSON.stringify({
      href: returnTo || `${window.location.pathname}${window.location.search}${window.location.hash}`,
      y: scrollParent?.scrollTop ?? window.scrollY,
      messageId,
      conversationId,
      anchorDelta,
      at: Date.now(),
    }))
  }

  useEffect(() => {
    setFailed(false)
    setUseProxyImage(false)
    setUseRefreshedSourceImage(false)
    setSkipRefreshedSourceImage(false)
  }, [sourceUrl, shareToken])

  useEffect(() => {
    if (!failed || !sourceInfo?.imageUrl || useRefreshedSourceImage)
    { return }
    setFailed(false)
    setUseProxyImage(false)
    setUseRefreshedSourceImage(true)
  }, [failed, sourceInfo?.imageUrl, useRefreshedSourceImage])

  useEffect(() => {
    if (!isPdfPageImage && !isReferencePageImageApi)
    { return }
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const loadSourceInfo = async (attempt = 0) => {
      const endpoint = (() => {
        if (isReferencePageImageApi) {
          const apiUrl = new URL(sourceUrl, window.location.origin)
          apiUrl.searchParams.set('json', '1')
          return `${apiUrl.pathname}${apiUrl.search}`
        }
        return sourceInfoHref
      })()
      const response = await fetch(endpoint, {
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
  }, [absoluteSourceUrl, isPdfPageImage, isReferencePageImageApi, sourceInfoHref, sourceUrl])

  if (!renderedImageUrl)
  { return null }

  if (failed) {
    return (
      <span className='markdown-media-error'>
        <span>{sourceLabel} · 图片加载失败</span>
        <button type='button' onClick={() => {
          setFailed(false)
          setUseProxyImage(false)
        }}>重试</button>
        {showOriginalLink && !isInlineKnowledgeIllustration && (
          <a href={sourceHrefWithReturn()} onClick={(event) => {
            rememberReturnPosition(event.currentTarget)
            event.currentTarget.href = sourceHrefWithReturn(event.currentTarget)
          }}>{originalLabel}</a>
        )}
      </span>
    )
  }

  return (
    <>
      <figure className='markdown-source-figure my-4 max-w-full overflow-hidden rounded-xl border border-black/10 bg-black/[0.025] shadow-sm'>
        <span
          role='button'
          tabIndex={disableNativeGeneratedPreview ? -1 : 0}
          className={`markdown-media group relative block max-w-full overflow-hidden text-left ${disableNativeGeneratedPreview ? 'cursor-default' : ''}`}
          onClick={openPreview}
          onKeyDown={(event) => {
            if (disableNativeGeneratedPreview)
            { return }
            if (event.key === 'Enter' || event.key === ' ')
            { openPreview() }
          }}
        >
          <img
            src={renderedImageUrl}
            alt={alt}
            loading='lazy'
            decoding='async'
            onError={() => {
              if (refreshedSourceImageUrl) {
                setSkipRefreshedSourceImage(true)
                return
              }
              if (!useRefreshedSourceImage && sourceInfo?.imageUrl) {
                setUseProxyImage(false)
                setUseRefreshedSourceImage(true)
                return
              }
              if (!useProxyImage && imageUrl && imageUrl !== renderedImageUrl) {
                setUseProxyImage(true)
                return
              }
              setFailed(true)
            }}
          />
          {!disableNativeGeneratedPreview && (
            <span className='pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-black/65 px-3 py-2 text-[11px] text-white transition-transform group-hover:translate-y-0'>
              点击放大查看
            </span>
          )}
        </span>
        {!isInlineKnowledgeIllustration && (
          <figcaption className='flex flex-wrap items-center justify-between gap-2 border-t border-black/10 px-3 py-2 text-[11px] text-[var(--studio-muted)]'>
            <span>{sourceLabel}</span>
            {showOriginalLink && (
              <a
                href={sourceHrefWithReturn()}
                target='_blank'
                rel='noreferrer'
                onClick={(event) => {
                  event.stopPropagation()
                  rememberReturnPosition(event.currentTarget)
                  event.currentTarget.href = sourceHrefWithReturn(event.currentTarget)
                }}
                className='font-semibold text-[var(--studio-accent-strong)]'
              >
                {originalLabel}
              </a>
            )}
          </figcaption>
        )}
      </figure>
      {preview && <ImagePreview url={renderedImageUrl} onCancel={() => setPreview(false)} />}
    </>
  )
}
const childText = (children: ReactNode) => Array.isArray(children)
  ? children.map(child => String(child)).join('').trim()
  : String(children || '').trim()

interface MarkdownLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  shareToken?: string
}

const MarkdownLink = ({
  href = '',
  children,
  shareToken,
  ...props
}: MarkdownLinkProps) => {
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
  const target = toSharedAssetProxyUrl(href, shareToken, downloadable, filename)

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

export function StreamdownMarkdown({ content, className = '', shareToken }: StreamdownMarkdownProps) {
  return (
    <div className={`streamdown-markdown ${className}`}>
      <Streamdown
        defaultOrigin='https://dify.jasonsome.cn:22380'
        components={{
          img: props => <MarkdownImage {...props} shareToken={shareToken} />,
          a: props => <MarkdownLink {...props} shareToken={shareToken} />,
        }}
      >
        {normalizeAssistantMarkdown(content)}
      </Streamdown>
    </div>
  )
}

export default StreamdownMarkdown
