import { createHmac, randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import {
  findKnowledgeDocumentByName,
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

const copyHeader = (source: Headers, target: Headers, name: string) => {
  const value = source.get(name)
  if (value)
  { target.set(name, value) }
}

const streamedResponse = (
  upstream: Response,
  disposition: 'inline' | 'attachment',
  filename: string,
  requestId: string,
  source: string,
) => {
  const headers = new Headers({
    'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
    // Respect the action selected in our UI. Some upstream services always
    // return "attachment", which made Android WebView download a preview.
    'Content-Disposition': dispositionHeader(disposition, filename),
    'Cache-Control': 'private, max-age=300, stale-while-revalidate=900',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': requestId,
    'X-Library-File-Source': source,
  })
  ;['Accept-Ranges', 'Content-Length', 'Content-Range', 'ETag', 'Last-Modified'].forEach(name =>
    copyHeader(upstream.headers, headers, name),
  )

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}

const byteResponse = (
  request: NextRequest,
  bytes: Uint8Array,
  contentType: string,
  disposition: 'inline' | 'attachment',
  filename: string,
  fallback: string,
  requestId: string,
) => {
  const buffer = Buffer.from(bytes)
  const range = request.headers.get('range')
  const commonHeaders = {
    'Content-Type': contentType,
    'Content-Disposition': dispositionHeader(disposition, filename),
    'Cache-Control': 'private, max-age=600, stale-while-revalidate=1800',
    'X-Content-Type-Options': 'nosniff',
    'X-Dify-Document-Fallback': fallback,
    'X-Library-File-Source': fallback,
    'X-Request-Id': requestId,
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

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#039;',
  })[character] || character)

const documentErrorResponse = (
  request: NextRequest,
  message: string,
  status: number,
  requestId: string,
) => {
  const headers = { 'X-Request-Id': requestId }
  const wantsHtml = request.headers.get('accept')?.includes('text/html')
    && request.nextUrl.searchParams.get('disposition') !== 'attachment'
  if (!wantsHtml)
  { return new Response(`${message}. requestId=${requestId}`, { status, headers }) }

  const safeMessage = escapeHtml(message)
  const safeRequestId = escapeHtml(requestId)
  return new Response(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>文档打开失败</title>
  <style>
    body{margin:0;background:#f4f6f3;color:#17342b;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
    main{max-width:680px;margin:12vh auto;padding:32px;border:1px solid #17342b1a;border-radius:24px;background:#fff;box-shadow:0 24px 70px #17342b14}
    h1{font-size:24px;margin:0 0 14px}p{line-height:1.8;color:#526159}.code{padding:12px 14px;border-radius:12px;background:#f2f5f2;font:13px ui-monospace,monospace;word-break:break-all}
    .actions{display:flex;gap:10px;margin-top:24px;flex-wrap:wrap}a,button{border:0;border-radius:12px;padding:10px 16px;font-weight:650;cursor:pointer;text-decoration:none}
    a{background:#17342b;color:#fff}button{background:#e8efe9;color:#17342b}
  </style>
</head>
<body><main>
  <h1>文档打开失败</h1>
  <p>${safeMessage}</p>
  <div class="code">请求编号：${safeRequestId}</div>
  <p>可能原因：文件映射不存在、服务器只读文件路由不可用，或上游 Dify 暂时无法访问。</p>
  <div class="actions">
    <a href="/library">返回知识库</a>
    <button onclick="navigator.clipboard.writeText(document.querySelector('.code').textContent)">复制错误信息</button>
  </div>
</main></body></html>`, {
    status,
    headers: {
      ...headers,
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

const fetchLibraryFileService = async ({
  documentId,
  disposition,
  filename,
  requestId,
  range,
}: {
  documentId: string
  disposition: 'inline' | 'attachment'
  filename: string
  requestId: string
  range: string | null
}) => {
  const baseUrl = process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '')
  const token = process.env.LIBRARY_FILE_SERVICE_TOKEN
  if (!baseUrl || !token)
  { throw new Error('LIBRARY_FILE_SERVICE_NOT_CONFIGURED') }

  const url = new URL(`${baseUrl}/library/documents/${encodeURIComponent(documentId)}/file`)
  url.searchParams.set('disposition', disposition)
  url.searchParams.set('filename', filename)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error('LIBRARY_FILE_SERVICE_TIMEOUT')), 30_000)
  try {
    return await fetch(url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'X-Internal-Token': token,
        'X-Request-Id': requestId,
        ...(range ? { Range: range } : {}),
      },
    })
  }
  finally {
    clearTimeout(timeout)
  }
}

const signedLibraryFileRedirect = ({
  documentId,
  disposition,
  filename,
  requestId,
  page,
}: {
  documentId: string
  disposition: 'inline' | 'attachment'
  filename: string
  requestId: string
  page?: number
}) => {
  const baseUrl = process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '')
  const token = process.env.LIBRARY_FILE_SERVICE_TOKEN
  if (!baseUrl || !token)
  { return null }

  const expires = String(Math.floor(Date.now() / 1000) + 300)
  const canonical = `${documentId}\n${disposition}\n${filename}\n${requestId}\n${expires}`
  const signature = createHmac('sha256', token).update(canonical).digest('base64url')
  const url = new URL(`${baseUrl}/library/documents/${encodeURIComponent(documentId)}/file`)
  url.searchParams.set('disposition', disposition)
  url.searchParams.set('filename', filename)
  url.searchParams.set('requestId', requestId)
  url.searchParams.set('expires', expires)
  url.searchParams.set('signature', signature)
  if (page && disposition === 'inline')
  { url.hash = `page=${page}` }

  const headers = new Headers({
    'Cache-Control': 'private, max-age=600, stale-while-revalidate=1800',
    'X-Request-Id': requestId,
    'X-Library-File-Source': 'signed-browser-redirect',
  })
  headers.set('Location', url.toString())
  return new Response(null, { status: 307, headers })
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
  const requestedPage = Number(request.nextUrl.searchParams.get('page') || 0)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : undefined
  const errors: string[] = []
  const matchedDocument = await findKnowledgeDocumentByName(filename, documentId).catch(() => null)
  const resolvedDocumentId = matchedDocument?.id || documentId

  if (request.nextUrl.searchParams.get('proxy') !== '1') {
    const directRedirect = signedLibraryFileRedirect({
      documentId: resolvedDocumentId,
      disposition,
      filename,
      requestId,
      page,
    })
    if (directRedirect)
    { return directRedirect }
  }

  try {
    const serviceResponse = await fetchLibraryFileService({
      documentId: resolvedDocumentId,
      disposition,
      filename,
      requestId,
      range: request.headers.get('range'),
    })
    if (serviceResponse.ok && serviceResponse.body)
    { return streamedResponse(serviceResponse, disposition, filename, requestId, 'server-file-service') }

    const body = await serviceResponse.text().catch(() => '')
    errors.push(`file-service:${serviceResponse.status}:${body.slice(0, 300)}`)
  }
  catch (error) {
    errors.push(`file-service:${error instanceof Error ? error.message : String(error)}`)
  }

  try {
    const signedUrl = await getKnowledgeDocumentDownloadUrl(resolvedDocumentId)
    const upstream = await fetch(signedUrl, {
      cache: 'no-store',
      redirect: 'follow',
      headers: request.headers.get('range') ? { Range: request.headers.get('range')! } : undefined,
    })
    if (!upstream.ok || !upstream.body)
    { throw new Error(`DIFY_DOCUMENT_FILE_UNAVAILABLE:${upstream.status}`) }

    return streamedResponse(upstream, disposition, filename, requestId, 'dify-signed-url')
  }
  catch (error) {
    errors.push(`dify-download:${error instanceof Error ? error.message : String(error)}`)
  }

  try {
    if (/\.pdf$/i.test(filename)) {
      const pageImages = await getKnowledgeDocumentPageImages(resolvedDocumentId)
      if (pageImages.length) {
        const pdf = await buildKnowledgeDocumentPdf(filename, pageImages)
        return byteResponse(request, pdf, 'application/pdf', disposition, filename, 'page-images-pdf', requestId)
      }
    }

    const indexedText = await getKnowledgeDocumentIndexedText(resolvedDocumentId)
    const fallbackFilename = `${filename.replace(/\.[^.]+$/, '') || 'document'}-索引文本.txt`
    const body = [
      `文档：${filename}`,
      '说明：原文件服务和 Dify 下载接口均不可用，以下内容为知识库已索引文本。',
      '',
      indexedText,
    ].join('\n')
    return new Response(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': dispositionHeader(disposition, fallbackFilename),
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=900',
        'X-Content-Type-Options': 'nosniff',
        'X-Dify-Document-Fallback': 'indexed-text',
        'X-Library-File-Source': 'indexed-text',
        'X-Request-Id': requestId,
      },
    })
  }
  catch (error) {
    errors.push(`fallback:${error instanceof Error ? error.message : String(error)}`)
    console.error('[library-document-file] failed', {
      requestId,
      documentId: resolvedDocumentId,
      originalDocumentId: documentId,
      disposition,
      filename,
      upstreamUrl: process.env.LIBRARY_FILE_SERVICE_URL || 'not-configured',
      errors,
    })
    const combinedError = errors.join(' | ')
    const notFound = /:404|NOT_FOUND|not found/i.test(combinedError)
    return documentErrorResponse(
      request,
      `Unable to open document: ${combinedError}`,
      notFound ? 404 : 502,
      requestId,
    )
  }
}

export const HEAD = GET
