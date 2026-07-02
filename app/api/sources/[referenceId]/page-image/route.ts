import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db, withDatabaseRetry } from '@/lib/db'
import { findKnowledgeDocumentByName, getKnowledgeDocumentPageImages } from '@/lib/dify-dataset'
import { toDifyAssetProxyUrl } from '@/lib/dify-assets'
import { cleanReferenceDocumentName } from '@/lib/reference-extractor'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'

const inferPageFromImageUrl = (value?: string | null) =>
  Number(String(value || '').match(/\/page_(\d+)\./i)?.[1] || 0) || undefined

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ referenceId: string }> },
) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return new Response('Unauthorized', { status: 401 }) }

  const { referenceId } = await params
  const reference = await withDatabaseRetry(() => db.messageReference.findFirst({
    where: { id: referenceId, appUserId: session.id },
    select: {
      documentName: true,
      pageNumber: true,
      originalPageNumber: true,
      pageImageUrl: true,
      rawPayload: true,
    },
  })).catch(() => null)

  if (!reference)
  { return new Response('Reference not found', { status: 404 }) }

  const documentName = cleanReferenceDocumentName(reference.documentName || '')
  const requestedPage = Number(request.nextUrl.searchParams.get('page') || 0)
  const page = Number.isFinite(requestedPage) && requestedPage > 0
    ? requestedPage
    : inferPageFromImageUrl(reference.pageImageUrl) || reference.pageNumber || reference.originalPageNumber || 1
  const rawPayload = reference.rawPayload && typeof reference.rawPayload === 'object' && !Array.isArray(reference.rawPayload)
    ? reference.rawPayload as Record<string, unknown>
    : undefined
  const hintedDocumentId = typeof rawPayload?.document_id === 'string' ? rawPayload.document_id : undefined
  const resolvedDocument = documentName
    ? await findKnowledgeDocumentByName(documentName, hintedDocumentId).catch(() => null)
    : null
  const documentId = resolvedDocument?.id || hintedDocumentId

  if (documentId) {
    const pageImages = await getKnowledgeDocumentPageImages(documentId).catch(() => [])
    const image = pageImages.find(item => item.page === page)
    if (image) {
      const target = toDifyAssetProxyUrl(image.url)
      if (request.nextUrl.searchParams.get('json') === '1') {
        return Response.json({
          page,
          imageUrl: target,
          pageCount: pageImages.reduce((max, item) => Math.max(max, item.page), 0),
        }, {
          headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=600' },
        })
      }
      return NextResponse.redirect(target, {
        headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=600' },
      })
    }
  }

  if (reference.pageImageUrl) {
    const target = toDifyAssetProxyUrl(reference.pageImageUrl)
    if (request.nextUrl.searchParams.get('json') === '1')
    { return Response.json({ page, imageUrl: target }, { headers: { 'Cache-Control': 'private, max-age=60' } }) }
    return NextResponse.redirect(target)
  }

  return new Response('Page image not found', { status: 404 })
}
