'use client'
import type { FC, Ref } from 'react'
import React, { useEffect, useRef } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import Textarea from 'rc-textarea'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import s from './style.module.css'
import Answer from './answer'
import Question from './question'
import type { FeedbackFunc } from './type'
import type { ChatItem, VisionFile, VisionSettings } from '@/types/app'
import { TransferMethod } from '@/types/app'
import Tooltip from '@/app/components/base/tooltip'
import Toast from '@/app/components/base/toast'
import ImageList from '@/app/components/base/image-uploader/image-list'
import { useImageFiles } from '@/app/components/base/image-uploader/hooks'
import ChatImageUploader from '@/app/components/base/image-uploader/chat-image-uploader'
import FileUploaderInAttachmentWrapper from '@/app/components/base/file-uploader-in-attachment'
import type { FileEntity, FileUpload } from '@/app/components/base/file-uploader-in-attachment/types'
import { fileIsUploaded, getFileAppearanceType, getProcessedFiles } from '@/app/components/base/file-uploader-in-attachment/utils'
import FileTypeIcon from '@/app/components/base/file-uploader-in-attachment/file-type-icon'
import { toDifyAssetProxyUrl } from '@/lib/dify-assets'

type SendResult = boolean | void | Promise<boolean | void>

const ComposerFileCard: FC<{
  file: FileEntity
  onRemove: (fileId: string) => void
}> = ({ file, onRemove }) => {
  const uploading = file.progress >= 0 && !fileIsUploaded(file)
  const failed = file.progress === -1
  return (
    <div className="group relative flex h-[74px] w-[220px] shrink-0 items-center gap-3 rounded-2xl border border-black/10 bg-white px-3 shadow-sm">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-500/10">
        <FileTypeIcon type={getFileAppearanceType(file.name, file.type)} size="lg" className="text-blue-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--studio-ink)]" title={file.name}>{file.name}</div>
        <div className="mt-0.5 text-xs text-black/45">
          {failed ? '上传失败，请移除后重传' : uploading ? `上传中 ${file.progress}%` : '文件'}
        </div>
      </div>
      {uploading && (
        <div className="absolute inset-x-3 bottom-2 h-1 overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full bg-[var(--studio-deep)] transition-all" style={{ width: `${Math.max(8, Math.min(100, file.progress))}%` }} />
        </div>
      )}
      {failed && <div className="absolute inset-0 rounded-2xl border border-red-200 bg-red-50/55 pointer-events-none" />}
      <button
        type="button"
        aria-label="移除文件"
        onClick={() => onRemove(file.id)}
        className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black text-white shadow-sm transition hover:scale-105"
      >
        ×
      </button>
    </div>
  )
}

export interface IChatProps {
  chatList: ChatItem[]
  /**
   * Whether to display the editing area and rating status
   */
  feedbackDisabled?: boolean
  /**
   * Whether to display the input area
   */
  isHideSendInput?: boolean
  onFeedback?: FeedbackFunc
  onRetryMessage?: (item: ChatItem) => void | Promise<void>
  checkCanSend?: () => boolean
  onSend?: (message: string, files: VisionFile[]) => SendResult
  useCurrentUserAvatar?: boolean
  isResponding?: boolean
  controlClearQuery?: number
  visionConfig?: VisionSettings
  fileConfig?: FileUpload
  scrollContainerRef?: Ref<HTMLDivElement>
}

const Chat: FC<IChatProps> = ({
  chatList,
  feedbackDisabled = false,
  isHideSendInput = false,
  onFeedback,
  onRetryMessage,
  checkCanSend,
  onSend = () => { },
  useCurrentUserAvatar,
  isResponding,
  controlClearQuery,
  visionConfig,
  fileConfig,
  scrollContainerRef,
}) => {
  const { t } = useTranslation()
  const { notify } = Toast
  const isUseInputMethod = useRef(false)

  const [query, setQuery] = React.useState('')
  const [draftState, setDraftState] = React.useState({ hasContent: false, length: 0 })
  const [isSending, setIsSending] = React.useState(false)
  const queryRef = useRef('')
  const textareaRef = useRef<any>(null)

  const getDraftValue = () =>
    String(
      textareaRef.current?.resizableTextArea?.textArea?.value
      ?? textareaRef.current?.textArea?.value
      ?? queryRef.current
      ?? query
      ?? '',
    )

  const syncDraftValue = (value: string) => {
    setQuery(value)
    queryRef.current = value
    const length = value.trim().length
    setDraftState(previous =>
      previous.length === length && previous.hasContent === (length > 0)
        ? previous
        : { hasContent: length > 0, length },
    )
  }

  const setTextareaDomValue = (value: string) => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea
      ?? textareaRef.current?.textArea
      ?? null
    if (textarea && textarea.value !== value)
    { textarea.value = value }
  }

  const refreshDraftFromDom = () => {
    const draft = getDraftValue()
    syncDraftValue(draft)
    return draft
  }

  const clearComposerImmediately = () => {
    setTextareaDomValue('')
    syncDraftValue('')
    if (files.length)
    { onClear() }
    if (attachmentFiles.length)
    { setAttachmentFiles([]) }
  }

  const handleContentChange = (e: any) => {
    syncDraftValue(e.target.value)
  }

  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }

  const valid = (overrideMessage?: string, hasFiles = false) => {
    const draft = typeof overrideMessage === 'string' ? overrideMessage : refreshDraftFromDom()
    if ((!draft || draft.trim() === '') && !hasFiles) {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }
    return true
  }

  useEffect(() => {
    if (controlClearQuery) {
      syncDraftValue('')
    }
  }, [controlClearQuery])
  useEffect(() => {
    const prefill = sessionStorage.getItem('network-study-prefill-chat')
    if (!prefill)
    { return }
    syncDraftValue(prefill)
    sessionStorage.removeItem('network-study-prefill-chat')
  }, [])
  useEffect(() => {
    let boundTextarea: HTMLTextAreaElement | null = null
    const refresh = () => {
      const textarea = textareaRef.current?.resizableTextArea?.textArea
        ?? textareaRef.current?.textArea
        ?? null
      if (textarea && textarea !== boundTextarea) {
        if (boundTextarea) {
          boundTextarea.removeEventListener('input', refresh)
          boundTextarea.removeEventListener('change', refresh)
          boundTextarea.removeEventListener('keyup', refresh)
          boundTextarea.removeEventListener('compositionend', refresh)
          boundTextarea.removeEventListener('blur', refresh)
        }
        boundTextarea = textarea
        textarea.addEventListener('input', refresh)
        textarea.addEventListener('change', refresh)
        textarea.addEventListener('keyup', refresh)
        textarea.addEventListener('compositionend', refresh)
        textarea.addEventListener('blur', refresh)
      }
      if (textarea && textarea.value !== queryRef.current)
      { syncDraftValue(textarea.value) }
      else if (textarea)
      { syncDraftValue(textarea.value) }
    }
    const timer = window.setInterval(refresh, 250)
    refresh()
    return () => {
      window.clearInterval(timer)
      if (boundTextarea) {
        boundTextarea.removeEventListener('input', refresh)
        boundTextarea.removeEventListener('change', refresh)
        boundTextarea.removeEventListener('keyup', refresh)
        boundTextarea.removeEventListener('compositionend', refresh)
        boundTextarea.removeEventListener('blur', refresh)
      }
    }
  }, [])
  const {
    files,
    onRemove,
    onReUpload,
    onImageLinkLoadError,
    onImageLinkLoadSuccess,
    onClear,
    onPaste,
    onUpload,
  } = useImageFiles()

  const [attachmentFiles, setAttachmentFiles] = React.useState<FileEntity[]>([])
  const attachmentOnlyFileConfig = React.useMemo(() => {
    if (!fileConfig?.enabled)
    { return undefined }
    const allowedFileTypes = fileConfig.allowed_file_types?.filter(type => type !== 'image')
    if (fileConfig.allowed_file_types && !allowedFileTypes?.length)
    { return undefined }
    const allowedFileExtensions = fileConfig.allowed_file_extensions?.filter((ext) => {
      const normalized = ext.toLowerCase()
      return !['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].includes(normalized)
    })
    return {
      ...fileConfig,
      allowed_file_types: allowedFileTypes ?? fileConfig.allowed_file_types,
      allowed_file_extensions: allowedFileExtensions ?? fileConfig.allowed_file_extensions,
    }
  }, [fileConfig])

  const resolveImageUrl = (file: Partial<VisionFile>) => {
    const directUrl = file.url || file.preview_url || file.display_url || file.base64Url || file.base64_url || ''
    if (directUrl)
    { return directUrl }
    if (file.upload_file_id)
    { return toDifyAssetProxyUrl(`https://dify.jasonsome.cn:22380/files/${file.upload_file_id}/preview`) }
    return ''
  }

  const handleSend = async (overrideMessage?: string, options?: { skipExternalCheck?: boolean }) => {
    if (isSending || isResponding)
    { return }
    const message = typeof overrideMessage === 'string' ? overrideMessage : refreshDraftFromDom()
    const readyImageFiles = files.filter(file =>
      file.progress === 100
      && (file.type === TransferMethod.remote_url ? Boolean(file.url) : Boolean(file.fileId)),
    )
    const readyAttachmentFiles = attachmentFiles.filter(file => file.progress !== -1 && fileIsUploaded(file))
    const hasUploadedFiles = readyImageFiles.length > 0 || readyAttachmentFiles.length > 0
    if (!valid(message, hasUploadedFiles) || (!options?.skipExternalCheck && checkCanSend && !checkCanSend())) { return }
    const hasPendingImageUploads = files.some(file =>
      file.progress !== -1
      && (
        file.progress < 100
        || (file.type === TransferMethod.local_file && !file.fileId)
        || (file.type === TransferMethod.remote_url && !file.url)
      ),
    )
    const hasPendingAttachmentUploads = attachmentFiles.some(file => file.progress !== -1 && !fileIsUploaded(file))
    if (hasPendingImageUploads || hasPendingAttachmentUploads) {
      logError(t('app.errorMessage.waitForFileUpload'))
      return
    }
    const imageFiles: VisionFile[] = readyImageFiles.map(fileItem => ({
      id: fileItem.fileId || fileItem._id,
      name: fileItem.file?.name || '图片',
      filename: fileItem.file?.name || '图片',
      mime_type: fileItem.file?.type || 'image/*',
      size: fileItem.file?.size,
      type: 'image',
      transfer_method: fileItem.type,
      url: fileItem.url || '',
      preview_url: fileItem.url || '',
      display_url: fileItem.url || '',
      base64Url: fileItem.base64Url,
      upload_file_id: fileItem.fileId,
    }))
    const docAndOtherFiles: VisionFile[] = getProcessedFiles(readyAttachmentFiles)
    const combinedFiles: VisionFile[] = [...imageFiles, ...docAndOtherFiles]
    if (!combinedFiles.length && !message.trim()) {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return
    }
    const outboundMessage = message.trim() || (imageFiles.length ? '请分析这张图片。' : '请结合我上传的文件进行分析。')
    syncDraftValue(outboundMessage)
    clearComposerImmediately()
    setIsSending(true)
    await Promise.resolve(onSend(outboundMessage, combinedFiles)).catch(() => false)
    setIsSending(false)
  }

  const handleKeyUp = (e: any) => {
    if (e.nativeEvent.isComposing || isUseInputMethod.current)
    { return }
    if (e.code === 'Enter') {
      e.preventDefault()
      // prevent send message when using input method enter
      if (!e.shiftKey) { void handleSend() }
    }
  }

  const handleKeyDown = (e: any) => {
    isUseInputMethod.current = e.nativeEvent.isComposing
    if (e.nativeEvent.isComposing)
    { return }
    if (e.code === 'Enter' && !e.shiftKey) {
      const result = getDraftValue().replace(/\n$/, '')
      syncDraftValue(result)
      e.preventDefault()
    }
  }

  const suggestionClick = (suggestion: string) => {
    setTextareaDomValue(suggestion)
    syncDraftValue(suggestion)
    void handleSend(suggestion, { skipExternalCheck: true })
  }
  const canSendText = draftState.hasContent
  const hasReadyFiles = files.some(file => file.progress === 100)
    || attachmentFiles.some(file => file.progress !== -1 && fileIsUploaded(file))
  const canSend = canSendText || hasReadyFiles

  return (
    <div className={cn(!feedbackDisabled && 'px-1 sm:px-3.5', 'flex h-full min-h-0 flex-col')}>
      {/* Chat List */}
      <div ref={scrollContainerRef} className="min-h-0 flex-1 space-y-[30px] overflow-x-hidden overflow-y-auto overscroll-contain pb-4 pt-2">
        {chatList.map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            return (
              <div key={item.id}>
                <Answer
                  item={item}
                  feedbackDisabled={feedbackDisabled}
                  onFeedback={onFeedback}
                  isResponding={isResponding && isLast}
                  suggestionClick={suggestionClick}
                  onRetry={onRetryMessage}
                />
              </div>
            )
          }
          return (
            <div key={item.id}>
              <Question
                id={item.id}
                content={item.content}
                useCurrentUserAvatar={useCurrentUserAvatar}
                imgSrcs={(item.message_files && item.message_files?.length > 0)
                  ? item.message_files
                    .filter(file => file.type === 'image')
                    .map(file => resolveImageUrl(file))
                    .filter(Boolean)
                  : []}
                files={(item.message_files || []).filter(file => file.type !== 'image')}
              />
            </div>
          )
        })}
      </div>
      {
        !isHideSendInput && (
          <div className='z-10 mx-auto w-full max-w-[720px] shrink-0 bg-gradient-to-t from-[var(--studio-chat-surface)] via-[var(--studio-chat-surface)] to-transparent px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-4 sm:pt-3'>
            <div className='chat-composer max-h-[230px] overflow-y-auto rounded-[22px] border border-[#17342b]/15 bg-white px-2.5 py-2 shadow-[0_14px_36px_rgba(35,55,47,.13)]'>
              {(files.length > 0 || attachmentFiles.length > 0) && (
                <div className="mb-2 flex max-w-full items-center gap-2 overflow-x-auto px-1 pb-1">
                  {visionConfig?.enabled && files.length > 0 && (
                    <ImageList
                      list={files}
                      composer
                      onRemove={onRemove}
                      onReUpload={onReUpload}
                      onImageLinkLoadSuccess={onImageLinkLoadSuccess}
                      onImageLinkLoadError={onImageLinkLoadError}
                    />
                  )}
                  {attachmentFiles.map(file => (
                    <ComposerFileCard
                      key={file.id}
                      file={file}
                      onRemove={fileId => setAttachmentFiles(current => current.filter(item => item.id !== fileId))}
                    />
                  ))}
                </div>
              )}
              <div className="flex min-h-10 items-end gap-1">
                {visionConfig?.enabled && (
                  <div className="shrink-0">
                    <ChatImageUploader
                      settings={{
                        ...visionConfig,
                        transfer_methods: visionConfig.transfer_methods?.length
                          ? visionConfig.transfer_methods
                          : [TransferMethod.local_file],
                      }}
                      onUpload={onUpload}
                      disabled={isResponding || isSending || files.length >= (visionConfig.number_limits || 5)}
                    />
                  </div>
                )}
                {attachmentOnlyFileConfig?.enabled && (
                  <div className="shrink-0">
                    <FileUploaderInAttachmentWrapper
                      fileConfig={attachmentOnlyFileConfig}
                      value={attachmentFiles}
                      onChange={setAttachmentFiles}
                      compact
                      hidePreview
                    />
                  </div>
                )}
                <Textarea
                  ref={textareaRef}
                  className="block min-w-0 flex-1 appearance-none resize-none bg-transparent px-1.5 py-2 text-[15px] leading-5 text-[var(--studio-ink)] outline-none"
                  placeholder="发消息…"
                  value={query}
                  onChange={handleContentChange}
                  onInput={handleContentChange}
                  onCompositionStart={() => {
                    isUseInputMethod.current = true
                  }}
                  onCompositionUpdate={(event: any) => {
                    queryRef.current = event.currentTarget.value
                  }}
                  onCompositionEnd={(event: any) => {
                    isUseInputMethod.current = false
                    syncDraftValue(event.currentTarget.value)
                  }}
                  onKeyUp={handleKeyUp}
                  onKeyDown={handleKeyDown}
                  onPaste={event => onPaste(event, visionConfig?.number_limits || 5)}
                  autoSize
                />
                <div className="flex h-9 shrink-0 items-center gap-1">
                  {canSendText && <div className={`${s.count} rounded-full bg-gray-50 px-1.5 text-[10px] leading-5 text-gray-400`}>{draftState.length}</div>}
                  <Tooltip
                    selector='send-tip'
                    htmlContent={
                      <div>
                        <div>{t('common.operation.send')} Enter</div>
                        <div>{t('common.operation.lineBreak')} Shift Enter</div>
                      </div>
                    }
                  >
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={!canSend || isResponding || isSending}
                      className="grid h-9 w-9 place-items-center rounded-full bg-[var(--studio-deep)] text-white shadow-sm transition active:scale-95 disabled:bg-black/10 disabled:text-black/25"
                      aria-label="发送消息"
                    >
                      <PaperAirplaneIcon className="h-4 w-4 -rotate-45 translate-x-px" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  )
}

export default React.memo(Chat)
