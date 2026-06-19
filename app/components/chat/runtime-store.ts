'use client'

import { create } from 'zustand'
import type { ChatItem } from '@/types/app'

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

export const useChatRuntime = create<ChatRuntimeState>(set => ({
  ...initialState,
  setChatList: chatList => set({ chatList }),
  setIsResponding: isResponding => set({ isResponding }),
  setIsChatStarted: isChatStarted => set({ isChatStarted }),
  reset: () => set(initialState),
}))

export const getChatRuntime = () => useChatRuntime.getState()
export const resetChatRuntime = () => useChatRuntime.getState().reset()
