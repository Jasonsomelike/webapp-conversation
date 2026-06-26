import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import XClose from '@/app/components/base/icons/line/x-close'

interface ImagePreviewProps {
  url: string
  onCancel: () => void
}
const ImagePreview: FC<ImagePreviewProps> = ({
  url,
  onCancel,
}) => {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const openExternal = () => {
    if (typeof window === 'undefined')
    { return }
    if (window.NetworkStudyApp?.openExternalUrl)
    { window.NetworkStudyApp.openExternalUrl(url) }
    else
    { window.open(url, '_blank', 'noopener,noreferrer') }
  }

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [url])

  return createPortal(
    <div className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm' onClick={onCancel}>
      {!loaded && !failed && (
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white shadow-xl'>
          图片加载中…
        </div>
      )}
      {failed
        ? (
          <div className='max-w-[min(92vw,420px)] rounded-3xl bg-white p-5 text-center shadow-2xl' onClick={event => event.stopPropagation()}>
            <div className='text-base font-semibold text-gray-900'>原图加载失败</div>
            <div className='mt-2 break-all text-xs leading-5 text-gray-500'>{url}</div>
            <div className='mt-5 flex gap-2'>
              <button type='button' className='flex-1 rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700' onClick={() => setFailed(false)}>重试</button>
              <button type='button' className='flex-1 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white' onClick={openExternal}>外部打开</button>
            </div>
          </div>
        )
        : (
          <img
            alt='preview image'
            src={url}
            className={`max-h-full max-w-full rounded-lg object-contain shadow-2xl transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            decoding='async'
            loading='eager'
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            onClick={event => event.stopPropagation()}
          />
        )}
      <div
        className='absolute right-6 top-6 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/[0.08] backdrop-blur-[2px]'
        onClick={(event) => {
          event.stopPropagation()
          onCancel()
        }}
      >
        <XClose className='h-4 w-4 text-white' />
      </div>
      <button
        type='button'
        className='absolute bottom-[calc(22px+env(safe-area-inset-bottom))] rounded-full bg-white/12 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20'
        onClick={(event) => {
          event.stopPropagation()
          openExternal()
        }}
      >
        外部打开
      </button>
    </div>,
    document.body,
  )
}

export default ImagePreview
