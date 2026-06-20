'use client'
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'
import { Streamdown } from 'streamdown'
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import 'katex/dist/katex.min.css'
import ImagePreview from '@/app/components/base/image-uploader/image-preview'
import {
  isDownloadableAsset,
  normalizeAssistantMarkdown,
  toDifyAssetProxyUrl,
} from '@/lib/dify-assets'

interface StreamdownMarkdownProps {
  content: string
  className?: string
}

const MarkdownImage = ({ src = '', alt = '' }: ImgHTMLAttributes<HTMLImageElement>) => {
  const [preview, setPreview] = useState(false)
  const [failed, setFailed] = useState(false)
  const imageUrl = toDifyAssetProxyUrl(String(src))
  if (!imageUrl)
  { return null }

  if (failed) {
    return (
      <span className='markdown-media-error'>
        图片加载失败
        <a href={imageUrl} target='_blank' rel='noreferrer'>打开原图</a>
      </span>
    )
  }

  return (
    <>
      <span
        role='button'
        tabIndex={0}
        className='markdown-media group relative my-4 block max-w-full overflow-hidden rounded-xl border border-black/10 bg-black/[0.025] text-left shadow-sm'
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
