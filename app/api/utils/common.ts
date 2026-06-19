import 'server-only'

import type { NextRequest } from 'next/server'
import { ChatClient } from 'dify-client'
import { APP_INFO } from '@/config'
import { difyApiBaseUrl, difyApiKey } from '@/lib/dify-server'
import { getSessionFromRequest } from '@/lib/session'

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

export const isDifyConfigured = Boolean(difyApiKey)
export const client = difyApiKey ? new ChatClient(difyApiKey, difyApiBaseUrl) : null

export const requireDifyClient = () => {
  if (!client)
  { throw new Error('Dify API is not configured') }
  return client
}
