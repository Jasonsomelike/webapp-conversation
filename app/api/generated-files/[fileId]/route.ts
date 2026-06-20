import { createHmac, randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const payloadContainsFileId = (value: unknown, fileId: string): boolean => {
  if (typeof value === 'string')
  { return value.includes(fileId) }
  if (Array.isArray(value))
  { return value.some(item => payloadContainsFileId(item, fileId)) }
  if (value && typeof value === 'object')
  { return Object.values(value).some(item => payloadContainsFileId(item, fileId)) }
  return false
}

const userOwnsGeneratedFile = async (appUserId: string, fileId: string) => {
  if (!isDatabaseConfigured())
  { return false }
  const messages = await withDatabaseRetry(() => db.chatMessage.findMany({
    where: { appUserId, role: 'assistant' },
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: { content: true, rawPayload: true },
  }))
  return messages.some(message =>
    message.content.includes(fileId) || payloadContainsFileId(message.rawPayload, fileId),
  )
}

const signedGeneratedFileRedirect = ({
  fileId,
  disposition,
  filename,
  requestId,
}: {
  fileId: string
  disposition: 'inline' | 'attachment'
  filename: string
  requestId: string
}) => {
  const baseUrl = process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '')
  const token = process.env.LIBRARY_FILE_SERVICE_TOKEN
  if (!baseUrl || !token)
  { return null }

  const expires = String(Math.floor(Date.now() / 1000) + 300)
  const canonical = `${fileId}\n${disposition}\n${filename}\n${requestId}\n${expires}`
  const signature = createHmac('sha256', token).update(canonical).digest('base64url')
  const url = new URL(`${baseUrl}/generated-files/${encodeURIComponent(fileId)}`)
  url.searchParams.set('disposition', disposition)
  url.searchParams.set('filename', filename)
  url.searchParams.set('requestId', requestId)
  url.searchParams.set('expires', expires)
  url.searchParams.set('signature', signature)

  return new Response(null, {
    status: 307,
    headers: {
      'Location': url.toString(),
      'Cache-Control': 'private, no-store',
      'X-Request-Id': requestId,
    },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const requestId = randomUUID()
  const session = getSessionFromRequest(request)
  if (!session)
  { return new Response('Unauthorized', { status: 401, headers: { 'X-Request-Id': requestId } }) }

  const { fileId } = await params
  if (!uuidPattern.test(fileId))
  { return new Response('Invalid file id', { status: 400, headers: { 'X-Request-Id': requestId } }) }

  let owned = false
  try {
    owned = await userOwnsGeneratedFile(session.id, fileId)
  }
  catch (error) {
    console.error('[generated-file] ownership check failed', { requestId, fileId, error })
    return new Response(`文件权限验证暂时不可用，请稍后重试。requestId=${requestId}`, {
      status: 503,
      headers: { 'X-Request-Id': requestId },
    })
  }
  if (!owned)
  { return new Response('Generated file not found', { status: 404, headers: { 'X-Request-Id': requestId } }) }

  const disposition = request.nextUrl.searchParams.get('disposition') === 'inline'
    ? 'inline'
    : 'attachment'
  const filename = (request.nextUrl.searchParams.get('filename') || fileId)
    .replace(/["\r\n]/g, '_')
  return signedGeneratedFileRedirect({ fileId, disposition, filename, requestId })
    || new Response('Generated file service is not configured', {
      status: 503,
      headers: { 'X-Request-Id': requestId },
    })
}

export const HEAD = GET
