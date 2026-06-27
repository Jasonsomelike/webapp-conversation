import { createHmac, randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { fetchDify } from '@/lib/dify-server'
import { getSessionFromRequest } from '@/lib/session'

const allowedHosts = new Set(['dify.jasonsome.cn', 'www.jasonsome.cn', 'jasonsome.cn'])
const allowedPaths = ['/files/', '/page-images/']
const pageImagePathPattern = /^\/page-images\/[a-z0-9_-]{6,64}\/page_\d+\.(?:jpe?g|png|webp)$/i
const uploadedFilePreviewPattern = /^\/(?:v1\/)?files\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/(?:file-preview|preview)$/i
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60

export const runtime = 'nodejs'

const contentDisposition = (filename: string, download: boolean) => {
  const mode = download ? 'attachment' : 'inline'
  const safeFilename = filename.replace(/["\r\n]/g, '_')
  return `${mode}; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
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
      'Cache-Control': 'private, max-age=300, stale-while-revalidate=900',
      'X-Request-Id': requestId,
      'X-Dify-Asset-Source': 'signed-page-image-redirect',
    },
  })
}

export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  const session = getSessionFromRequest(request)
  if (!session)
  { return new Response('Unauthorized', { status: 401, headers: { 'X-Request-Id': requestId } }) }

  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl)
  { return new Response('Missing url', { status: 400, headers: { 'X-Request-Id': requestId } }) }

  let target: URL
  try {
    target = new URL(rawUrl)
  }
  catch {
    return new Response('Invalid url', { status: 400, headers: { 'X-Request-Id': requestId } })
  }

  const uploadedPreview = target.pathname.match(uploadedFilePreviewPattern)
  const allowed = target.protocol === 'https:'
    && allowedHosts.has(target.hostname)
    && (target.hostname !== 'dify.jasonsome.cn' || !target.port || target.port === '22380')
    && (allowedPaths.some(path => target.pathname.startsWith(path)) || Boolean(uploadedPreview))
  if (!allowed)
  { return new Response('Forbidden file proxy url', { status: 403, headers: { 'X-Request-Id': requestId } }) }

  if (target.pathname.startsWith('/page-images/')) {
    const redirect = signedPageImageRedirect(target.pathname, requestId)
    if (redirect)
    { return redirect }
  }

  const headers: HeadersInit = {}
  const range = request.headers.get('range')
  if (range)
  { headers.Range = range }

  const shouldDownload = request.nextUrl.searchParams.get('download') === '1'
  const requestedFilename = request.nextUrl.searchParams.get('filename')
  const filename = requestedFilename || target.pathname.split('/').pop() || 'download'

  if (uploadedPreview) {
    const params = new URLSearchParams()
    params.set('user', session.difyUserId)
    if (shouldDownload)
    { params.set('as_attachment', 'true') }
    let upstream: Response
    try {
      upstream = await fetchDify(`/files/${uploadedPreview[1]}/preview?${params}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      }, { connectTimeoutMs: 30_000, retries: 1 })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'network error'
      return new Response(`Unable to proxy uploaded file. ${message}`, { status: 502, headers: { 'X-Request-Id': requestId } })
    }
    if (!upstream.ok || !upstream.body) {
      const body = await upstream.text().catch(() => '')
      return new Response(
        `Unable to proxy uploaded file. Upstream status=${upstream.status}. ${body.slice(0, 500)}`,
        { status: upstream.status || 502, headers: { 'X-Request-Id': requestId } },
      )
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': upstream.headers.get('Content-Disposition') || contentDisposition(filename, shouldDownload),
        'Cache-Control': `private, max-age=${THIRTY_DAYS_SECONDS}, stale-while-revalidate=${THIRTY_DAYS_SECONDS}`,
        'X-Content-Type-Options': 'nosniff',
        'X-Request-Id': requestId,
        'Accept-Ranges': upstream.headers.get('Accept-Ranges') || 'bytes',
        ...(upstream.headers.get('Content-Length') ? { 'Content-Length': upstream.headers.get('Content-Length')! } : {}),
        ...(upstream.headers.get('Content-Range') ? { 'Content-Range': upstream.headers.get('Content-Range')! } : {}),
      },
    })
  }

  let upstream: Response
  try {
    // Preserve the exact signed URL for non-page-image assets.
    upstream = await fetch(rawUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
      redirect: 'follow',
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'network error'
    return new Response(`Unable to proxy file. ${message}`, { status: 502, headers: { 'X-Request-Id': requestId } })
  }
  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text().catch(() => '')
    return new Response(
      `Unable to proxy file. Upstream status=${upstream.status}. ${body.slice(0, 500)}`,
      { status: upstream.status || 502, headers: { 'X-Request-Id': requestId } },
    )
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Disposition': contentDisposition(filename, shouldDownload),
      'Cache-Control': `private, max-age=${THIRTY_DAYS_SECONDS}, stale-while-revalidate=${THIRTY_DAYS_SECONDS}`,
      'X-Content-Type-Options': 'nosniff',
      'X-Request-Id': requestId,
      'Accept-Ranges': upstream.headers.get('Accept-Ranges') || 'bytes',
      ...(upstream.headers.get('Content-Length') ? { 'Content-Length': upstream.headers.get('Content-Length')! } : {}),
      ...(upstream.headers.get('Content-Range') ? { 'Content-Range': upstream.headers.get('Content-Range')! } : {}),
    },
  })
}
