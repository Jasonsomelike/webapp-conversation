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
import FileUploaderInAttachmentWrapper from '@/app/components/base/file-uploader-in-attachment'
import type { FileEntity, FileUpload } from '@/app/components/base/file-uploader-in-attachment/types'
import { getProcessedFiles } from '@/app/components/base/file-uploader-in-attachment/utils'

type SendResult = boolean | void | Promise<boolean | void>

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
  const [isSending, setIsSending] = React.useState(false)
  const queryRef = useRef('')

  const handleContentChange = (e: any) => {
    const value = e.target.value
    setQuery(value)
    queryRef.current = value
  }

  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }

  const valid = () => {
    const query = queryRef.current
    if (!query || query.trim() === '') {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }
    return true
  }

  useEffect(() => {
    if (controlClearQuery) {
      setQuery('')
      queryRef.current = ''
    }
  }, [controlClearQuery])
  useEffect(() => {
    const prefill = sessionStorage.getItem('network-study-prefill-chat')
    if (!prefill)
    { return }
    setQuery(prefill)
    queryRef.current = prefill
    sessionStorage.removeItem('network-study-prefill-chat')
  }, [])
  const {
    files,
    onRemove,
    onReUpload,
    onImageLinkLoadError,
    onImageLinkLoadSuccess,
    onClear,
    onPaste,
  } = useImageFiles()

  const [attachmentFiles, setAttachmentFiles] = React.useState<FileEntity[]>([])

  const handleSend = async () => {
    if (isSending || isResponding)
    { return }
    if (!valid() || (checkCanSend && !checkCanSend())) { return }
    const hasPendingImageUploads = files.some(file => file.progress !== -1 && file.progress < 100)
    const hasPendingAttachmentUploads = attachmentFiles.some(file => file.progress !== -1 && file.progress < 100)
    if (hasPendingImageUploads || hasPendingAttachmentUploads) {
      logError(t('app.errorMessage.waitForFileUpload'))
      return
    }
    const imageFiles: VisionFile[] = files.filter(file => file.progress !== -1).map(fileItem => ({
      type: 'image',
      transfer_method: fileItem.type,
      url: fileItem.url,
      upload_file_id: fileItem.fileId,
    }))
    const docAndOtherFiles: VisionFile[] = getProcessedFiles(attachmentFiles)
    const combinedFiles: VisionFile[] = [...imageFiles, ...docAndOtherFiles]
    const message = queryRef.current
    setIsSending(true)
    const accepted = await Promise.resolve(onSend(message, combinedFiles)).catch(() => false)
    setIsSending(false)
    if (accepted === false)
    { return }
    if (!files.find(item => item.type === TransferMethod.local_file && !item.fileId)) {
      if (files.length) { onClear() }
      setQuery('')
      queryRef.current = ''
    }
    if (!attachmentFiles.find(item => item.transferMethod === TransferMethod.local_file && !item.uploadedId)) { setAttachmentFiles([]) }
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
      const result = query.replace(/\n$/, '')
      setQuery(result)
      queryRef.current = result
      e.preventDefault()
    }
  }

  const suggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    queryRef.current = suggestion
    void handleSend()
  }

  return (
    <div className={cn(!feedbackDisabled && 'px-1 sm:px-3.5', 'flex h-full min-h-0 flex-col')}>
      {/* Chat List */}
      <div ref={scrollContainerRef} className="min-h-0 flex-1 space-y-[30px] overflow-y-auto overscroll-contain pb-4 pt-2">
        {chatList.map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            return <Answer
              key={item.id}
              item={item}
              feedbackDisabled={feedbackDisabled}
              onFeedback={onFeedback}
              isResponding={isResponding && isLast}
              suggestionClick={suggestionClick}
            />
          }
          return (
            <Question
              key={item.id}
              id={item.id}
              content={item.content}
              useCurrentUserAvatar={useCurrentUserAvatar}
              imgSrcs={(item.message_files && item.message_files?.length > 0) ? item.message_files.map(item => item.url) : []}
            />
          )
        })}
      </div>
      {
        !isHideSendInput && (
          <div className='z-10 mx-auto w-full max-w-[720px] shrink-0 bg-gradient-to-t from-[var(--studio-chat-surface)] via-[var(--studio-chat-surface)] to-transparent px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-4 sm:pt-3'>
            <div className='chat-composer max-h-[160px] overflow-y-auto rounded-[22px] border border-[#17342b]/15 bg-white px-2.5 py-2 shadow-[0_14px_36px_rgba(35,55,47,.13)]'>
              {visionConfig?.enabled && files.length > 0 && (
                <div className='mb-1 pl-10'>
                  <ImageList
                    list={files}
                    onRemove={onRemove}
                    onReUpload={onReUpload}
                    onImageLinkLoadSuccess={onImageLinkLoadSuccess}
                    onImageLinkLoadError={onImageLinkLoadError}
                  />
                </div>
              )}
              <div className="flex min-h-10 items-end gap-1">
                {fileConfig?.enabled && (
                  <div className="shrink-0">
                    <FileUploaderInAttachmentWrapper
                      fileConfig={fileConfig}
                      value={attachmentFiles}
                      onChange={setAttachmentFiles}
                      compact
                    />
                  </div>
                )}
                <Textarea
                  className="block min-w-0 flex-1 appearance-none resize-none bg-transparent px-1.5 py-2 text-[15px] leading-5 text-[var(--studio-ink)] outline-none"
                  placeholder="发消息…"
                  value={query}
                  onChange={handleContentChange}
                  onCompositionStart={() => {
                    isUseInputMethod.current = true
                  }}
                  onCompositionEnd={(event: any) => {
                    isUseInputMethod.current = false
                    const value = event.currentTarget.value
                    setQuery(value)
                    queryRef.current = value
                  }}
                  onKeyUp={handleKeyUp}
                  onKeyDown={handleKeyDown}
                  onPaste={event => onPaste(event, visionConfig?.number_limits || 5)}
                  autoSize
                />
                <div className="flex h-9 shrink-0 items-center gap-1">
                  {query.trim().length > 0 && <div className={`${s.count} rounded-full bg-gray-50 px-1.5 text-[10px] leading-5 text-gray-400`}>{query.trim().length}</div>}
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
                      disabled={!query.trim() || isResponding || isSending}
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
