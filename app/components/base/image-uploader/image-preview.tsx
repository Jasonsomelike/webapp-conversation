import type { FC } from 'react'
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
  return createPortal(
    <div className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm' onClick={onCancel}>
      <img
        alt='preview image'
        src={url}
        className='max-h-full max-w-full rounded-lg object-contain shadow-2xl'
        onClick={event => event.stopPropagation()}
      />
      <div
        className='absolute top-6 right-6 flex items-center justify-center w-8 h-8 bg-white/[0.08] rounded-lg backdrop-blur-[2px] cursor-pointer'
        onClick={(event) => {
          event.stopPropagation()
          onCancel()
        }}
      >
        <XClose className='w-4 h-4 text-white' />
      </div>
    </div>,
    document.body,
  )
}

export default ImagePreview
