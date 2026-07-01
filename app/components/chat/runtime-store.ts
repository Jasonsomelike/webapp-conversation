'use client'

import { create } from 'zustand'
import type { ChatItem } from '@/types/app'
import { toMessageText } from '@/lib/safe-text'

interface ChatRuntimeState {
  chatList: ChatItem[]
  isResponding: boolean
  isChatStarted: boolean
  setChatList: (chatList: ChatItem[]) => void
  setIsResponding: (isResponding: boolean) => void
  setIsChatStarted: (isChatStarted: boolean) => void
  reset: () => void
}

const initialState = {
  chatList: [] as ChatItem[],
  isResponding: false,
  isChatStarted: false,
}

const normalizeWorkflowProcess = (workflowProcess: ChatItem['workflowProcess']) => {
  if (!workflowProcess || typeof workflowProcess !== 'object')
  { return undefined }
  return {
    ...workflowProcess,
    status: toMessageText(workflowProcess.status, 'running') as any,
    tracing: Array.isArray(workflowProcess.tracing)
      ? workflowProcess.tracing.map((node, index) => ({
        ...node,
        id: toMessageText(node?.id, toMessageText(node?.node_id, `node-${index}`)),
        node_id: toMessageText(node?.node_id, toMessageText(node?.id, `node-${index}`)),
        node_type: toMessageText(node?.node_type, 'llm') as any,
        title: toMessageText(node?.title, toMessageText(node?.node_type, '工作流节点')),
        status: toMessageText(node?.status, 'running'),
        error: toMessageText(node?.error),
      }))
      : [],
  }
}

const normalizeChatItem = (item: ChatItem, index: number): ChatItem => ({
  ...item,
  id: toMessageText(item?.id, `message-${index}`),
  content: toMessageText(item?.content),
  suggestedQuestions: Array.isArray(item?.suggestedQuestions)
    ? item.suggestedQuestions.map(question => toMessageText(question)).filter(Boolean)
    : [],
  agent_thoughts: Array.isArray(item?.agent_thoughts)
    ? item.agent_thoughts.map((thought, thoughtIndex) => ({
      ...thought,
      id: toMessageText(thought?.id, `thought-${index}-${thoughtIndex}`),
      tool: toMessageText(thought?.tool),
      thought: toMessageText(thought?.thought),
      tool_input: toMessageText(thought?.tool_input),
      message_id: toMessageText(thought?.message_id),
      observation: toMessageText(thought?.observation),
    }))
    : item?.agent_thoughts,
  workflowProcess: normalizeWorkflowProcess(item?.workflowProcess),
})

const normalizeChatList = (chatList: ChatItem[]) =>
  Array.isArray(chatList)
    ? chatList
      .filter(item => item && typeof item === 'object')
      .map(normalizeChatItem)
    : []

export const useChatRuntime = create<ChatRuntimeState>(set => ({
  ...initialState,
  setChatList: chatList => set({ chatList: normalizeChatList(chatList) }),
  setIsResponding: isResponding => set({ isResponding }),
  setIsChatStarted: isChatStarted => set({ isChatStarted }),
  reset: () => set(initialState),
}))

export const getChatRuntime = () => useChatRuntime.getState()
export const resetChatRuntime = () => useChatRuntime.getState().reset()
