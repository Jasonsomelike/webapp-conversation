import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export type ConversationShareScope = 'all' | 'latest'

export interface ConversationSharePayload {
  conversationId: string
  appUserId: string
  scope: ConversationShareScope
  expiresAt: number
}

const key = () => createHash('sha256')
  .update(process.env.AUTH_SECRET || 'development-only-secret-change-before-production')
  .digest()

export const createConversationShareToken = (
  payload: Omit<ConversationSharePayload, 'expiresAt'>,
) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ ...payload, expiresAt }), 'utf8'),
    cipher.final(),
  ])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
}

export const verifyConversationShareToken = (token: string): ConversationSharePayload | null => {
  try {
    const bytes = Buffer.from(token, 'base64url')
    if (bytes.length < 29)
    { return null }
    const decipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12))
    decipher.setAuthTag(bytes.subarray(12, 28))
    const payload = JSON.parse(Buffer.concat([
      decipher.update(bytes.subarray(28)),
      decipher.final(),
    ]).toString('utf8')) as ConversationSharePayload
    if (
      !payload.appUserId
      || !payload.conversationId
      || !['all', 'latest'].includes(payload.scope)
      || payload.expiresAt < Date.now()
    )
    { return null }
    return payload
  }
  catch {
    return null
  }
}
