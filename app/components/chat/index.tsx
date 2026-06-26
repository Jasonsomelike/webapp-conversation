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
  onShareMessage?: (item: ChatItem) => void | Promise<void>
  onDeleteMessage?: (item: ChatItem) => boolean | void | Promise<boolean | void>
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
  onShareMessage,
  onDeleteMessage,
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
  const [actionTarget, setActionTarget] = React.useState<ChatItem | null>(null)
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const [deletingMessageId, setDeletingMessageId] = React.useState('')
  const queryRef = useRef('')
  const textareaRef = useRef<any>(null)
  const longPressTimerRef = useRef<number | null>(null)

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

  const valid = () => {
    const draft = refreshDraftFromDom()
    if (!draft || draft.trim() === '') {
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
      url: fileItem.type === TransferMethod.local_file ? (fileItem.base64Url || fileItem.url) : fileItem.url,
      upload_file_id: fileItem.fileId,
    }))
    const docAndOtherFiles: VisionFile[] = getProcessedFiles(attachmentFiles)
    const combinedFiles: VisionFile[] = [...imageFiles, ...docAndOtherFiles]
    const message = refreshDraftFromDom()
    syncDraftValue(message)
    clearComposerImmediately()
    setIsSending(true)
    await Promise.resolve(onSend(message, combinedFiles)).catch(() => false)
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
    syncDraftValue(suggestion)
    void handleSend()
  }
  const canSendText = draftState.hasContent
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }
  useEffect(() => clearLongPressTimer, [])

  const openMessageActionMenu = (item: ChatItem) => {
    if (item.isOpeningStatement)
    { return }
    setConfirmingDelete(false)
    setActionTarget(item)
  }
  const actionHandlers = (item: ChatItem) => ({
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault()
      openMessageActionMenu(item)
    },
    onTouchStart: () => {
      clearLongPressTimer()
      longPressTimerRef.current = window.setTimeout(() => openMessageActionMenu(item), 520)
    },
    onTouchMove: clearLongPressTimer,
    onTouchEnd: clearLongPressTimer,
    onTouchCancel: clearLongPressTimer,
  })

  const handleActionShare = async () => {
    if (!actionTarget)
    { return }
    await onShareMessage?.(actionTarget)
    setActionTarget(null)
  }

  const handleActionDelete = async () => {
    if (!actionTarget)
    { return }
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setDeletingMessageId(actionTarget.id)
    try {
      await onDeleteMessage?.(actionTarget)
      setActionTarget(null)
    }
    finally {
      setDeletingMessageId('')
    }
  }

  return (
    <div className={cn(!feedbackDisabled && 'px-1 sm:px-3.5', 'flex h-full min-h-0 flex-col')}>
      {/* Chat List */}
      <div ref={scrollContainerRef} className="min-h-0 flex-1 space-y-[30px] overflow-x-hidden overflow-y-auto overscroll-contain pb-4 pt-2">
        {chatList.map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            return (
              <div key={item.id} {...actionHandlers(item)}>
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
            <div key={item.id} {...actionHandlers(item)}>
              <Question
                id={item.id}
                content={item.content}
                useCurrentUserAvatar={useCurrentUserAvatar}
                imgSrcs={(item.message_files && item.message_files?.length > 0) ? item.message_files.filter(file => file.type === 'image').map(item => item.url) : []}
              />
            </div>
          )
        })}
      </div>
      {actionTarget && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/20 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[1px] sm:items-center" onClick={() => setActionTarget(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_24px_70px_rgba(0,0,0,.22)]" onClick={event => event.stopPropagation()}>
            <div className="border-b border-black/5 px-5 py-4">
              <div className="text-sm font-semibold text-gray-900">消息操作</div>
              <div className="mt-1 line-clamp-2 break-words text-xs text-gray-500">
                {actionTarget.content || (actionTarget.message_files?.length ? '图片消息' : '空消息')}
              </div>
            </div>
            <button type="button" className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-800 active:bg-gray-50" onClick={() => void handleActionShare()}>
              分享
              <span className="text-xs text-gray-400">复制/系统分享</span>
            </button>
            {confirmingDelete && (
              <div className="border-t border-black/5 bg-red-50/70 px-5 py-3 text-xs leading-5 text-red-700">
                将删除这轮对话的提问、回答和引用记录。再次点击确认删除。
              </div>
            )}
            <button type="button" className="flex w-full items-center justify-between border-t border-black/5 px-5 py-4 text-left text-sm font-medium text-red-600 active:bg-red-50" disabled={deletingMessageId === actionTarget.id} onClick={() => void handleActionDelete()}>
              {confirmingDelete ? '确认删除' : '删除'}
              <span className="text-xs text-red-300">{deletingMessageId === actionTarget.id ? '删除中…' : '删除本轮'}</span>
            </button>
            <button type="button" className="w-full border-t border-black/5 px-5 py-4 text-center text-sm font-medium text-gray-500 active:bg-gray-50" onClick={() => {
              setConfirmingDelete(false)
              setActionTarget(null)
            }}>
              取消
            </button>
          </div>
        </div>
      )}
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
                      disabled={!canSendText || isResponding || isSending}
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
