import type { NextRequest } from 'next/server'
import { getKnowledgeDocumentDownloadUrl, getKnowledgeDocumentIndexedText } from '@/lib/dify-dataset'
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
    const disposition = request.nextUrl.searchParams.get('disposition') === 'attachment'
      ? 'attachment'
      : 'inline'
    const filename = (request.nextUrl.searchParams.get('filename') || 'document')
      .replace(/["\r\n]/g, '_')

    try {
      const signedUrl = await getKnowledgeDocumentDownloadUrl(documentId)
      const upstream = await fetch(signedUrl, {
        cache: 'no-store',
        headers: request.headers.get('range')
          ? { Range: request.headers.get('range')! }
          : undefined,
      })
      if (!upstream.ok || !upstream.body)
      { throw new Error(`DIFY_DOCUMENT_FILE_UNAVAILABLE:${upstream.status}`) }

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
      const indexedText = await getKnowledgeDocumentIndexedText(documentId)
      const fallbackFilename = `${filename.replace(/\.[^.]+$/, '') || 'document'}-索引文本.txt`
      const body = [
        `文档：${filename}`,
        '说明：当前 Dify 版本未开放原文件下载接口，以下内容为知识库已索引文本。',
        '',
        indexedText,
      ].join('\n')
      return new Response(body, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(fallbackFilename)}`,
          'Cache-Control': 'private, max-age=120',
          'X-Content-Type-Options': 'nosniff',
          'X-Dify-Document-Fallback': 'indexed-text',
        },
      })
    }
  }
  catch {
    return new Response('Unable to open document', { status: 502 })
  }
}
