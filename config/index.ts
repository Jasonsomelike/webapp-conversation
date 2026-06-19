import type { AppInfo } from '@/types/app'
export const APP_ID = process.env.NEXT_PUBLIC_APP_ID || 'a7d68723-da54-45e3-a742-d746f4f852c7'
export const APP_INFO: AppInfo = {
  title: '计算机网络学习助手',
  description: '基于课程知识库、学习记忆与技能工具的个性化辅导',
  copyright: '知行网络学堂',
  privacy_policy: '',
  default_language: 'zh-Hans',
  disable_session_same_site: false, // set it to true if you want to embed the chatbot in an iframe
}

export const isShowPrompt = false
export const promptTemplate = ''

export const API_PREFIX = '/api'

export const LOCALE_COOKIE_NAME = 'locale'

export const DEFAULT_VALUE_MAX_LEN = 48
