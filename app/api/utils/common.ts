import 'server-only'

import type { NextRequest } from 'next/server'
import { ChatClient } from 'dify-client'
import { APP_INFO } from '@/config'
import { getSessionFromRequest } from '@/lib/session'

const apiKey = process.env.DIFY_API_KEY
const apiUrl = process.env.DIFY_API_BASE_URL || 'https://dify.jasonsome.cn:22380/v1'

export const getInfo = (request: NextRequest) => {
  const session = getSessionFromRequest(request)
  return {
    sessionId: session?.id || '',
    user: session?.difyUserId || '',
    session,
  }
}

export const setSession = (sessionId: string) => {
  if (APP_INFO.disable_session_same_site)
  { return { 'Set-Cookie': `session_id=${sessionId}; SameSite=None; Secure` } }

  return { 'Set-Cookie': `session_id=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000` }
}

export const isDifyConfigured = Boolean(apiKey)
export const client = apiKey ? new ChatClient(apiKey, apiUrl) : null

export const requireDifyClient = () => {
  if (!client)
  { throw new Error('Dify API is not configured') }
  return client
}
