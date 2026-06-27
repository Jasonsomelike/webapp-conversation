'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import produce from 'immer'
import { useGetState } from 'ahooks'
import { ChevronLeftIcon, ShareIcon } from '@heroicons/react/24/outline'
import useConversation from '@/hooks/use-conversation'
import Toast from '@/app/components/base/toast'
import Sidebar from '@/app/components/sidebar'
import MobileConversationList from '@/app/components/sidebar/mobile-conversation-list'
import ConfigSence from '@/app/components/config-scence'
import { deleteConversation as deleteConversationRequest, fetchAppParams, fetchChatList, fetchConversations, generationConversationName, sendChatMessage, updateFeedback } from '@/service'
import type { ChatItem, ConversationItem, Feedbacktype, PromptConfig, VisionFile, VisionSettings } from '@/types/app'
import type { FileUpload } from '@/app/components/base/file-uploader-in-attachment/types'
import { Resolution, TransferMethod, WorkflowRunningStatus } from '@/types/app'
import Chat from '@/app/components/chat'
import { getChatRuntime, useChatRuntime } from '@/app/components/chat/runtime-store'
import { setLocaleOnClient } from '@/i18n/client'
import useBreakpoints, { MediaType } from '@/hooks/use-breakpoints'
import Loading from '@/app/components/base/loading'
import { replaceVarWithValues, userInputsFormToPromptVariables } from '@/utils/prompt'
import AppUnavailable from '@/app/components/app-unavailable'
import { APP_ID, APP_INFO, isShowPrompt, promptTemplate } from '@/config'
import type { Annotation as AnnotationType } from '@/types/log'
import { addFileInfos, sortAgentSorts } from '@/utils/tools'
import ConversationShareDialog from '@/app/components/chat/conversation-share-dialog'

export interface IMainProps {
  params: any
}

const cloneChatItem = (item: ChatItem): ChatItem => {
  if (typeof globalThis.structuredClone === 'function')
  { return globalThis.structuredClone(item) }
  return JSON.parse(JSON.stringify(item)) as ChatItem
}

const toMessageText = (value: unknown) => {
  if (typeof value === 'string') {
    if (value === '[object Object]')
    { return '' }
    return value
  }
  if (value == null)
  { return '' }
  if (typeof value === 'object') {
    console.warn('[chat] non-string message payload ignored', value)
    const record = value as Record<string, unknown>
    const candidate = record.answer || record.content || record.text || record.message || record.query
    return typeof candidate === 'string' ? candidate : ''
  }
  return String(value)
}

const normalizeExchangeMessageId = (id: string) =>
  id.replace(/^question-/, '').replace(/^answer-placeholder-/, '').trim()

const isDataUrl = (value?: string) => Boolean(value && /^data:/i.test(value))

const sanitizeUserFileForPersist = (file: VisionFile): VisionFile => {
  const stableUrl = [file.url, file.preview_url, file.display_url]
    .find(value => value && !isDataUrl(value)) || ''
  return {
    id: file.id,
    name: file.name,
    filename: file.filename,
    mime_type: file.mime_type,
    size: file.size,
    type: file.type,
    transfer_method: file.transfer_method,
    url: stableUrl,
    preview_url: stableUrl,
    display_url: stableUrl,
    upload_file_id: file.upload_file_id,
    belongs_to: 'user',
  }
}

const sanitizeFileForDify = (file: VisionFile) => {
  const payload: Record<string, string> = {
    type: file.type,
    transfer_method: file.transfer_method,
    upload_file_id: file.upload_file_id,
  }
  if (file.transfer_method === TransferMethod.remote_url) {
    const remoteUrl = [file.url, file.preview_url, file.display_url]
      .find(value => value && !isDataUrl(value)) || ''
    payload.url = remoteUrl
  }
  else {
    payload.url = ''
  }
  return payload
}

interface SourceReturnState {
  href?: string
  y?: number
  at?: number
  messageId?: string
  conversationId?: string
  anchorDelta?: number
}

const readSourceReturnState = (): SourceReturnState | null => {
  if (typeof window === 'undefined')
  { return null }
  try {
    const raw = sessionStorage.getItem('network-study-source-return')
    if (!raw)
    { return null }
    const state = JSON.parse(raw) as SourceReturnState
    if (!state.at || Date.now() - Number(state.at) > 10 * 60 * 1000) {
      sessionStorage.removeItem('network-study-source-return')
      return null
    }
    return state
  }
  catch {
    sessionStorage.removeItem('network-study-source-return')
    return null
  }
}

interface PendingGenerationState {
  startedAt: number
  conversationId?: string
  query?: string
}

interface ConversationShareTarget {
  conversationId: string
  title: string
  chatList: ChatItem[]
}

const pendingGenerationKey = 'network-study-pending-generation'

const readPendingGenerationState = (): PendingGenerationState | null => {
  if (typeof window === 'undefined')
  { return null }
  try {
    const raw = sessionStorage.getItem(pendingGenerationKey)
    if (!raw)
    { return null }
    const state = JSON.parse(raw) as PendingGenerationState
    if (!state.startedAt || Date.now() - Number(state.startedAt) > 30 * 60 * 1000) {
      sessionStorage.removeItem(pendingGenerationKey)
      return null
    }
    return state
  }
  catch {
    sessionStorage.removeItem(pendingGenerationKey)
    return null
  }
}

const writePendingGenerationState = (state: PendingGenerationState) => {
  if (typeof window === 'undefined')
  { return }
  sessionStorage.setItem(pendingGenerationKey, JSON.stringify(state))
}

const clearPendingGenerationState = () => {
  if (typeof window === 'undefined')
  { return }
  sessionStorage.removeItem(pendingGenerationKey)
}

const Main: FC<IMainProps> = () => {
  const { t } = useTranslation()
  const media = useBreakpoints()
  const isMobile = media === MediaType.mobile
  const hasSetAppConfig = Boolean(APP_ID)

  /*
  * app info
  */
  const [appUnavailable, setAppUnavailable] = useState<boolean>(false)
  const [isUnknownReason, setIsUnknownReason] = useState<boolean>(false)
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null)
  const [inited, setInited] = useState<boolean>(false)
  const [targetMessageId, setTargetMessageId] = useState('')
  const targetConversationIdRef = useRef('')
  const highlightedMessageRef = useRef('')
  const prefillOpenHandledRef = useRef(false)
  const [showMobileConversationList, setShowMobileConversationList] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareTarget, setShareTarget] = useState<ConversationShareTarget | null>(null)
  const [showJumpToBottom, setShowJumpToBottom] = useState(false)

  useEffect(() => {
    const detail = isMobile && !showMobileConversationList
    globalThis.dispatchEvent(new CustomEvent('network-study-chat-detail', { detail: { detail } }))
    window.NetworkStudyApp?.setConversationMode?.(detail)
    return () => {
      globalThis.dispatchEvent(new CustomEvent('network-study-chat-detail', { detail: { detail: false } }))
      window.NetworkStudyApp?.setConversationMode?.(false)
    }
  }, [isMobile, showMobileConversationList])
  const [visionConfig, setVisionConfig] = useState<VisionSettings | undefined>({
    enabled: false,
    number_limits: 2,
    detail: Resolution.low,
    transfer_methods: [TransferMethod.local_file],
  })
  const [fileConfig, setFileConfig] = useState<FileUpload | undefined>()

  useEffect(() => {
    if (APP_INFO?.title) { document.title = `${APP_INFO.title} · 知行网络学堂` }
  }, [APP_INFO?.title])

  /*
  * conversation info
  */
  const {
    conversationList,
    setConversationList,
    currConversationId,
    getCurrConversationId,
    setCurrConversationId,
    getConversationIdFromStorage,
    isNewConversation,
    currConversationInfo,
    currInputs,
    newConversationInputs,
    resetNewConversationInputs,
    setCurrInputs,
    setNewConversationInfo,
    setExistConversationInfo,
  } = useConversation()

  const [conversationIdChangeBecauseOfNew, setConversationIdChangeBecauseOfNew, getConversationIdChangeBecauseOfNew] = useGetState(false)
  const isChatStarted = useChatRuntime(state => state.isChatStarted)
  const setRuntimeChatStarted = useChatRuntime(state => state.setIsChatStarted)
  const setChatStarted = () => setRuntimeChatStarted(true)
  const setChatNotStarted = () => setRuntimeChatStarted(false)
  const handleStartChat = (inputs: Record<string, any>) => {
    createNewChat()
    setConversationIdChangeBecauseOfNew(true)
    setCurrInputs(inputs)
    setChatStarted()
    // parse variables in introduction
    setChatList(generateNewChatListWithOpenStatement('', inputs))
  }
  const hasSetInputs = (() => {
    if (!isNewConversation) { return true }

    return isChatStarted
  })()

  const conversationName = currConversationInfo?.name || t('app.chat.newChatDefaultName') as string
  const conversationIntroduction = currConversationInfo?.introduction || ''
  const suggestedQuestions = currConversationInfo?.suggested_questions || []

  useEffect(() => {
    ;(window as any).__NETWORK_STUDY_CURRENT_CONVERSATION_ID = currConversationId
    return () => {
      if ((window as any).__NETWORK_STUDY_CURRENT_CONVERSATION_ID === currConversationId)
      { delete (window as any).__NETWORK_STUDY_CURRENT_CONVERSATION_ID }
    }
  }, [currConversationId])

  const buildChatListFromMessages = (
    messages: any[],
    introduction?: string,
    inputs?: Record<string, any> | null,
  ) => {
    const newChatList: ChatItem[] = generateNewChatListWithOpenStatement(introduction, inputs)
    messages.forEach((item: any) => {
      const query = toMessageText(item.query)
      const answer = toMessageText(item.answer)
      newChatList.push({
        id: `question-${item.id}`,
        content: query,
        isAnswer: false,
        message_files: item.message_files?.filter((file: any) => file.belongs_to === 'user') || [],

      })
      newChatList.push({
        id: item.id,
        content: answer,
        agent_thoughts: addFileInfos(item.agent_thoughts ? sortAgentSorts(item.agent_thoughts) : item.agent_thoughts, item.message_files),
        feedback: item.feedback,
        isAnswer: true,
        message_files: item.message_files?.filter((file: any) => file.belongs_to === 'assistant') || [],
        workflowProcess: item.workflowProcess,
      })
    })
    return newChatList
  }

  const handleConversationSwitch = () => {
    if (!inited) { return }

    // update inputs of current conversation
    let notSyncToStateIntroduction = ''
    let notSyncToStateInputs: Record<string, any> | undefined | null = {}
    if (!isNewConversation) {
      const item = conversationList.find(item => item.id === currConversationId)
      notSyncToStateInputs = item?.inputs || {}
      setCurrInputs(notSyncToStateInputs as any)
      notSyncToStateIntroduction = item?.introduction || ''
      setExistConversationInfo({
        name: item?.name || '',
        introduction: notSyncToStateIntroduction,
        suggested_questions: suggestedQuestions,
      })
    }
    else {
      notSyncToStateInputs = newConversationInputs
      setCurrInputs(notSyncToStateInputs)
    }

    // update chat list of current conversation
    if (!isNewConversation && !conversationIdChangeBecauseOfNew && !isResponding) {
      setChatList(generateNewChatListWithOpenStatement(notSyncToStateIntroduction, notSyncToStateInputs))
      fetchChatList(currConversationId).then((res: any) => {
        const { data } = res
        setChatList(buildChatListFromMessages(data, notSyncToStateIntroduction, notSyncToStateInputs))
      }).catch((error) => {
        console.warn('[chat] failed to switch conversation', { conversationId: currConversationId, error })
        Toast.notify({ type: 'error', message: '加载对话失败，请稍后重试' })
      })
    }

    if (isNewConversation && isChatStarted && getChatRuntime().chatList.length === 0)
    { setChatList(generateNewChatListWithOpenStatement()) }
  }
  useEffect(handleConversationSwitch, [currConversationId, inited])

  const handleConversationIdChange = (id: string) => {
    nativeChatEnteredScrollKeyRef.current = ''
    userPausedFollowRef.current = false
    followOutputRef.current = true
    autoFollowGraceUntilRef.current = Date.now() + 800
    pendingScrollToBottomRef.current = id !== '-1'
    setTargetMessageId('')
    targetConversationIdRef.current = ''
    if (id === '-1') {
      createNewChat()
      setConversationIdChangeBecauseOfNew(true)
    }
    else {
      setConversationIdChangeBecauseOfNew(false)
    }
    // trigger handleConversationSwitch
    setCurrConversationId(id, APP_ID)
    setShowMobileConversationList(false)
  }

  useEffect(() => {
    if (!inited || prefillOpenHandledRef.current)
    { return }
    const shouldOpen = sessionStorage.getItem('network-study-open-chat-detail') === '1'
    const prefill = sessionStorage.getItem('network-study-prefill-chat')
    if (!shouldOpen || !prefill)
    { return }
    prefillOpenHandledRef.current = true
    sessionStorage.removeItem('network-study-open-chat-detail')
    handleConversationIdChange('-1')
  }, [inited])

  /*
  * chat info. chat is under conversation.
  */
  const chatList = useChatRuntime(state => state.chatList)
  const setChatList = useChatRuntime(state => state.setChatList)
  const getChatList = () => getChatRuntime().chatList
  const chatListDomRef = useRef<HTMLDivElement>(null)
  const followOutputRef = useRef(true)
  const userPausedFollowRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const touchYRef = useRef<number | null>(null)
  const userScrollIntentUntilRef = useRef(0)
  const autoFollowGraceUntilRef = useRef(0)
  const lastDistanceToBottomRef = useRef(0)
  const pendingScrollToBottomRef = useRef(false)
  const autoScrollTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)
  const nativeChatEnteredScrollKeyRef = useRef('')
  const scrollToChatBottom = (behavior: ScrollBehavior = 'smooth') => {
    const scrollParent = findScrollParent(chatListDomRef.current)
    if (!scrollParent)
    { return }
    userPausedFollowRef.current = false
    followOutputRef.current = true
    userScrollIntentUntilRef.current = 0
    autoFollowGraceUntilRef.current = Date.now() + 1200
    setShowJumpToBottom(false)
    scrollParent.scrollTo({ top: scrollParent.scrollHeight, behavior })
    lastScrollTopRef.current = scrollParent.scrollTop
    lastDistanceToBottomRef.current = scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight
  }

  const findScrollParent = (element: HTMLElement | null) => {
    if (element) {
      const elementStyle = globalThis.getComputedStyle(element)
      if (/(auto|scroll)/.test(elementStyle.overflowY))
      { return element }
    }
    let current = element?.parentElement || null
    while (current) {
      const style = globalThis.getComputedStyle(current)
      if (/(auto|scroll)/.test(style.overflowY))
      { return current }
      current = current.parentElement
    }
    return null
  }

  useEffect(() => {
    const handleNativeBack = (event: Event) => {
      const action = (event as CustomEvent<{ action?: string }>).detail?.action
      if (action !== 'chat-list')
      { return }
      sessionStorage.removeItem('network-study-open-chat-detail')
      targetConversationIdRef.current = ''
      setTargetMessageId('')
      pendingScrollToBottomRef.current = false
      followOutputRef.current = false
      userPausedFollowRef.current = false
      setShowJumpToBottom(false)
      setShowMobileConversationList(true)
      window.NetworkStudyApp?.setConversationMode?.(false)
      globalThis.dispatchEvent(new CustomEvent('network-study-chat-detail', { detail: { detail: false } }))
    }
    globalThis.addEventListener('network-study-native-back', handleNativeBack)
    return () => globalThis.removeEventListener('network-study-native-back', handleNativeBack)
  }, [])

  useEffect(() => {
    const handleChatEntered = () => {
      if (targetMessageId)
      { return }
      const currentKey = currConversationId || '-1'
      if (nativeChatEnteredScrollKeyRef.current === currentKey)
      { return }
      nativeChatEnteredScrollKeyRef.current = currentKey
      pendingScrollToBottomRef.current = false
      userPausedFollowRef.current = false
      followOutputRef.current = true
      setShowJumpToBottom(false)
      scrollToChatBottom('auto')
    }
    globalThis.addEventListener('network-study-chat-entered', handleChatEntered)
    return () => globalThis.removeEventListener('network-study-chat-entered', handleChatEntered)
  }, [currConversationId, targetMessageId])

  useEffect(() => {
    const scrollParent = findScrollParent(chatListDomRef.current)
    if (!scrollParent)
    { return }

    const pauseFollowing = () => {
      userPausedFollowRef.current = true
      followOutputRef.current = false
      autoFollowGraceUntilRef.current = 0
      setShowJumpToBottom(true)
      if (autoScrollTimerRef.current) {
        globalThis.clearTimeout(autoScrollTimerRef.current)
        autoScrollTimerRef.current = null
      }
    }

    const markUserScrollIntent = () => {
      userScrollIntentUntilRef.current = Date.now() + 3500
    }

    const isMainChatScrollTarget = (target: EventTarget | null) =>
      target instanceof Node
      && scrollParent.contains(target)
      && !(target instanceof Element && target.closest('.chat-composer'))

    const handleScroll = () => {
      const currentTop = scrollParent.scrollTop
      const distanceToBottom = scrollParent.scrollHeight - currentTop - scrollParent.clientHeight
      const movedUp = currentTop < lastScrollTopRef.current - 1
      const nearBottom = distanceToBottom < 56
      const userIntentActive = Date.now() < userScrollIntentUntilRef.current
      lastDistanceToBottomRef.current = distanceToBottom
      if ((movedUp || userIntentActive) && !nearBottom)
      { pauseFollowing() }
      else if (nearBottom) {
        userPausedFollowRef.current = false
        followOutputRef.current = true
        setShowJumpToBottom(false)
      }
      lastScrollTopRef.current = currentTop
    }
    const handleWheel = (event: WheelEvent) => {
      if (!isMainChatScrollTarget(event.target))
      { return }
      markUserScrollIntent()
      if (event.deltaY < 0)
      { pauseFollowing() }
    }
    const handleTouchStart = (event: TouchEvent) => {
      if (!isMainChatScrollTarget(event.target))
      { return }
      markUserScrollIntent()
      touchYRef.current = event.touches[0]?.clientY ?? null
    }
    const handleTouchMove = (event: TouchEvent) => {
      if (!isMainChatScrollTarget(event.target))
      { return }
      markUserScrollIntent()
      const currentY = event.touches[0]?.clientY
      if (currentY !== undefined && touchYRef.current !== null && currentY > touchYRef.current + 3)
      { pauseFollowing() }
      touchYRef.current = currentY ?? null
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
      { return }
      if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) || (event.key === ' ' && event.shiftKey)) {
        markUserScrollIntent()
        pauseFollowing()
      }
      else if (['ArrowDown', 'PageDown', 'End', ' '].includes(event.key))
      { markUserScrollIntent() }
    }
    scrollParent.addEventListener('scroll', handleScroll, { passive: true })
    globalThis.addEventListener('wheel', handleWheel, { passive: true, capture: true })
    globalThis.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true })
    globalThis.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true })
    globalThis.addEventListener('keydown', handleKeyDown, { capture: true })
    lastScrollTopRef.current = scrollParent.scrollTop
    handleScroll()
    return () => {
      scrollParent.removeEventListener('scroll', handleScroll)
      globalThis.removeEventListener('wheel', handleWheel, { capture: true })
      globalThis.removeEventListener('touchstart', handleTouchStart, { capture: true })
      globalThis.removeEventListener('touchmove', handleTouchMove, { capture: true })
      globalThis.removeEventListener('keydown', handleKeyDown, { capture: true })
      if (autoScrollTimerRef.current) {
        globalThis.clearTimeout(autoScrollTimerRef.current)
        autoScrollTimerRef.current = null
      }
    }
  }, [currConversationId])

  useEffect(() => {
    if (!followOutputRef.current || userPausedFollowRef.current)
    { return }
    const now = Date.now()
    const hasRecentUserScrollIntent = now < userScrollIntentUntilRef.current
    const canFollow = lastDistanceToBottomRef.current < 180 || now < autoFollowGraceUntilRef.current
    if (hasRecentUserScrollIntent || !canFollow)
    { return }
    autoScrollTimerRef.current = globalThis.setTimeout(() => {
      autoScrollTimerRef.current = null
      if (!followOutputRef.current || userPausedFollowRef.current)
      { return }
      const scrollParent = findScrollParent(chatListDomRef.current)
      if (scrollParent) {
        if (Date.now() < userScrollIntentUntilRef.current)
        { return }
        scrollParent.scrollTop = scrollParent.scrollHeight
        lastScrollTopRef.current = scrollParent.scrollTop
        lastDistanceToBottomRef.current = scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight
        setShowJumpToBottom(false)
      }
    }, 50)
    return () => {
      if (autoScrollTimerRef.current) {
        globalThis.clearTimeout(autoScrollTimerRef.current)
        autoScrollTimerRef.current = null
      }
    }
  }, [chatList, currConversationId])

  useEffect(() => {
    if (
      !targetMessageId
      || targetConversationIdRef.current !== currConversationId
      || highlightedMessageRef.current === targetMessageId
    )
    { return }

    followOutputRef.current = false
    let highlightedElement: HTMLElement | null = null
    let highlightTimer: ReturnType<typeof globalThis.setTimeout> | undefined
    const settleTimers: Array<ReturnType<typeof globalThis.setTimeout>> = []
    let resizeObserver: ResizeObserver | undefined
    const scrollTimer = globalThis.setTimeout(() => {
      const element = document.getElementById(`message-${targetMessageId}`)
      if (!element)
      { return }
      const scrollParent = findScrollParent(chatListDomRef.current)
      if (!scrollParent)
      { return }

      highlightedElement = element
      highlightedMessageRef.current = targetMessageId
      const alignMessage = (behavior: ScrollBehavior = 'auto') => {
        const parentRect = scrollParent.getBoundingClientRect()
        const elementRect = element.getBoundingClientRect()
        const topPadding = 14
        const nextTop = scrollParent.scrollTop + elementRect.top - parentRect.top - topPadding
        scrollParent.scrollTo({
          top: Math.max(0, nextTop),
          behavior,
        })
        lastScrollTopRef.current = Math.max(0, nextTop)
      }
      alignMessage('smooth')
      ;[240, 700, 1400].forEach(delay => settleTimers.push(globalThis.setTimeout(() => alignMessage(), delay)))
      resizeObserver = new ResizeObserver(() => alignMessage())
      resizeObserver.observe(element)
      element.classList.add('message-highlight')
      highlightTimer = globalThis.setTimeout(() => {
        resizeObserver?.disconnect()
        element.classList.remove('message-highlight')
        setTargetMessageId('')
        const url = new URL(globalThis.location.href)
        url.searchParams.delete('messageId')
        globalThis.history.replaceState({}, '', `${url.pathname}${url.search}`)
      }, 3000)
    }, 250)

    return () => {
      globalThis.clearTimeout(scrollTimer)
      settleTimers.forEach(timer => globalThis.clearTimeout(timer))
      resizeObserver?.disconnect()
      if (highlightTimer)
      { globalThis.clearTimeout(highlightTimer) }
      highlightedElement?.classList.remove('message-highlight')
    }
  }, [chatList, currConversationId, targetMessageId])

  useEffect(() => {
    const state = readSourceReturnState()
    if (!state)
    { return }
    const currentHref = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`
    const currentPath = globalThis.location.pathname
    const conversationMatches = !state.conversationId || state.conversationId === currConversationId
    const hrefMatches = state.href === currentHref || (currentPath === '/chat' && conversationMatches)
    if (!hrefMatches)
    { return }
    if (state.conversationId && state.conversationId !== currConversationId) {
      const exists = conversationList.some(item => item.id === state.conversationId)
      if (exists) {
        pendingScrollToBottomRef.current = false
        followOutputRef.current = false
        userPausedFollowRef.current = true
        setShowMobileConversationList(false)
        setCurrConversationId(state.conversationId, APP_ID, false)
      }
      return
    }
    const scrollParent = findScrollParent(chatListDomRef.current)
    if (!scrollParent)
    { return }
    pendingScrollToBottomRef.current = false
    followOutputRef.current = false
    userPausedFollowRef.current = true
    autoFollowGraceUntilRef.current = 0
    userScrollIntentUntilRef.current = Date.now() + 4000
    setShowMobileConversationList(false)
    if (state.messageId) {
      targetConversationIdRef.current = currConversationId
      setTargetMessageId(state.messageId)
    }
    const restore = () => {
      const targetElement = state.messageId
        ? document.getElementById(`message-${state.messageId}`)
        : null
      if (targetElement && typeof state.anchorDelta === 'number') {
        const parentRect = scrollParent.getBoundingClientRect()
        const elementRect = targetElement.getBoundingClientRect()
        const nextTop = scrollParent.scrollTop + elementRect.top - parentRect.top - state.anchorDelta
        scrollParent.scrollTo({ top: Math.max(0, nextTop), behavior: 'auto' })
      }
      else {
        scrollParent.scrollTo({ top: Math.max(0, Number(state.y || 0)), behavior: 'auto' })
      }
      lastScrollTopRef.current = scrollParent.scrollTop
      lastDistanceToBottomRef.current = scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight
    }
    restore()
    const timers = [120, 420, 900, 1600].map(delay => globalThis.setTimeout(restore, delay))
    const cleanupTimer = globalThis.setTimeout(() => {
      sessionStorage.removeItem('network-study-source-return')
    }, 1800)
    return () => {
      timers.forEach(timer => globalThis.clearTimeout(timer))
      globalThis.clearTimeout(cleanupTimer)
    }
  }, [chatList, currConversationId])

  useEffect(() => {
    if (!pendingScrollToBottomRef.current || targetMessageId)
    { return }
    pendingScrollToBottomRef.current = false
    scrollToChatBottom('auto')
  }, [chatList, currConversationId, targetMessageId])
  // user can not edit inputs if user had send message
  const canEditInputs = !chatList.some(item => item.isAnswer === false) && isNewConversation
  const createNewChat = () => {
    // if new chat is already exist, do not create new chat
    if (conversationList.some(item => item.id === '-1')) { return }

    setConversationList(produce(conversationList, (draft) => {
      draft.unshift({
        id: '-1',
        name: t('app.chat.newChatDefaultName'),
        inputs: newConversationInputs,
        introduction: conversationIntroduction,
        suggested_questions: suggestedQuestions,
      })
    }))
  }

  // sometime introduction is not applied to state
  const generateNewChatListWithOpenStatement = (introduction?: string, inputs?: Record<string, any> | null) => {
    let calculatedIntroduction = introduction || conversationIntroduction || ''
    const calculatedPromptVariables = inputs || currInputs || null
    if (calculatedIntroduction && calculatedPromptVariables) { calculatedIntroduction = replaceVarWithValues(calculatedIntroduction, promptConfig?.prompt_variables || [], calculatedPromptVariables) }

    const openStatement = {
      id: `${Date.now()}`,
      content: calculatedIntroduction,
      isAnswer: true,
      feedbackDisabled: true,
      isOpeningStatement: isShowPrompt,
      suggestedQuestions,
    }
    if (calculatedIntroduction) { return [openStatement] }

    return []
  }

  // init
  useEffect(() => {
    if (!hasSetAppConfig) {
      setAppUnavailable(true)
      return
    }
    (async () => {
      try {
        const [conversationData, appParams] = await Promise.all([fetchConversations(), fetchAppParams()])
        // handle current conversation id
        const { data: conversations, error } = conversationData as { data: ConversationItem[], error: string }
        if (error) {
          Toast.notify({ type: 'error', message: error })
          throw new Error(error)
          return
        }
        const urlParams = new URLSearchParams(globalThis.location.search)
        const sourceReturnState = readSourceReturnState()
        const requestedConversationId = urlParams.get('conversationId') || urlParams.get('conversation') || sourceReturnState?.conversationId || ''
        const requestedMessageId = urlParams.get('messageId') || sourceReturnState?.messageId || ''
        const requestedConversation = conversations.find(item => item.id === requestedConversationId)
        const _conversationId = requestedConversation?.id || getConversationIdFromStorage(APP_ID)
        const currentConversation = conversations.find(item => item.id === _conversationId)
        const isNotNewConversation = !!currentConversation
        if (requestedConversation) {
          targetConversationIdRef.current = requestedConversation.id
          setTargetMessageId(requestedMessageId)
          followOutputRef.current = !requestedMessageId
          userPausedFollowRef.current = Boolean(requestedMessageId)
          pendingScrollToBottomRef.current = false
          setShowMobileConversationList(false)
        }

        // fetch new conversation info
        const { user_input_form, opening_statement: introduction, file_upload, system_parameters, suggested_questions = [] }: any = appParams
        setLocaleOnClient(APP_INFO.default_language, true)
        setNewConversationInfo({
          name: t('app.chat.newChatDefaultName'),
          introduction,
          suggested_questions,
        })
        if (isNotNewConversation) {
          setExistConversationInfo({
            name: currentConversation.name || t('app.chat.newChatDefaultName'),
            introduction,
            suggested_questions,
          })
        }
        const prompt_variables = userInputsFormToPromptVariables(user_input_form)
        setPromptConfig({
          prompt_template: promptTemplate,
          prompt_variables,
        } as PromptConfig)
        const outerFileUploadEnabled = !!file_upload?.enabled
        setVisionConfig({
          ...file_upload?.image,
          enabled: !!(outerFileUploadEnabled && file_upload?.image?.enabled),
          image_file_size_limit: system_parameters?.image_file_size_limit || 10,
        })
        setFileConfig({
          enabled: outerFileUploadEnabled,
          allowed_file_types: file_upload?.allowed_file_types,
          allowed_file_extensions: file_upload?.allowed_file_extensions,
          allowed_file_upload_methods: file_upload?.allowed_file_upload_methods,
          number_limits: file_upload?.number_limits,
          fileUploadConfig: file_upload?.fileUploadConfig,
        })
        setConversationList(conversations as ConversationItem[])

        if (isNotNewConversation) { setCurrConversationId(_conversationId, APP_ID, false) }

        setInited(true)
      }
      catch (e: any) {
        if (e.status === 404) {
          setAppUnavailable(true)
        }
        else {
          setIsUnknownReason(true)
          setAppUnavailable(true)
        }
      }
    })()
  }, [])

  const isResponding = useChatRuntime(state => state.isResponding)
  const setRuntimeResponding = useChatRuntime(state => state.setIsResponding)
  const setRespondingTrue = () => setRuntimeResponding(true)
  const setRespondingFalse = () => setRuntimeResponding(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const { notify } = Toast
  const logError = (message: string) => {
    notify({ type: 'error', message })
  }

  useEffect(() => {
    window.NetworkStudyApp?.setChatGenerationActive?.(
      isResponding,
      currConversationId && currConversationId !== '-1' ? currConversationId : '',
    )
  }, [isResponding, currConversationId])

  useEffect(() => {
    return () => {
      window.NetworkStudyApp?.setChatGenerationActive?.(false, '')
    }
  }, [])

  const checkCanSend = () => {
    if (currConversationId !== '-1') { return true }

    if (!currInputs || !promptConfig?.prompt_variables) { return true }

    let emptyRequiredInput = false
    promptConfig.prompt_variables.forEach((item) => {
      if (item.required && !currInputs[item.key])
      { emptyRequiredInput = true }
    })

    if (emptyRequiredInput) {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }
    return true
  }

  const [controlFocus, setControlFocus] = useState(0)
  const [openingSuggestedQuestions, setOpeningSuggestedQuestions] = useState<string[]>([])
  const [messageTaskId, setMessageTaskId] = useState('')
  const [hasStopResponded, setHasStopResponded, getHasStopResponded] = useGetState(false)
  const [isRespondingConIsCurrCon, setIsRespondingConCurrCon, getIsRespondingConIsCurrCon] = useGetState(true)
  const [userQuery, setUserQuery] = useState('')

  const handleDeleteConversation = async (conversationId: string) => {
    if (conversationId === currConversationId && isResponding) {
      notify({ type: 'warning', message: '当前对话仍在生成，请完成后再删除' })
      return
    }

    try {
      await deleteConversationRequest(conversationId)
      const remaining = conversationList.filter(item => item.id !== conversationId)
      if (conversationId !== currConversationId) {
        setConversationList(remaining)
        notify({ type: 'success', message: '对话已删除' })
        return
      }

      let nextList = remaining
      let nextId = remaining.find(item => item.id !== '-1')?.id || '-1'
      if (!nextList.length) {
        nextList = [{
          id: '-1',
          name: t('app.chat.newChatDefaultName'),
          inputs: newConversationInputs,
          introduction: conversationIntroduction,
          suggested_questions: suggestedQuestions,
        }]
        nextId = '-1'
      }

      setConversationList(nextList)
      setConversationIdChangeBecauseOfNew(nextId === '-1')
      setChatNotStarted()
      userPausedFollowRef.current = false
      followOutputRef.current = true
      setChatList(nextId === '-1' ? generateNewChatListWithOpenStatement() : [])
      setCurrConversationId(nextId, APP_ID)
      notify({ type: 'success', message: '对话已删除' })
    }
    catch {
      notify({ type: 'error', message: '删除对话失败，请稍后重试' })
    }
  }

  const openCurrentConversationShare = () => {
    if (!currConversationId || currConversationId === '-1') {
      notify({ type: 'warning', message: '请先创建并发送一轮对话后再分享' })
      return
    }
    setShareTarget({
      conversationId: currConversationId,
      title: conversationName,
      chatList: getChatList(),
    })
    setShareOpen(true)
  }

  const handleShareConversation = async (conversation: ConversationItem) => {
    if (!conversation.id || conversation.id === '-1') {
      notify({ type: 'warning', message: '这个对话暂不能分享' })
      return
    }
    if (conversation.id === currConversationId) {
      openCurrentConversationShare()
      return
    }
    try {
      const result = await fetchChatList(conversation.id)
      const messages = Array.isArray((result as any)?.data) ? (result as any).data : []
      setShareTarget({
        conversationId: conversation.id,
        title: conversation.name || '网络学习会话',
        chatList: buildChatListFromMessages(messages, conversation.introduction, conversation.inputs),
      })
      setShareOpen(true)
    }
    catch (error) {
      console.warn('[chat] failed to load conversation for sharing', { conversationId: conversation.id, error })
      notify({ type: 'error', message: '加载对话内容失败，暂时无法分享' })
    }
  }

  const markCurrentGenerationInterrupted = (message = '生成可能在后台中断。可点击重试，或稍后刷新当前会话。') => {
    setChatList(produce(getChatList(), (draft) => {
      const lastAnswer = [...draft].reverse().find(item => item.isAnswer && !item.isOpeningStatement)
      if (!lastAnswer)
      { return }
      const hasContent = Boolean(toMessageText(lastAnswer.content).trim())
      if (!hasContent)
      { lastAnswer.content = message }
      ;(lastAnswer as any).isError = true
    }))
  }

  const recoverPendingGeneratedConversation = async (reason: 'resume' | 'manual') => {
    const pending = readPendingGenerationState()
    if (!pending)
    { return false }

    try {
      const conversationsResult = await fetchConversations()
      const refreshedConversations = Array.isArray((conversationsResult as any)?.data)
        ? (conversationsResult as any).data as ConversationItem[]
        : []
      if (!refreshedConversations.length)
      { return false }

      setConversationList(refreshedConversations)
      const startedAt = Number(pending.startedAt || 0)
      const recentCutoff = startedAt > 0 ? startedAt - 2 * 60 * 1000 : 0
      const explicitConversation = pending.conversationId
        ? refreshedConversations.find(item => item.id === pending.conversationId)
        : undefined
      const recentConversation = refreshedConversations.find((item) => {
        const updatedAt = item.updatedAt ? new Date(item.updatedAt).getTime() : 0
        return updatedAt >= recentCutoff
      })
      const targetConversation = explicitConversation || recentConversation
      if (!targetConversation?.id)
      { return false }

      const messagesResult = await fetchChatList(targetConversation.id)
      const messages = Array.isArray((messagesResult as any)?.data) ? (messagesResult as any).data : []
      setConversationIdChangeBecauseOfNew(false)
      setShowMobileConversationList(false)
      setCurrConversationId(targetConversation.id, APP_ID, true)
      setIsRespondingConCurrCon(true)
      setRespondingFalse()
      if (messages.length > 0) {
        setChatList(buildChatListFromMessages(messages, targetConversation.introduction, targetConversation.inputs))
        pendingScrollToBottomRef.current = true
        clearPendingGenerationState()
        return true
      }

      markCurrentGenerationInterrupted('后台生成尚未同步完成，请稍后刷新或点击重试。')
      return false
    }
    catch (error) {
      console.warn('[chat] failed to recover pending generated conversation', { reason, error })
      return false
    }
  }

  const refreshCurrentConversationMessages = async (reason: 'resume' | 'manual' = 'manual') => {
    const currentId = getCurrConversationId()
    if (!currentId || currentId === '-1') {
      const recovered = await recoverPendingGeneratedConversation(reason)
      if (recovered)
      { return true }
      setRespondingFalse()
      setIsRespondingConCurrCon(true)
      return false
    }

    try {
      const [messagesResult, conversationsResult] = await Promise.all([
        fetchChatList(currentId),
        fetchConversations().catch((error) => {
          console.warn('[chat] failed to refresh conversations during recovery', error)
          return null
        }),
      ])
      const refreshedConversations = Array.isArray((conversationsResult as any)?.data)
        ? (conversationsResult as any).data as ConversationItem[]
        : null
      if (refreshedConversations)
      { setConversationList(refreshedConversations) }

      const activeConversation = (refreshedConversations || conversationList).find(item => item.id === currentId)
      const activeInputs = activeConversation?.inputs ?? currInputs
      const activeIntroduction = activeConversation?.introduction ?? currConversationInfo?.introduction ?? conversationIntroduction
      const messages = Array.isArray((messagesResult as any)?.data) ? (messagesResult as any).data : []
      if (messages.length > 0) {
        setChatList(buildChatListFromMessages(messages, activeIntroduction, activeInputs))
        setConversationIdChangeBecauseOfNew(false)
        clearPendingGenerationState()
      }
      else if (getChatList().some(item => !item.isAnswer && !item.isOpeningStatement)) {
        markCurrentGenerationInterrupted()
      }
      else {
        setChatList(buildChatListFromMessages([], activeIntroduction, activeInputs))
      }
      setIsRespondingConCurrCon(true)
      setRespondingFalse()
      return true
    }
    catch (error) {
      console.warn('[chat] failed to recover current conversation', { reason, conversationId: currentId, error })
      setRespondingFalse()
      setIsRespondingConCurrCon(true)
      markCurrentGenerationInterrupted()
      if (reason === 'manual')
      { notify({ type: 'error', message: '刷新当前会话失败，请稍后重试' }) }
      return false
    }
  }

  const handleRetryMessage = async (item: ChatItem) => {
    const list = getChatList()
    const answerIndex = list.findIndex(message => message.id === item.id)
    const normalizedId = normalizeExchangeMessageId(item.id)
    const explicitQuestionIndex = list.findIndex(message => !message.isAnswer && normalizeExchangeMessageId(message.id) === normalizedId)
    const questionIndex = explicitQuestionIndex >= 0
      ? explicitQuestionIndex
      : (() => {
        for (let index = answerIndex - 1; index >= 0; index -= 1) {
          if (!list[index].isAnswer && !list[index].isOpeningStatement)
          { return index }
        }
        return -1
      })()
    const question = questionIndex >= 0 ? list[questionIndex] : null
    if (!question) {
      notify({ type: 'warning', message: '未找到可重试的问题' })
      return
    }
    const retryFiles = (question.message_files || []) as VisionFile[]
    setChatList(list.filter((_, index) => index !== answerIndex && index !== questionIndex))
    await handleSend(toMessageText(question.content), retryFiles)
  }

  useEffect(() => {
    let pauseStartedAt = 0
    let pausedDuringResponse = false
    const recoverIfNeeded = () => {
      const currentId = getCurrConversationId()
      const hasPendingResponse = getChatRuntime().isResponding || pausedDuringResponse || Boolean(readPendingGenerationState())
      const recentlyPaused = pauseStartedAt > 0 && Date.now() - pauseStartedAt < 10 * 60 * 1000
      if (!hasPendingResponse && !recentlyPaused)
      { return }
      if (!currentId && !readPendingGenerationState())
      { return }
      pausedDuringResponse = false
      pauseStartedAt = 0
      void refreshCurrentConversationMessages('resume')
    }
    const handleLifecycle = (event: Event) => {
      const state = (event as CustomEvent<{ state?: string }>).detail?.state
      if (state === 'pause') {
        pauseStartedAt = Date.now()
        pausedDuringResponse = getChatRuntime().isResponding
        return
      }
      if (state === 'resume')
      { recoverIfNeeded() }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pauseStartedAt = Date.now()
        pausedDuringResponse = getChatRuntime().isResponding
        return
      }
      if (document.visibilityState === 'visible')
      { recoverIfNeeded() }
    }
    globalThis.addEventListener('network-study-app-lifecycle', handleLifecycle)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      globalThis.removeEventListener('network-study-app-lifecycle', handleLifecycle)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [conversationList, currInputs, currConversationInfo, conversationIntroduction])

  const updateCurrentQA = ({
    responseItem,
    questionId,
    questionTempId,
    placeholderAnswerId,
    questionItem,
    responseTempId,
  }: {
    responseItem: ChatItem
    questionId: string
    questionTempId?: string
    placeholderAnswerId: string
    questionItem: ChatItem
    responseTempId?: string
  }) => {
    // closesure new list is outdated.
    const newListWithAnswer = produce(
      getChatList().filter(item =>
        item.id !== responseItem.id
        && item.id !== questionId
        && item.id !== questionTempId
        && item.id !== placeholderAnswerId
        && item.id !== responseTempId),
      (draft) => {
        draft.push({ ...questionItem })
        draft.push(cloneChatItem(responseItem))
      },
    )
    setChatList(newListWithAnswer)
  }

  const transformToServerFile = (fileItem: any) => {
    return {
      type: 'image',
      transfer_method: fileItem.transferMethod,
      url: fileItem.url,
      upload_file_id: fileItem.id,
    }
  }

  const loadSupplementalContext = async (files: VisionFile[] = []) => {
    const localUploadIds = files
      .map(file => file.upload_file_id)
      .filter(id => id?.startsWith('localdoc_'))
    const memoryUrl = new URL('/api/memory', globalThis.location.origin)
    if (!isNewConversation && currConversationId)
    { memoryUrl.searchParams.set('excludeConversationId', currConversationId) }

    const [memoryResult, fileResult] = await Promise.all([
      fetch(memoryUrl, { credentials: 'include' })
        .then(response => response.ok ? response.json() : { context: '' })
        .catch(() => ({ context: '' })),
      localUploadIds.length
        ? fetch('/api/uploads/context', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadIds: localUploadIds }),
        }).then(response => response.ok ? response.json() : { context: '' }).catch(() => ({ context: '' }))
        : Promise.resolve({ context: '' }),
    ])
    return {
      memoryContext: String(memoryResult.context || ''),
      fileContext: String(fileResult.context || ''),
    }
  }
  const handleSend = async (message: string, files?: VisionFile[]) => {
    if (isResponding) {
      notify({ type: 'info', message: t('app.errorMessage.waitForResponse') })
      return false
    }
    const toServerInputs: Record<string, any> = {}
    if (currInputs) {
      Object.keys(currInputs).forEach((key) => {
        const value = currInputs[key]
        if (value.supportFileType) { toServerInputs[key] = transformToServerFile(value) }

        else if (value[0]?.supportFileType) { toServerInputs[key] = value.map((item: any) => transformToServerFile(item)) }

        else { toServerInputs[key] = value }
      })
    }

    const messageText = toMessageText(message)
    const generationStartedAt = Date.now()
    writePendingGenerationState({
      startedAt: generationStartedAt,
      conversationId: currConversationId && currConversationId !== '-1' ? currConversationId : undefined,
      query: messageText,
    })
    const questionVisibleFiles = (files || []).map(file => ({
      ...file,
      belongs_to: 'user',
    }))
    const userVisibleFiles = (files || []).map(sanitizeUserFileForPersist)
    const supplementalContext = await loadSupplementalContext(files || [])
    const data: Record<string, any> = {
      inputs: toServerInputs,
      query: messageText,
      conversation_id: isNewConversation ? null : currConversationId,
      memory_context: supplementalContext.memoryContext,
      file_context: supplementalContext.fileContext,
      userFiles: userVisibleFiles,
    }

    if (files && files?.length > 0) {
      data.files = files.map(sanitizeFileForDify)
    }

    // question
    const questionTempId = `question-${Date.now()}`
    let questionId = questionTempId
    const questionItem: ChatItem = {
      id: questionId,
      content: messageText,
      isAnswer: false,
      message_files: questionVisibleFiles,
    }

    const placeholderAnswerId = `answer-placeholder-${Date.now()}`
    const placeholderAnswerItem = {
      id: placeholderAnswerId,
      content: '',
      isAnswer: true,
    }

    const newList = [...getChatList(), questionItem, placeholderAnswerItem]
    setChatList(newList)

    let isAgentMode = false

    // answer
    const responseItem: ChatItem = {
      id: `${Date.now()}`,
      content: '',
      agent_thoughts: [],
      message_files: [],
      isAnswer: true,
    }
    userPausedFollowRef.current = false
    followOutputRef.current = true
    userScrollIntentUntilRef.current = 0
    autoFollowGraceUntilRef.current = Date.now() + 1200
    lastDistanceToBottomRef.current = 0
    const responseTempId = responseItem.id
    let hasSetResponseId = false

    const prevTempNewConversationId = getCurrConversationId() || '-1'
    let tempNewConversationId = ''
    let expectedConversationId = prevTempNewConversationId
    let optimisticConversation: ConversationItem | undefined
    const isStillStreamingCurrentConversation = () => {
      const currentId = getCurrConversationId()
      return currentId === prevTempNewConversationId || currentId === expectedConversationId || (!!tempNewConversationId && currentId === tempNewConversationId)
    }
    const ensureOptimisticConversation = (conversationId: string) => {
      if (!conversationId || conversationId === '-1')
      { return }
      expectedConversationId = conversationId
      tempNewConversationId = conversationId
      writePendingGenerationState({
        startedAt: generationStartedAt,
        conversationId,
        query: messageText,
      })
      const now = new Date().toISOString()
      optimisticConversation = {
        id: conversationId,
        name: messageText.slice(0, 42) || t('app.chat.newChatDefaultName'),
        inputs: currInputs || null,
        introduction: conversationIntroduction,
        suggested_questions: suggestedQuestions,
        preview: '刚刚创建 · 生成中',
        updatedAt: now,
      }
      setConversationList(produce(conversationList, (draft) => {
        const existing = draft.find(item => item.id === conversationId)
        if (existing) {
          existing.preview = optimisticConversation?.preview
          existing.updatedAt = now
          return
        }
        const tempIndex = draft.findIndex(item => item.id === '-1')
        if (tempIndex >= 0)
        { draft[tempIndex] = optimisticConversation! }
        else
        { draft.unshift(optimisticConversation!) }
      }))
      if (getCurrConversationId() === prevTempNewConversationId)
      { setCurrConversationId(conversationId, APP_ID, true) }
      setConversationIdChangeBecauseOfNew(false)
    }

    setRespondingTrue()
    window.NetworkStudyApp?.setChatGenerationActive?.(
      true,
      currConversationId && currConversationId !== '-1' ? currConversationId : '',
    )
    return await sendChatMessage(data, {
      getAbortController: (abortController) => {
        setAbortController(abortController)
      },
      onData: (message: string, isFirstMessage: boolean, { conversationId: newConversationId, messageId, taskId }: any) => {
        const chunk = toMessageText(message)
        if (!isAgentMode) {
          responseItem.content = responseItem.content + chunk
        }
        else {
          const lastThought = responseItem.agent_thoughts?.[responseItem.agent_thoughts?.length - 1]
          if (lastThought) { lastThought.thought = toMessageText(lastThought.thought) + chunk }
        }
        if (messageId && !hasSetResponseId) {
          responseItem.id = messageId
          questionId = `question-${messageId}`
          questionItem.id = questionId
          hasSetResponseId = true
        }

        if (isFirstMessage && newConversationId) { ensureOptimisticConversation(newConversationId) }

        setMessageTaskId(taskId)
        // has switched to other conversation
        if (!isStillStreamingCurrentConversation()) {
          setIsRespondingConCurrCon(false)
          return
        }
        updateCurrentQA({
          responseItem,
          questionId,
          questionTempId,
          placeholderAnswerId,
          questionItem,
          responseTempId,
        })
      },
      async onCompleted(hasError?: boolean) {
        try {
          if (!hasError) {
            clearPendingGenerationState()
            const { data: allConversations }: any = await fetchConversations()
            const mergedConversations: ConversationItem[] = [...allConversations]
            if (tempNewConversationId && optimisticConversation && !mergedConversations.some(item => item.id === tempNewConversationId))
            { mergedConversations.unshift({ ...optimisticConversation, preview: '刚刚创建 · 点击继续本次对话' }) }
            if (tempNewConversationId) {
              const newConversation = mergedConversations.find((item: any) => item.id === tempNewConversationId)
              if (newConversation?.id) {
                try {
                  const newItem: any = await generationConversationName(newConversation.id)
                  const target = mergedConversations.find((item: any) => item.id === newConversation.id)
                  if (target && newItem?.name)
                  { target.name = newItem.name }
                }
                catch (error) {
                  console.warn('[chat] failed to generate conversation name', { conversationId: newConversation.id, error })
                }
              }
            }
            setConversationList(mergedConversations)
          }
        }
        catch (error) {
          console.warn('Failed to refresh the completed conversation metadata.', error)
        }
        finally {
          setConversationIdChangeBecauseOfNew(false)
          resetNewConversationInputs()
          setChatNotStarted()
          if (tempNewConversationId) {
            setCurrConversationId(tempNewConversationId, APP_ID, true)
          }
          setRespondingFalse()
        }
      },
      onFile(file) {
        const lastThought = responseItem.agent_thoughts?.[responseItem.agent_thoughts?.length - 1]
        if (lastThought) { lastThought.message_files = [...((lastThought as any).message_files || []), { ...file }] }
        responseItem.message_files = [...(responseItem.message_files || []), { ...file }]

        updateCurrentQA({
          responseItem,
          questionId,
          questionTempId,
          placeholderAnswerId,
          questionItem,
          responseTempId,
        })
      },
      onThought(thought) {
        isAgentMode = true
        const response = responseItem as any
        if (thought.message_id && !hasSetResponseId) {
          response.id = thought.message_id
          questionId = `question-${thought.message_id}`
          questionItem.id = questionId
          hasSetResponseId = true
        }
        // responseItem.id = thought.message_id;
        if (response.agent_thoughts.length === 0) {
          response.agent_thoughts.push(thought)
        }
        else {
          const lastThought = response.agent_thoughts[response.agent_thoughts.length - 1]
          // thought changed but still the same thought, so update.
          if (lastThought.id === thought.id) {
            thought.thought = lastThought.thought
            thought.message_files = lastThought.message_files
            responseItem.agent_thoughts![response.agent_thoughts.length - 1] = thought
          }
          else {
            responseItem.agent_thoughts!.push(thought)
          }
        }
        // has switched to other conversation
        if (!isStillStreamingCurrentConversation()) {
          setIsRespondingConCurrCon(false)
          return false
        }

        updateCurrentQA({
          responseItem,
          questionId,
          questionTempId,
          placeholderAnswerId,
          questionItem,
          responseTempId,
        })
      },
      onMessageEnd: (messageEnd) => {
        const citations = messageEnd.metadata?.retriever_resources || []
        if (citations.length)
        { responseItem.citation = citations }
        if (messageEnd.metadata?.annotation_reply) {
          responseItem.id = messageEnd.id
          questionId = `question-${messageEnd.id}`
          questionItem.id = questionId
          responseItem.annotation = ({
            id: messageEnd.metadata.annotation_reply.id,
            authorName: messageEnd.metadata.annotation_reply.account.name,
          } as AnnotationType)
          updateCurrentQA({
            responseItem,
            questionId,
            questionTempId,
            placeholderAnswerId,
            questionItem,
            responseTempId,
          })
          return
        }
        updateCurrentQA({
          responseItem,
          questionId,
          questionTempId,
          placeholderAnswerId,
          questionItem,
          responseTempId,
        })
      },
      onMessageReplace: (messageReplace) => {
        setChatList(produce(
          getChatList(),
          (draft) => {
            const current = draft.find(item => item.id === messageReplace.id)

            if (current) { current.content = toMessageText(messageReplace.answer) }
          },
        ))
      },
      onError() {
        setRespondingFalse()
        setIsRespondingConCurrCon(true)
        setChatList(produce(getChatList(), (draft) => {
          const placeholder = draft.find(item => item.id === placeholderAnswerId)
          if (placeholder) {
            placeholder.content = '连接中断，已保留你的提问。请稍后重试或检查网络。'
            placeholder.isAnswer = true
            ;(placeholder as any).isError = true
          }
          if (!draft.find(item => item.id === questionId))
          { draft.push({ ...questionItem }) }
        }))
        void refreshCurrentConversationMessages('resume')
      },
      onWorkflowStarted: ({ workflow_run_id }) => {
        responseItem.workflow_run_id = workflow_run_id
        responseItem.workflowProcess = {
          status: WorkflowRunningStatus.Running,
          tracing: [],
          expand: true,
        }
        updateCurrentQA({
          responseItem,
          questionId,
          questionTempId,
          placeholderAnswerId,
          questionItem,
          responseTempId,
        })
      },
      onWorkflowFinished: ({ data }) => {
        if (responseItem.workflowProcess)
        { responseItem.workflowProcess.status = data.status as WorkflowRunningStatus }
        updateCurrentQA({
          responseItem,
          questionId,
          questionTempId,
          placeholderAnswerId,
          questionItem,
          responseTempId,
        })
      },
      onNodeStarted: ({ data }) => {
        responseItem.workflowProcess?.tracing.push({
          ...data,
          status: 'running',
          elapsed_time: 0,
          title: data.title || data.node_type,
        } as any)
        updateCurrentQA({
          responseItem,
          questionId,
          questionTempId,
          placeholderAnswerId,
          questionItem,
          responseTempId,
        })
      },
      onNodeFinished: ({ data }) => {
        const tracing = responseItem.workflowProcess?.tracing
        if (tracing) {
          const currentIndex = tracing.findIndex(item => item.node_id === data.node_id)
          if (currentIndex >= 0)
          { tracing[currentIndex] = data as any }
          else
          { tracing.push(data as any) }
        }
        updateCurrentQA({
          responseItem,
          questionId,
          questionTempId,
          placeholderAnswerId,
          questionItem,
          responseTempId,
        })
      },
    })
  }

  const handleFeedback = async (messageId: string, feedback: Feedbacktype) => {
    await updateFeedback({ url: `/messages/${messageId}/feedbacks`, body: { rating: feedback.rating } })
    const newChatList = chatList.map((item) => {
      if (item.id === messageId) {
        return {
          ...item,
          feedback,
        }
      }
      return item
    })
    setChatList(newChatList)
    notify({ type: 'success', message: t('common.api.success') })
  }

  const renderSidebar = () => {
    if (!APP_ID || !APP_INFO || !promptConfig) { return null }
    return (
      <Sidebar
        list={conversationList}
        onCurrentIdChange={handleConversationIdChange}
        onDeleteConversation={handleDeleteConversation}
        onShareConversation={handleShareConversation}
        currentId={currConversationId}
        copyRight={APP_INFO.copyright || APP_INFO.title}
      />
    )
  }

  if (appUnavailable) { return <AppUnavailable isUnknownReason={isUnknownReason} errMessage={!hasSetAppConfig ? '请配置 NEXT_PUBLIC_APP_ID' : ''} /> }

  if (!APP_ID || !APP_INFO || !promptConfig) { return <Loading type='app' /> }

  return (
    <div data-chat-shell className="flex h-full min-h-0 bg-[var(--studio-surface)]">
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        {/* sidebar */}
        {!isMobile && renderSidebar()}
        {/* main */}
        {isMobile && showMobileConversationList
          ? (
            <div className="min-h-0 flex-1">
              <MobileConversationList
                list={conversationList}
                onOpen={handleConversationIdChange}
                onNew={() => handleConversationIdChange('-1')}
                onDelete={handleDeleteConversation}
                onShare={handleShareConversation}
              />
            </div>
          )
          : (
            <div className='relative flex min-h-0 flex-grow flex-col overflow-hidden bg-[var(--studio-chat-surface)]'>
              <div className="sticky top-0 z-20 flex h-11 shrink-0 items-center justify-between border-b border-black/[0.07] bg-[var(--studio-chat-surface)]/92 px-2.5 backdrop-blur lg:hidden">
                <button
                  onClick={() => setShowMobileConversationList(true)}
                  className="flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-1.5 text-xs font-medium text-[#526159]"
                >
                  <ChevronLeftIcon className="h-4 w-4 shrink-0" />
                  <span className="max-w-[150px] truncate">{isNewConversation ? '对话记录' : conversationName}</span>
                </button>
                <div className="flex items-center gap-2">
                  {!isNewConversation && (
                    <button onClick={openCurrentConversationShare} className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 bg-white" aria-label="分享对话">
                      <ShareIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {!isMobile && !isNewConversation && (
                <button onClick={openCurrentConversationShare} className="absolute right-4 top-3 z-30 flex items-center gap-2 rounded-xl border border-black/10 bg-white/95 px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur">
                  <ShareIcon className="h-4 w-4" />分享
                </button>
              )}
              {(!isMobile || !hasSetInputs) && (
                <ConfigSence
                  conversationName={conversationName}
                  hasSetInputs={hasSetInputs}
                  isPublicVersion={isShowPrompt}
                  siteInfo={APP_INFO}
                  promptConfig={promptConfig}
                  onStartChat={handleStartChat}
                  canEditInputs={canEditInputs}
                  savedInputs={currInputs as Record<string, any>}
                  onInputsChange={setCurrInputs}
                ></ConfigSence>
              )}

              {
                hasSetInputs && (
                  <div className='relative mx-auto flex min-h-0 w-full max-w-[980px] flex-1 flex-col pb-1 pt-1 sm:pb-3 sm:pt-2'>
                    <Chat
                      chatList={chatList}
                      onSend={handleSend}
                      onFeedback={handleFeedback}
                      onRetryMessage={handleRetryMessage}
                      isResponding={isResponding}
                      checkCanSend={checkCanSend}
                      visionConfig={visionConfig}
                      fileConfig={fileConfig}
                      scrollContainerRef={chatListDomRef}
                    />
                    {showJumpToBottom && (
                      <button
                        type="button"
                        onClick={() => scrollToChatBottom()}
                        className="absolute bottom-[86px] right-4 z-30 rounded-full border border-black/10 bg-white/95 px-3 py-2 text-xs font-semibold text-[#17342b] shadow-[0_10px_30px_rgba(20,40,31,.16)] backdrop-blur transition active:scale-95"
                      >
                        回到底部
                      </button>
                    )}
                  </div>)
              }
            </div>
          )}
        <ConversationShareDialog
          open={shareOpen}
          onClose={() => {
            setShareOpen(false)
            setShareTarget(null)
          }}
          conversationId={shareTarget?.conversationId || currConversationId}
          title={shareTarget?.title || conversationName}
          chatList={shareTarget?.chatList || chatList}
        />
      </div>
    </div>
  )
}

export default React.memo(Main)
