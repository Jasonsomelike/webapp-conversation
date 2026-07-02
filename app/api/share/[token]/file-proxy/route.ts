import { createHmac, randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { db, withDatabaseRetry } from '@/lib/db'
import { getConversationSharePayload } from '@/lib/conversation-share'
import { toAbsoluteDifyAssetUrl } from '@/lib/dify-assets'

export const runtime = 'nodejs'

const allowedHosts = new Set(['dify.jasonsome.cn', 'www.jasonsome.cn', 'jasonsome.cn'])
const allowedPaths = ['/files/', '/page-images/']
const pageImagePathPattern = /^\/page-images\/[a-z0-9_-]{6,64}\/page_\d+\.(?:jpe?g|png|webp)$/i
const generatedToolFilePattern = /^\/files\/tools\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\.([a-z0-9]+))?$/i

const contentDisposition = (filename: string, download: boolean) => {
  const mode = download ? 'attachment' : 'inline'
  const safeFilename = filename.replace(/["\r\n]/g, '_')
  return `${mode}; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
}

const assetKeys = (value: string) => {
  const absolute = toAbsoluteDifyAssetUrl(value)
  const keys = new Set<string>()
  keys.add(value)
  keys.add(absolute)
  try {
    const url = new URL(absolute)
    keys.add(url.pathname)
    keys.add(`${url.origin}${url.pathname}`)
  }
  catch {
    // Keep the raw strings above for malformed model output.
  }
  return [...keys].filter(Boolean)
}

const payloadContainsAsset = (value: unknown, keys: string[]): boolean => {
  if (typeof value === 'string')
  { return keys.some(key => value.includes(key)) }
  if (Array.isArray(value))
  { return value.some(item => payloadContainsAsset(item, keys)) }
  if (value && typeof value === 'object')
  { return Object.values(value).some(item => payloadContainsAsset(item, keys)) }
  return false
}

const signedPageImageRedirect = (path: string, requestId: string) => {
  const baseUrl = process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '')
  const token = process.env.LIBRARY_FILE_SERVICE_TOKEN
  if (!baseUrl || !token || !pageImagePathPattern.test(path))
  { return null }

  const expires = String(Math.floor(Date.now() / 1000) + 300)
  const canonical = `${path}\n${requestId}\n${expires}`
  const signature = createHmac('sha256', token).update(canonical).digest('base64url')
  const url = new URL(`${baseUrl}${path}`)
  url.searchParams.set('requestId', requestId)
  url.searchParams.set('expires', expires)
  url.searchParams.set('signature', signature)
  return new Response(null, {
    status: 307,
    headers: {
      'Location': url.toString(),
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      'X-Request-Id': requestId,
      'X-Dify-Asset-Source': 'share-signed-page-image-redirect',
    },
  })
}

const signedGeneratedFileRedirect = ({
  path,
  download,
  filename,
  requestId,
}: {
  path: string
  download: boolean
  filename: string
  requestId: string
}) => {
  const matched = path.match(generatedToolFilePattern)
  const baseUrl = process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '')
  const token = process.env.LIBRARY_FILE_SERVICE_TOKEN
  if (!matched || !baseUrl || !token)
  { return null }

  const fileId = matched[1]
  const fallbackFilename = matched[2] ? `${fileId}.${matched[2]}` : fileId
  const safeFilename = (filename || fallbackFilename).replace(/["\r\n]/g, '_')
  const disposition = download ? 'attachment' : 'inline'
  const expires = String(Math.floor(Date.now() / 1000) + 300)
  const canonical = `${fileId}\n${disposition}\n${safeFilename}\n${requestId}\n${expires}`
  const signature = createHmac('sha256', token).update(canonical).digest('base64url')
  const url = new URL(`${baseUrl}/generated-files/${encodeURIComponent(fileId)}`)
  url.searchParams.set('disposition', disposition)
  url.searchParams.set('filename', safeFilename)
  url.searchParams.set('requestId', requestId)
  url.searchParams.set('expires', expires)
  url.searchParams.set('signature', signature)

  return new Response(null, {
    status: 307,
    headers: {
      'Location': url.toString(),
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      'X-Request-Id': requestId,
      'X-Dify-Asset-Source': 'share-signed-generated-file-redirect',
    },
  })
}

const sharedMessagesContainAsset = async (
  token: string,
  keys: string[],
) => {
  const payload = await getConversationSharePayload(token)
  if (!payload)
  { return false }

  const messages = await withDatabaseRetry(() => db.chatMessage.findMany({
    where: {
      appUserId: payload.appUserId,
      difyConversationId: payload.conversationId,
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      difyMessageId: true,
      content: true,
      rawPayload: true,
    },
  }))

  const groups = new Map<string, typeof messages>()
  messages.forEach((message) => {
    const key = message.difyMessageId || message.id
    const current = groups.get(key) || []
    current.push(message)
    groups.set(key, current)
  })
  const exchangeGroups = [...groups.entries()].map(([id, group]) => ({ id, messages: group }))
  const selectedIds = new Set(payload.messageIds || [])
  const visibleGroups = payload.scope === 'latest'
    ? exchangeGroups.slice(-1)
    : payload.scope === 'selected'
      ? exchangeGroups.filter(group => selectedIds.has(group.id))
      : exchangeGroups

  return visibleGroups
    .flatMap(group => group.messages)
    .some(message =>
      payloadContainsAsset(message.content, keys)
      || payloadContainsAsset(message.rawPayload, keys),
    )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const requestId = randomUUID()
  const { token } = await params
  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl)
  { return new Response('Missing url', { status: 400, headers: { 'X-Request-Id': requestId } }) }

  let target: URL
  try {
    target = new URL(toAbsoluteDifyAssetUrl(rawUrl))
  }
  catch {
    return new Response('Invalid url', { status: 400, headers: { 'X-Request-Id': requestId } })
  }

  const allowed = ['http:', 'https:'].includes(target.protocol)
    && allowedHosts.has(target.hostname)
    && (target.hostname !== 'dify.jasonsome.cn' || !target.port || target.port === '22380')
    && allowedPaths.some(path => target.pathname.startsWith(path))
  if (!allowed)
  { return new Response('Forbidden file proxy url', { status: 403, headers: { 'X-Request-Id': requestId } }) }

  const keys = assetKeys(rawUrl)
  const shared = await sharedMessagesContainAsset(token, keys).catch((error) => {
    console.error('[share-file-proxy] share asset lookup failed', {
      requestId,
      tokenLength: token.length,
      error,
    })
    return false
  })
  if (!shared)
  { return new Response('Shared asset not found', { status: 404, headers: { 'X-Request-Id': requestId } }) }

  const shouldDownload = request.nextUrl.searchParams.get('download') === '1'
  const requestedFilename = request.nextUrl.searchParams.get('filename')
  const filename = requestedFilename || target.pathname.split('/').pop() || 'download'

  if (target.pathname.startsWith('/page-images/')) {
    const redirect = signedPageImageRedirect(target.pathname, requestId)
    if (redirect)
    { return redirect }
  }

  if (target.pathname.startsWith('/files/tools/')) {
    const redirect = signedGeneratedFileRedirect({
      path: target.pathname,
      download: shouldDownload,
      filename,
      requestId,
    })
    if (redirect)
    { return redirect }
  }

  const headers: HeadersInit = {}
  const range = request.headers.get('range')
  if (range)
  { headers.Range = range }

  let upstream: Response
  try {
    upstream = await fetch(target.toString(), {
      method: 'GET',
      headers,
      cache: 'no-store',
      redirect: 'follow',
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'network error'
    return new Response(`Unable to proxy shared file. ${message}`, {
      status: 502,
      headers: { 'X-Request-Id': requestId },
    })
  }
  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text().catch(() => '')
    return new Response(
      `Unable to proxy shared file. Upstream status=${upstream.status}. ${body.slice(0, 500)}`,
      { status: upstream.status || 502, headers: { 'X-Request-Id': requestId } },
    )
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Disposition': contentDisposition(filename, shouldDownload),
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=1800',
      'X-Content-Type-Options': 'nosniff',
      'X-Request-Id': requestId,
      'Accept-Ranges': upstream.headers.get('Accept-Ranges') || 'bytes',
      ...(upstream.headers.get('Content-Length') ? { 'Content-Length': upstream.headers.get('Content-Length')! } : {}),
      ...(upstream.headers.get('Content-Range') ? { 'Content-Range': upstream.headers.get('Content-Range')! } : {}),
    },
  })
}

export const HEAD = GET
