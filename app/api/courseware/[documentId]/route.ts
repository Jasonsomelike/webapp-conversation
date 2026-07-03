import type { NextRequest } from 'next/server'
import { getStaticCoursewareById } from '@/lib/static-courseware'

export const runtime = 'nodejs'

const dispositionHeader = (mode: 'inline' | 'attachment', filename: string) => {
  const safe = filename.replace(/["\r\n]/g, '_')
  const asciiFallback = safe.replace(/[^\x20-\x7E]/g, '_')
  return `${mode}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safe)}`
}

const safeFilename = (value: string) =>
  (value || '知识库文档.pdf').replace(/["\r\n]/g, '_')

const withDownloadHeaders = (
  response: Response,
  filename: string,
  disposition: 'inline' | 'attachment',
) => {
  const headers = new Headers(response.headers)
  headers.set('Content-Type', response.headers.get('Content-Type') || 'application/pdf')
  headers.set('Content-Disposition', dispositionHeader(disposition, filename))
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Accept-Ranges', response.headers.get('Accept-Ranges') || 'bytes')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Courseware-Source', 'vercel-static-copy')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params
  const courseware = getStaticCoursewareById(documentId)
  if (!courseware)
  { return new Response('Courseware file not found', { status: 404 }) }

  const disposition = request.nextUrl.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment'
  const filename = safeFilename(request.nextUrl.searchParams.get('filename') || courseware.name)
  const staticUrl = new URL(courseware.url, request.url)
  const headers = new Headers()
  const range = request.headers.get('range')
  if (range)
  { headers.set('range', range) }
  const staticResponse = await fetch(staticUrl, { headers })
  if (!staticResponse.ok && staticResponse.status !== 206)
  { return new Response(`Courseware static file unavailable: ${staticResponse.status}`, { status: 502 }) }
  return withDownloadHeaders(staticResponse, filename, disposition)
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params
  const courseware = getStaticCoursewareById(documentId)
  if (!courseware)
  { return new Response(null, { status: 404 }) }

  const disposition = request.nextUrl.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment'
  const filename = safeFilename(request.nextUrl.searchParams.get('filename') || courseware.name)
  const staticUrl = new URL(courseware.url, request.url)
  const headers = new Headers()
  const range = request.headers.get('range')
  if (range)
  { headers.set('range', range) }
  const staticResponse = await fetch(staticUrl, { method: 'HEAD', headers })
  if (!staticResponse.ok && staticResponse.status !== 206)
  { return new Response(null, { status: 502 }) }
  return withDownloadHeaders(staticResponse, filename, disposition)
}
