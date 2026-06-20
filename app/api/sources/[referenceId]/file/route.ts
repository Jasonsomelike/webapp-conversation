import { createHmac, randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { db, withDatabaseRetry } from '@/lib/db'
import { cleanReferenceDocumentName } from '@/lib/reference-extractor'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'

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
      'Cache-Control': 'private, no-store',
      'X-Request-Id': requestId,
      'X-Library-File-Source': 'signed-reference-name-redirect',
    },
  })
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
    select: { documentName: true, pageNumber: true, pageImageUrl: true },
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
