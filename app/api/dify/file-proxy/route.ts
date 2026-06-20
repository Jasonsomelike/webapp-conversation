import type { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'

const allowedHost = 'dify.jasonsome.cn'
const allowedPaths = ['/files/', '/page-images/']

export const runtime = 'nodejs'

const contentDisposition = (filename: string, download: boolean) => {
  const mode = download ? 'attachment' : 'inline'
  const safeFilename = filename.replace(/["\r\n]/g, '_')
  return `${mode}; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
}

export async function GET(request: NextRequest) {
  if (!getSessionFromRequest(request))
  { return new Response('Unauthorized', { status: 401 }) }

  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl)
  { return new Response('Missing url', { status: 400 }) }

  let target: URL
  try {
    target = new URL(rawUrl)
  }
  catch {
    return new Response('Invalid url', { status: 400 })
  }

  const allowed = target.protocol === 'https:'
    && target.hostname === allowedHost
    && (!target.port || target.port === '22380')
    && allowedPaths.some(path => target.pathname.startsWith(path))
  if (!allowed)
  { return new Response('Forbidden file proxy url', { status: 403 }) }

  const headers: HeadersInit = {}
  const range = request.headers.get('range')
  if (range)
  { headers.Range = range }

  let upstream: Response
  try {
    // Fetch the exact decoded signed URL. Do not rebuild timestamp, nonce, sign, or query order.
    upstream = await fetch(rawUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
      redirect: 'follow',
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'network error'
    return new Response(`Unable to proxy file. ${message}`, { status: 502 })
  }
  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text().catch(() => '')
    return new Response(
      `Unable to proxy file. Upstream status=${upstream.status}. ${body.slice(0, 500)}`,
      { status: upstream.status || 502 },
    )
  }

  const shouldDownload = request.nextUrl.searchParams.get('download') === '1'
  const requestedFilename = request.nextUrl.searchParams.get('filename')
  const filename = requestedFilename || target.pathname.split('/').pop() || 'download'

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Disposition': contentDisposition(filename, shouldDownload),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': upstream.headers.get('Accept-Ranges') || 'bytes',
      ...(upstream.headers.get('Content-Length') ? { 'Content-Length': upstream.headers.get('Content-Length')! } : {}),
      ...(upstream.headers.get('Content-Range') ? { 'Content-Range': upstream.headers.get('Content-Range')! } : {}),
    },
  })
}
