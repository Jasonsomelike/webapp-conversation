import { randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import {
  getKnowledgeDocumentDownloadUrl,
  getKnowledgeDocumentIndexedText,
  getKnowledgeDocumentPageImages,
} from '@/lib/dify-dataset'
import { buildKnowledgeDocumentPdf } from '@/lib/knowledge-document-pdf'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'
export const maxDuration = 300

const dispositionHeader = (mode: 'inline' | 'attachment', filename: string) =>
  `${mode}; filename*=UTF-8''${encodeURIComponent(filename.replace(/["\r\n]/g, '_'))}`

const byteResponse = (
  request: NextRequest,
  bytes: Uint8Array,
  contentType: string,
  disposition: 'inline' | 'attachment',
  filename: string,
  fallback: string,
) => {
  const buffer = Buffer.from(bytes)
  const range = request.headers.get('range')
  const commonHeaders = {
    'Content-Type': contentType,
    'Content-Disposition': dispositionHeader(disposition, filename),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Dify-Document-Fallback': fallback,
    'Accept-Ranges': 'bytes',
  }

  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/)
    if (match) {
      const start = match[1] ? Number(match[1]) : 0
      const end = match[2] ? Math.min(Number(match[2]), buffer.length - 1) : buffer.length - 1
      if (Number.isFinite(start) && Number.isFinite(end) && start <= end && start < buffer.length) {
        const chunk = buffer.subarray(start, end + 1)
        return new Response(chunk, {
          status: 206,
          headers: {
            ...commonHeaders,
            'Content-Length': String(chunk.length),
            'Content-Range': `bytes ${start}-${end}/${buffer.length}`,
          },
        })
      }
    }
  }

  return new Response(buffer, {
    headers: { ...commonHeaders, 'Content-Length': String(buffer.length) },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const requestId = randomUUID()
  if (!getSessionFromRequest(request))
  { return new Response('Unauthorized', { status: 401, headers: { 'X-Request-Id': requestId } }) }

  const { documentId } = await params
  const disposition = request.nextUrl.searchParams.get('disposition') === 'attachment'
    ? 'attachment'
    : 'inline'
  const filename = (request.nextUrl.searchParams.get('filename') || `${documentId}.pdf`)
    .replace(/["\r\n]/g, '_')
  let originalFileError = ''

  try {
    const signedUrl = await getKnowledgeDocumentDownloadUrl(documentId)
    const upstream = await fetch(signedUrl, {
      cache: 'no-store',
      redirect: 'follow',
      headers: request.headers.get('range') ? { Range: request.headers.get('range')! } : undefined,
    })
    if (!upstream.ok || !upstream.body)
    { throw new Error(`DIFY_DOCUMENT_FILE_UNAVAILABLE:${upstream.status}`) }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': dispositionHeader(disposition, filename),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Accept-Ranges': upstream.headers.get('Accept-Ranges') || 'bytes',
        'X-Request-Id': requestId,
        ...(upstream.headers.get('Content-Length') ? { 'Content-Length': upstream.headers.get('Content-Length')! } : {}),
        ...(upstream.headers.get('Content-Range') ? { 'Content-Range': upstream.headers.get('Content-Range')! } : {}),
      },
    })
  }
  catch (error) {
    originalFileError = error instanceof Error ? error.message : String(error)
  }

  try {
    if (/\.pdf$/i.test(filename)) {
      const pageImages = await getKnowledgeDocumentPageImages(documentId)
      if (pageImages.length) {
        const pdf = await buildKnowledgeDocumentPdf(filename, pageImages)
        return byteResponse(request, pdf, 'application/pdf', disposition, filename, 'page-images-pdf')
      }
    }

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
        'Content-Disposition': dispositionHeader(disposition, fallbackFilename),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Dify-Document-Fallback': 'indexed-text',
        'X-Request-Id': requestId,
      },
    })
  }
  catch (error) {
    const fallbackError = error instanceof Error ? error.message : String(error)
    console.error('[library-file] failed', {
      requestId,
      documentId,
      originalFileError,
      fallbackError,
    })
    const notFound = /:404|NOT_FOUND/i.test(`${originalFileError} ${fallbackError}`)
    return new Response(
      `Unable to open document: ${fallbackError}. requestId=${requestId}`,
      { status: notFound ? 404 : 502, headers: { 'X-Request-Id': requestId } },
    )
  }
}
