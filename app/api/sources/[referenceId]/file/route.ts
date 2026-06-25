import { createHmac, randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { db, withDatabaseRetry } from '@/lib/db'
import { getKnowledgeDocumentDownloadUrl } from '@/lib/dify-dataset'
import { cleanReferenceDocumentName } from '@/lib/reference-extractor'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'
export const maxDuration = 300

const documentNameKey = (value: unknown) =>
  cleanReferenceDocumentName(value)
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase()

const signedReferenceFileRedirect = ({
  documentName,
  disposition,
  filename,
  requestId,
  page,
}: {
  documentName: string
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
  const canonical = `${documentName}\n${disposition}\n${filename}\n${requestId}\n${expires}`
  const signature = createHmac('sha256', token).update(canonical).digest('base64url')
  const url = new URL(`${baseUrl}/library/documents/by-name/file`)
  url.searchParams.set('name', documentName)
  url.searchParams.set('disposition', disposition)
  url.searchParams.set('filename', filename)
  url.searchParams.set('requestId', requestId)
  url.searchParams.set('expires', expires)
  url.searchParams.set('signature', signature)
  if (page && disposition === 'inline')
  { url.hash = `page=${page}` }

  return new Response(null, {
    status: 307,
    headers: {
      'Location': url.toString(),
      'Cache-Control': 'private, max-age=300, stale-while-revalidate=900',
      'X-Request-Id': requestId,
      'X-Library-File-Source': 'signed-reference-name-redirect',
    },
  })
}

const signedReferenceDocumentRedirect = ({
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

  return new Response(null, {
    status: 307,
    headers: {
      'Location': url.toString(),
      'Cache-Control': 'private, max-age=300, stale-while-revalidate=900',
      'X-Request-Id': requestId,
      'X-Library-File-Source': 'signed-reference-document-redirect',
    },
  })
}

const proxiedReferenceFile = async ({
  documentId,
  documentName,
  filename,
  requestId,
  range,
}: {
  documentId?: string
  documentName: string
  filename: string
  requestId: string
  range: string | null
}) => {
  const baseUrl = process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '')
  const token = process.env.LIBRARY_FILE_SERVICE_TOKEN
  if (!baseUrl || !token)
  { return null }

  const expires = String(Math.floor(Date.now() / 1000) + 300)
  const canonical = `${documentName}\ninline\n${filename}\n${requestId}\n${expires}`
  const signature = createHmac('sha256', token).update(canonical).digest('base64url')
  const url = new URL(`${baseUrl}/library/documents/by-name/file`)
  url.searchParams.set('name', documentName)
  url.searchParams.set('disposition', 'inline')
  url.searchParams.set('filename', filename)
  url.searchParams.set('requestId', requestId)
  url.searchParams.set('expires', expires)
  url.searchParams.set('signature', signature)

  const errors: string[] = []
  let upstream: Response | undefined
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
      headers: range ? { Range: range } : undefined,
    })
    if (response.ok && response.body)
    { upstream = response }
    else
    { errors.push(`name-service:${response.status}`) }
  }
  catch (error) {
    errors.push(`name-service:${error instanceof Error ? error.message : String(error)}`)
  }

  if (!upstream && documentId) {
    try {
      const directUrl = new URL(`${baseUrl}/library/documents/${encodeURIComponent(documentId)}/file`)
      directUrl.searchParams.set('disposition', 'inline')
      directUrl.searchParams.set('filename', filename)
      const response = await fetch(directUrl, {
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
        headers: {
          'X-Internal-Token': token,
          'X-Request-Id': requestId,
          ...(range ? { Range: range } : {}),
        },
      })
      if (response.ok && response.body)
      { upstream = response }
      else
      { errors.push(`id-service:${response.status}`) }
    }
    catch (error) {
      errors.push(`id-service:${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (!upstream && documentId) {
    try {
      const signedUrl = await getKnowledgeDocumentDownloadUrl(documentId)
      const response = await fetch(signedUrl, {
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
        headers: range ? { Range: range } : undefined,
      })
      if (response.ok && response.body)
      { upstream = response }
      else
      { errors.push(`dify-download:${response.status}`) }
    }
    catch (error) {
      errors.push(`dify-download:${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (!upstream?.body) {
    console.error('[reference-file] all proxy sources failed', {
      requestId,
      documentId,
      documentName,
      errors,
    })
    return new Response(`Unable to proxy reference file. ${errors.join(' | ')}`, {
      status: 502,
      headers: { 'X-Request-Id': requestId },
    })
  }

  const headers = new Headers({
    'Content-Type': upstream.headers.get('Content-Type') || 'application/pdf',
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    'Cache-Control': 'private, max-age=600, stale-while-revalidate=1800',
    'Accept-Ranges': upstream.headers.get('Accept-Ranges') || 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': requestId,
    'X-Library-File-Source': 'proxied-reference-name-file',
  })
  ;['Content-Length', 'Content-Range', 'ETag', 'Last-Modified'].forEach((name) => {
    const value = upstream.headers.get(name)
    if (value)
    { headers.set(name, value) }
  })
  return new Response(upstream.body, { status: upstream.status, headers })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ referenceId: string }> },
) {
  const requestId = randomUUID()
  const session = getSessionFromRequest(request)
  if (!session)
  { return new Response('Unauthorized', { status: 401, headers: { 'X-Request-Id': requestId } }) }

  const { referenceId } = await params
  const reference = await withDatabaseRetry(() => db.messageReference.findFirst({
    where: { id: referenceId, appUserId: session.id },
    select: { documentName: true, pageNumber: true, pageImageUrl: true, rawPayload: true },
  })).catch((error) => {
    console.error('[reference-file] ownership lookup failed', { requestId, referenceId, error })
    return null
  })
  if (!reference)
  { return new Response('Reference not found', { status: 404, headers: { 'X-Request-Id': requestId } }) }

  const documentName = cleanReferenceDocumentName(reference.documentName || '')
  if (!documentName)
  { return new Response('Reference has no document name', { status: 404, headers: { 'X-Request-Id': requestId } }) }

  const disposition = request.nextUrl.searchParams.get('disposition') === 'attachment'
    ? 'attachment'
    : 'inline'
  const filename = (request.nextUrl.searchParams.get('filename') || documentName)
    .replace(/["\r\n]/g, '_')
  const inferredPage = Number(reference.pageImageUrl?.match(/\/page_(\d+)\./i)?.[1] || 0) || undefined
  const page = reference.pageNumber || inferredPage
  const rawPayload = reference.rawPayload && typeof reference.rawPayload === 'object' && !Array.isArray(reference.rawPayload)
    ? reference.rawPayload as Record<string, unknown>
    : undefined
  let documentId = typeof rawPayload?.document_id === 'string' ? rawPayload.document_id : undefined
  if (!documentId) {
    const catalog = await withDatabaseRetry(() => db.knowledgeDocumentCatalog.findUnique({
      where: { id: 'default' },
      select: { documents: true },
    })).catch(() => null)
    const documents = Array.isArray(catalog?.documents) ? catalog.documents as Array<Record<string, unknown>> : []
    const targetNameKey = documentNameKey(documentName)
    const candidates = documents
      .map(item => ({ item, key: documentNameKey(item.name) }))
      .filter(({ key }) => key && (
        key === targetNameKey
        || key.includes(targetNameKey)
        || targetNameKey.includes(key)
      ))
      .sort((left, right) => right.key.length - left.key.length)
    const matched = candidates[0]?.item
    if (matched && typeof matched.id === 'string')
    { documentId = matched.id }
  }

  if (disposition === 'inline' && request.nextUrl.searchParams.get('proxy') === '1') {
    return await proxiedReferenceFile({
      documentId,
      documentName,
      filename,
      requestId,
      range: request.headers.get('range'),
    }) || new Response('Reference file service is not configured', {
      status: 503,
      headers: { 'X-Request-Id': requestId },
    })
  }

  // References created by Dify occasionally contain a slightly different
  // document name from the catalog. When we know the document ID, use the
  // exact same stable file route as the knowledge-library preview.
  if (documentId) {
    const documentRedirect = signedReferenceDocumentRedirect({
      documentId,
      disposition,
      filename,
      requestId,
      page: page || undefined,
    })
    if (documentRedirect)
    { return documentRedirect }
  }

  return signedReferenceFileRedirect({
    documentName,
    disposition,
    filename,
    requestId,
    page: page || undefined,
  }) || new Response('Reference file service is not configured', {
    status: 503,
    headers: { 'X-Request-Id': requestId },
  })
}

export const HEAD = GET
