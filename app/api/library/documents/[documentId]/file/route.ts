import type { NextRequest } from 'next/server'
import { getKnowledgeDocumentDownloadUrl } from '@/lib/dify-dataset'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  if (!getSessionFromRequest(request))
  { return new Response('Unauthorized', { status: 401 }) }

  try {
    const { documentId } = await params
    const signedUrl = await getKnowledgeDocumentDownloadUrl(documentId)
    const upstream = await fetch(signedUrl, {
      cache: 'no-store',
      headers: request.headers.get('range')
        ? { Range: request.headers.get('range')! }
        : undefined,
    })
    if (!upstream.ok || !upstream.body)
    { return new Response('Document unavailable', { status: upstream.status }) }

    const disposition = request.nextUrl.searchParams.get('disposition') === 'attachment'
      ? 'attachment'
      : 'inline'
    const filename = (request.nextUrl.searchParams.get('filename') || 'document')
      .replace(/["\r\n]/g, '_')

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'private, max-age=120',
        'X-Content-Type-Options': 'nosniff',
        ...(upstream.headers.get('Content-Length') ? { 'Content-Length': upstream.headers.get('Content-Length')! } : {}),
        ...(upstream.headers.get('Content-Range') ? { 'Content-Range': upstream.headers.get('Content-Range')! } : {}),
      },
    })
  }
  catch {
    return new Response('Unable to open document', { status: 502 })
  }
}
