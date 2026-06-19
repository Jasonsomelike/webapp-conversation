'use client'
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from 'react'
import { useState } from 'react'
import { Streamdown } from 'streamdown'
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
  const imageUrl = toDifyAssetProxyUrl(String(src))
  if (!imageUrl)
  { return null }

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
        <img src={imageUrl} alt={alt} loading='lazy' />
        <span className='pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-black/65 px-3 py-2 text-[11px] text-white transition-transform group-hover:translate-y-0'>
          点击放大查看
        </span>
      </span>
      {preview && <ImagePreview url={imageUrl} onCancel={() => setPreview(false)} />}
    </>
  )
}

const MarkdownLink = ({
  href = '',
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const downloadable = isDownloadableAsset(href)
  const filename = (() => {
    try {
      return decodeURIComponent(new URL(href, 'https://local.invalid').pathname.split('/').pop() || '下载文件')
    }
    catch {
      return '下载文件'
    }
  })()
  const target = toDifyAssetProxyUrl(href, downloadable, filename)
  return (
    <a
      {...props}
      href={target}
      target={downloadable ? undefined : '_blank'}
      rel='noreferrer'
      download={downloadable ? filename : undefined}
      className={downloadable ? 'markdown-download-link' : 'markdown-link'}
    >
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
