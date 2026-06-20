import { useCallback } from 'react'
import { RiLink, RiUploadCloud2Line } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { useFile } from './hooks'
import type { FileEntity, FileUpload } from './types'
import FileFromLinkOrLocal from './file-from-link-or-local'
import { FileContextProvider, useStore } from './store'
import FileInput from './file-input'
import FileItem from './file-item'
import Button from '@/app/components/base/button'
import cn from '@/utils/classnames'
import { TransferMethod } from '@/types/app'

interface Option {
  value: string
  label: string
  icon: JSX.Element
}

interface FileUploaderInAttachmentProps {
  fileConfig: FileUpload
  compact?: boolean
}

const FileUploaderInAttachment = ({
  fileConfig,
  compact = false,
}: FileUploaderInAttachmentProps) => {
  const { t } = useTranslation()
  const files = useStore(s => s.files)
  const { handleRemoveFile, handleReUploadFile } = useFile(fileConfig)
  const options = [
    {
      value: TransferMethod.local_file,
      label: t('common.fileUploader.uploadFromComputer'),
      icon: <RiUploadCloud2Line className='h-4 w-4' />,
    },
    {
      value: TransferMethod.remote_url,
      label: t('common.fileUploader.pasteFileLink'),
      icon: <RiLink className='h-4 w-4' />,
    },
  ]

  const renderButton = useCallback((option: Option, open?: boolean) => {
    if (compact && option.value === TransferMethod.local_file) {
      return (
        <div
          key={option.value}
          title='上传文件'
          aria-label='上传文件'
          className='relative grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-gray-500 transition hover:bg-black/[0.05]'
        >
          {option.icon}
          <FileInput fileConfig={fileConfig} />
        </div>
      )
    }

    return (
      <Button
        key={option.value}
        className={cn('relative grow', open && 'bg-components-button-tertiary-bg-hover')}
        disabled={!!(fileConfig.number_limits && files.length >= fileConfig.number_limits)}
      >
        {option.icon}
        <span className='ml-1'>{option.label}</span>
        {option.value === TransferMethod.local_file && <FileInput fileConfig={fileConfig} />}
      </Button>
    )
  }, [compact, fileConfig, files.length])

  const renderTrigger = useCallback((option: Option) => {
    return (open: boolean) => renderButton(option, open)
  }, [renderButton])

  const renderOption = useCallback((option: Option) => {
    if (option.value === TransferMethod.local_file && fileConfig.allowed_file_upload_methods?.includes(TransferMethod.local_file))
    { return renderButton(option) }

    if (option.value === TransferMethod.remote_url && fileConfig.allowed_file_upload_methods?.includes(TransferMethod.remote_url)) {
      return (
        <FileFromLinkOrLocal
          key={option.value}
          showFromLocal={false}
          trigger={renderTrigger(option)}
          fileConfig={fileConfig}
        />
      )
    }
  }, [fileConfig, renderButton, renderTrigger])

  return (
    <div className={compact ? 'relative min-h-8' : ''}>
      <div className={compact ? 'absolute left-0 top-0 flex items-center' : 'flex items-center space-x-1'}>
        {options.map(renderOption)}
      </div>
      <div className={compact ? 'space-y-1 pl-10' : 'mt-1 space-y-1'}>
        {files.map(file => (
          <FileItem
            key={file.id}
            file={file}
            showDeleteAction
            showDownloadAction={false}
            onRemove={() => handleRemoveFile(file.id)}
            onReUpload={() => handleReUploadFile(file.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface FileUploaderInAttachmentWrapperProps {
  value?: FileEntity[]
  onChange: (files: FileEntity[]) => void
  fileConfig: FileUpload
  compact?: boolean
}

const FileUploaderInAttachmentWrapper = ({
  value,
  onChange,
  fileConfig,
  compact,
}: FileUploaderInAttachmentWrapperProps) => {
  return (
    <FileContextProvider value={value} onChange={onChange}>
      <FileUploaderInAttachment fileConfig={fileConfig} compact={compact} />
    </FileContextProvider>
  )
}

export default FileUploaderInAttachmentWrapper
