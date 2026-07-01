import type { FC } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Loading02 from '@/app/components/base/icons/line/loading-02'
import XClose from '@/app/components/base/icons/line/x-close'
import RefreshCcw01 from '@/app/components/base/icons/line/refresh-ccw-01'
import AlertTriangle from '@/app/components/base/icons/solid/alert-triangle'
import TooltipPlus from '@/app/components/base/tooltip-plus'
import type { ImageFile } from '@/types/app'
import { TransferMethod } from '@/types/app'
import ImagePreview from '@/app/components/base/image-uploader/image-preview'
import { isNetworkStudyApp } from '@/lib/native-app'

interface ImageListProps {
  list: ImageFile[]
  readonly?: boolean
  composer?: boolean
  onRemove?: (imageFileId: string) => void
  onReUpload?: (imageFileId: string) => void
  onImageLinkLoadSuccess?: (imageFileId: string) => void
  onImageLinkLoadError?: (imageFileId: string) => void
}

const ImageList: FC<ImageListProps> = ({
  list,
  readonly,
  composer,
  onRemove,
  onReUpload,
  onImageLinkLoadSuccess,
  onImageLinkLoadError,
}) => {
  const { t } = useTranslation()
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')

  const handleImageLinkLoadSuccess = (item: ImageFile) => {
    if (item.type === TransferMethod.remote_url && onImageLinkLoadSuccess && item.progress !== -1) { onImageLinkLoadSuccess(item._id) }
  }
  const handleImageLinkLoadError = (item: ImageFile) => {
    if (item.type === TransferMethod.remote_url && onImageLinkLoadError) { onImageLinkLoadError(item._id) }
  }
  const openImage = (url: string) => {
    if (!url)
    { return }
    if (isNetworkStudyApp())
    { setImagePreviewUrl(url) }
    else
    { window.open(url, '_blank', 'noopener,noreferrer') }
  }

  return (
    <div className={composer ? 'flex shrink-0 flex-nowrap gap-2' : 'flex flex-wrap gap-2'}>
      {
        list.map(item => (
          <div
            key={item._id}
            data-composer-asset={composer ? '' : undefined}
            className='group relative rounded-2xl border-[0.5px] border-black/5'
          >
            {
              item.type === TransferMethod.local_file && item.progress !== 100 && (
                <>
                  <div
                    className='absolute inset-0 flex items-center justify-center z-[1] bg-black/30'
                    style={{ left: item.progress > -1 ? `${item.progress}%` : 0 }}
                  >
                    {
                      item.progress === -1 && (
                        <RefreshCcw01 className='w-5 h-5 text-white' onClick={() => onReUpload && onReUpload(item._id)} />
                      )
                    }
                  </div>
                  {
                    item.progress > -1 && (
                      <span className='absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] text-sm text-white mix-blend-lighten z-[1]'>{item.progress}%</span>
                    )
                  }
                </>
              )
            }
            {
              item.type === TransferMethod.remote_url && item.progress !== 100 && (
                <div className={`
                  absolute inset-0 flex items-center justify-center rounded-lg z-[1] border
                  ${item.progress === -1 ? 'bg-[#FEF0C7] border-[#DC6803]' : 'bg-black/[0.16] border-transparent'}
                `}>
                  {
                    item.progress > -1 && (
                      <Loading02 className='animate-spin w-5 h-5 text-white' />
                    )
                  }
                  {
                    item.progress === -1 && (
                      <TooltipPlus popupContent={t('common.imageUploader.pasteImageLinkInvalid')}>
                        <AlertTriangle className='w-4 h-4 text-[#DC6803]' />
                      </TooltipPlus>
                    )
                  }
                </div>
              )
            }
            <img
              className={composer
                ? 'h-[74px] w-[74px] cursor-pointer rounded-2xl border-[0.5px] border-black/5 object-cover'
                : 'h-28 w-28 cursor-pointer rounded-2xl border-[0.5px] border-black/5 object-cover sm:h-32 sm:w-32'}
              alt=''
              onLoad={() => handleImageLinkLoadSuccess(item)}
              onError={() => handleImageLinkLoadError(item)}
              src={item.type === TransferMethod.remote_url ? item.url : item.base64Url}
              onClick={() => item.progress === 100 && openImage((item.type === TransferMethod.remote_url ? item.url : item.base64Url) as string)}
            />
            {
              !readonly && (
                <div
                  className={`
                    absolute right-1 top-1 z-10 items-center justify-center h-6 w-6
                    rounded-full bg-black/55 text-white shadow-sm backdrop-blur transition hover:bg-black/70
                    cursor-pointer
                    ${item.progress === -1 ? 'flex' : 'flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}
                  `}
                  onClick={() => onRemove && onRemove(item._id)}
                >
                  <XClose className='h-3.5 w-3.5 text-white' />
                </div>
              )
            }
          </div>
        ))
      }
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

export default ImageList
