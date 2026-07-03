import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db, withDatabaseRetry } from '@/lib/db'
import { findKnowledgeDocumentByName, getKnowledgeDocumentPageImages } from '@/lib/dify-dataset'
import { toDirectDifyAssetUrl } from '@/lib/dify-assets'
import { cleanReferenceDocumentName } from '@/lib/reference-extractor'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return Response.json({ error: 'Unauthorized' }, { status: 401 }) }

  const imageUrl = request.nextUrl.searchParams.get('url')?.trim()
  if (!imageUrl || imageUrl.length > 2000)
  { return Response.json({ error: 'Invalid image URL' }, { status: 400 }) }

  const imagePath = (() => {
    try {
      return new URL(imageUrl).pathname
    }
    catch {
      return imageUrl.split(/[?#]/)[0]
    }
  })()
  const pageImageKey = imagePath.match(/\/page-images\/[^/]+\/page_\d+\.(?:jpe?g|png|webp)$/i)?.[0]
  const candidates = [...new Set([imageUrl, imagePath, pageImageKey].filter(Boolean))] as string[]

  const reference = await withDatabaseRetry(() => db.messageReference.findFirst({
    where: {
      appUserId: session.id,
      OR: candidates.flatMap(candidate => [
        { pageImageUrl: candidate },
        { sourceUrl: candidate },
        { pageImageUrl: { contains: candidate } },
        { sourceUrl: { contains: candidate } },
      ]),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      documentName: true,
      pageNumber: true,
      originalPageNumber: true,
      pageImageUrl: true,
      rawPayload: true,
    },
  })).catch(() => null)

  if (!reference)
  { return Response.json({ error: 'Source not recorded yet' }, { status: 404 }) }

  const inferredPage = Number(reference.pageImageUrl?.match(/\/page_(\d+)\./i)?.[1] || 0) || undefined
  const documentName = cleanReferenceDocumentName(reference.documentName || '课程知识库原页')
  const pageNumber = inferredPage || reference.pageNumber || reference.originalPageNumber || 1
  const rawPayload = reference.rawPayload && typeof reference.rawPayload === 'object' && !Array.isArray(reference.rawPayload)
    ? reference.rawPayload as Record<string, unknown>
    : undefined
  const hintedDocumentId = typeof rawPayload?.document_id === 'string' ? rawPayload.document_id : undefined
  const resolvedDocument = documentName
    ? await findKnowledgeDocumentByName(documentName, hintedDocumentId).catch(() => null)
    : null
  const documentId = resolvedDocument?.id || hintedDocumentId
  const freshPageImages = documentId
    ? await getKnowledgeDocumentPageImages(documentId).catch(() => [])
    : []
  const freshPageImageUrl = freshPageImages.find(item => item.page === pageNumber)?.url
  const directImageUrl = toDirectDifyAssetUrl(freshPageImageUrl || reference.pageImageUrl || imageUrl)
  const previewUrl = new URL(`/sources/preview/${encodeURIComponent(reference.id)}`, request.url)
  previewUrl.searchParams.set('page', String(pageNumber))
  previewUrl.searchParams.set('filename', documentName)
  const returnTo = request.nextUrl.searchParams.get('returnTo')
  if (returnTo?.startsWith('/'))
  { previewUrl.searchParams.set('returnTo', returnTo) }

  if (request.nextUrl.searchParams.get('redirect') === '1')
  { return NextResponse.redirect(previewUrl) }

  return Response.json({
    referenceId: reference.id,
    previewUrl: `${previewUrl.pathname}${previewUrl.search}`,
    imageUrl: directImageUrl || `/api/sources/${encodeURIComponent(reference.id)}/page-image?page=${pageNumber}`,
    documentName: cleanReferenceDocumentName(reference.documentName || '课程知识库原页'),
    pageNumber,
    pageCount: freshPageImages.reduce((max, item) => Math.max(max, item.page), 0) || undefined,
  }, {
    headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=600' },
  })
}
