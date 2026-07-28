'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import s from './style.module.css'
import ImagePreview from '@/app/components/base/image-uploader/image-preview'
import { toBrowserImageFallbackUrl } from '@/lib/dify-assets'
import { isNetworkStudyApp } from '@/lib/native-app'

interface Props {
  srcs: string[]
}

const getWidthStyle = (imgNum: number) => {
  if (imgNum === 1) {
    return {
      maxWidth: 'min(100%, 330px)',
    }
  }

  if (imgNum === 2 || imgNum === 4) {
    return {
      width: 'calc(50% - 4px)',
    }
  }

  return {
    width: 'calc(33.3333% - 5.3333px)',
  }
}

const ImageGallery: FC<Props> = ({
  srcs,
}) => {
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set())
  const [retryUrls, setRetryUrls] = useState<Record<string, string>>({})
  const retryCountsRef = useRef<Record<string, number>>({})
  const retryTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => () => {
    Object.values(retryTimersRef.current).forEach(timer => globalThis.clearTimeout(timer))
  }, [])

  const validSrcs = srcs.filter(src => src && src.trim() !== '')
  const imgNum = validSrcs.length
  const imgStyle = getWidthStyle(imgNum)
  const openImage = (src: string) => {
    const fallbackSrc = toBrowserImageFallbackUrl(src) || src
    if (isNetworkStudyApp())
    { setImagePreviewUrl(fallbackSrc) }
    else
    { window.open(fallbackSrc, '_blank', 'noopener,noreferrer') }
  }

  if (imgNum === 0) { return null }

  return (
    <div className={cn(s[`img-${imgNum}`], 'flex flex-wrap')}>
      {validSrcs.map((src, index) => (
        failedUrls.has(src)
          ? (
            <button
              key={`${src}-${index}`}
              type="button"
              className={s.errorItem}
              style={imgStyle}
              onClick={() => {
                retryCountsRef.current[src] = 0
                setFailedUrls((previous) => {
                  const next = new Set(previous)
                  next.delete(src)
                  return next
                })
                setRetryUrls(previous => ({
                  ...previous,
                  [src]: `${src}${src.includes('?') ? '&' : '?'}imageRetry=${Date.now()}`,
                }))
              }}
            >
              图片加载失败，点击重试
            </button>
          )
          : (
            <img
              key={`${src}-${index}`}
              className={s.item}
              style={imgStyle}
              src={retryUrls[src] || src}
              alt=''
              loading='lazy'
              decoding='async'
              onLoad={() => {
                retryCountsRef.current[src] = 0
                const timer = retryTimersRef.current[src]
                if (timer)
                { globalThis.clearTimeout(timer) }
                delete retryTimersRef.current[src]
              }}
              onError={(event) => {
                const fallbackSrc = toBrowserImageFallbackUrl(src)
                if (fallbackSrc && event.currentTarget.src !== fallbackSrc) {
                  event.currentTarget.src = fallbackSrc
                  return
                }
                if (src.startsWith('/api/generated-files/')) {
                  const attempt = (retryCountsRef.current[src] || 0) + 1
                  retryCountsRef.current[src] = attempt
                  if (attempt <= 4) {
                    const delay = Math.min(12000, 1200 * 2 ** (attempt - 1))
                    retryTimersRef.current[src] = globalThis.setTimeout(() => {
                      setRetryUrls(previous => ({
                        ...previous,
                        [src]: `${src}${src.includes('?') ? '&' : '?'}imageRetry=${attempt}-${Date.now()}`,
                      }))
                    }, delay)
                    return
                  }
                }
                setFailedUrls((previous) => {
                  const next = new Set(previous)
                  next.add(src)
                  return next
                })
              }}
              onClick={() => openImage(src)}
            />
          )
      ))}
      {
        imagePreviewUrl && (
          <ImagePreview
            url={imagePreviewUrl}
            onCancel={() => setImagePreviewUrl('')}
          />
        )
      }
    </div>
  )
}

export default React.memo(ImageGallery)

export const ImageGalleryTest = () => {
  const imgGallerySrcs = (() => {
    const srcs = []
    for (let i = 0; i < 6; i++)
    // srcs.push('https://placekitten.com/640/360')
    // srcs.push('https://placekitten.com/360/640')
    { srcs.push('https://placekitten.com/360/360') }

    return srcs
  })()
  return (
    <div className='space-y-2'>
      {imgGallerySrcs.map((_, index) => (
        <div key={index} className='p-4 pb-2 rounded-lg bg-[#D1E9FF80]'>
          <ImageGallery srcs={imgGallerySrcs.slice(0, index + 1)} />
        </div>
      ))}
    </div>
  )
}
