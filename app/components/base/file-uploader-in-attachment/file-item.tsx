import {
  memo,
  useState,
} from 'react'
import {
  RiDeleteBinLine,
  RiDownloadLine,
  RiEyeLine,
} from '@remixicon/react'
import FileTypeIcon from './file-type-icon'
import FileImageRender from './file-image-render'
import type { FileEntity } from './types'
import {
  downloadFile,
  fileIsUploaded,
  getFileAppearanceType,
  getFileExtension,
} from './utils'
import { SupportUploadFileTypes } from './types'
import ActionButton from '@/app/components/base/action-button'
import ProgressCircle from '@/app/components/base/progress-bar/progress-circle'
import { formatFileSize } from '@/utils/format'
import cn from '@/utils/classnames'
import ReplayLine from '@/app/components/base/icons/other/ReplayLine'
import ImagePreview from '@/app/components/base/image-uploader/image-preview'

interface FileInAttachmentItemProps {
  file: FileEntity
  showDeleteAction?: boolean
  showDownloadAction?: boolean
  onRemove?: (fileId: string) => void
  onReUpload?: (fileId: string) => void
  canPreview?: boolean
  compact?: boolean
}
const FileInAttachmentItem = ({
  file,
  showDeleteAction,
  showDownloadAction = true,
  onRemove,
  onReUpload,
  canPreview,
  compact,
}: FileInAttachmentItemProps) => {
  const { id, name, type, progress, supportFileType, base64Url, url, isRemote } = file
  const ext = getFileExtension(name, type, isRemote)
  const isImageFile = supportFileType === SupportUploadFileTypes.image
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  if (compact) {
    return (
      <>
        <div className={cn(
          'group relative flex h-28 w-28 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-black/[0.035] p-2 text-center shadow-sm sm:h-32 sm:w-32',
          progress === -1 && 'border-state-destructive-border bg-state-destructive-hover',
        )}>
          {isImageFile
            ? (
              <FileImageRender
                className='absolute inset-0 h-full w-full object-cover'
                imageUrl={base64Url || url || ''}
              />
            )
            : (
              <>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm">
                  <FileTypeIcon
                    type={getFileAppearanceType(name, type)}
                    size='lg'
                  />
                </div>
                <div className='mt-2 line-clamp-2 max-w-full break-all px-1 text-[11px] font-semibold leading-4 text-text-secondary' title={name}>
                  {name}
                </div>
                {ext && <div className='mt-1 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase text-text-tertiary shadow-sm'>{ext}</div>}
              </>
            )}
          {progress >= 0 && !fileIsUploaded(file) && (
            <div className='absolute inset-0 z-10 grid place-items-center bg-black/35 text-white'>
              <ProgressCircle percentage={progress} />
            </div>
          )}
          {progress === -1 && (
            <button
              type="button"
              className='absolute inset-0 z-10 grid place-items-center bg-black/35 text-white'
              onClick={() => onReUpload?.(id)}
            >
              <ReplayLine className='h-5 w-5' />
            </button>
          )}
          {showDeleteAction && (
            <button
              type="button"
              aria-label="移除文件"
              className='absolute right-1 top-1 z-20 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur transition hover:bg-black/70 sm:opacity-0 sm:group-hover:opacity-100'
              onClick={() => onRemove?.(id)}
            >
              ×
            </button>
          )}
        </div>
        {
          imagePreviewUrl && canPreview && (
            <ImagePreview
              url={imagePreviewUrl}
              onCancel={() => setImagePreviewUrl('')}
            />
          )
        }
      </>
    )
  }
  return (
    <>
      <div className={cn(
        'flex h-12 items-center rounded-lg border-[0.5px] border-components-panel-border bg-components-panel-on-panel-item-bg pr-3 shadow-xs',
        progress === -1 && 'border-state-destructive-border bg-state-destructive-hover',
      )}>
        <div className='flex h-12 w-12 items-center justify-center'>
          {
            isImageFile && (
              <FileImageRender
                className='h-8 w-8'
                imageUrl={base64Url || url || ''}
              />
            )
          }
          {
            !isImageFile && (
              <FileTypeIcon
                type={getFileAppearanceType(name, type)}
                size='lg'
              />
            )
          }
        </div>
        <div className='mr-1 w-0 grow'>
          <div
            className='system-xs-medium mb-0.5 flex items-center truncate text-text-secondary'
            title={file.name}
          >
            <div className='truncate'>{name}</div>
          </div>
          <div className='system-2xs-medium-uppercase flex items-center text-text-tertiary'>
            {
              ext && (
                <span>{ext.toLowerCase()}</span>
              )
            }
            {
              ext && (
                <span className='system-2xs-medium mx-1'>•</span>
              )
            }
            {
              !!file.size && (
                <span>{formatFileSize(file.size)}</span>
              )
            }
          </div>
        </div>
        <div className='flex shrink-0 items-center'>
          {
            progress >= 0 && !fileIsUploaded(file) && (
              <ProgressCircle
                className='mr-2.5'
                percentage={progress}
              />
            )
          }
          {
            progress === -1 && (
              <ActionButton
                className='mr-1'
                onClick={() => onReUpload?.(id)}
              >
                <ReplayLine className='h-4 w-4 text-text-tertiary' />
              </ActionButton>
            )
          }
          {
            showDeleteAction && (
              <ActionButton onClick={() => onRemove?.(id)}>
                <RiDeleteBinLine className='h-4 w-4' />
              </ActionButton>
            )
          }
          {
            canPreview && isImageFile && (
              <ActionButton className='mr-1' onClick={() => setImagePreviewUrl(url || '')}>
                <RiEyeLine className='h-4 w-4' />
              </ActionButton>
            )
          }
          {
            showDownloadAction && (
              <ActionButton onClick={(e) => {
                e.stopPropagation()
                downloadFile(url || base64Url || '', name)
              }}>
                <RiDownloadLine className='h-4 w-4' />
              </ActionButton>
            )
          }
        </div>
      </div>
      {
        imagePreviewUrl && canPreview && (
          <ImagePreview
            url={imagePreviewUrl}
            onCancel={() => setImagePreviewUrl('')}
          />
        )
      }
    </>
  )
}

export default memo(FileInAttachmentItem)
