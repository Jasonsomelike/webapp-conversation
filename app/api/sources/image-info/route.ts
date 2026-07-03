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

  const imageUrl = request.nextUrl.searchParams.get('url')?.trim() || ''
  const hintedFilename = cleanReferenceDocumentName(request.nextUrl.searchParams.get('filename') || '')
  const hintedPage = Number(request.nextUrl.searchParams.get('page') || 0) || undefined
  if ((!imageUrl && !hintedFilename) || imageUrl.length > 2000)
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
  const pageFromUrl = Number((imagePath || imageUrl).match(/\/page-images\/[^/]+\/page_(\d+)\./i)?.[1] || 0) || undefined
  const candidates = [...new Set([imageUrl, imagePath, pageImageKey].filter(Boolean))] as string[]

  const selectReferenceFields = {
    id: true,
    documentName: true,
    pageNumber: true,
    originalPageNumber: true,
    pageImageUrl: true,
    rawPayload: true,
  } as const

  const hintedReference = hintedFilename
    ? await withDatabaseRetry(() => db.messageReference.findFirst({
      where: {
        appUserId: session.id,
        AND: [
          {
            OR: [
              { documentName: hintedFilename },
              { documentName: { contains: hintedFilename } },
            ],
          },
          ...(hintedPage
            ? [{
              OR: [
                { pageNumber: hintedPage },
                { originalPageNumber: hintedPage },
                { pageImageUrl: { contains: `/page_${hintedPage}.` } },
                { sourceUrl: { contains: `/page_${hintedPage}.` } },
              ],
            }]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: selectReferenceFields,
    })).catch(() => null)
    : null

  const urlReference = candidates.length
    ? await withDatabaseRetry(() => db.messageReference.findFirst({
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
      select: selectReferenceFields,
    })).catch(() => null)
    : null

  const reference = hintedReference || urlReference

  const inferredPage = Number(reference?.pageImageUrl?.match(/\/page_(\d+)\./i)?.[1] || 0) || undefined
  const documentName = hintedFilename || cleanReferenceDocumentName(reference?.documentName || '课程知识库原页')
  const pageNumber = hintedPage || pageFromUrl || inferredPage || reference?.pageNumber || reference?.originalPageNumber || 1
  const rawPayload = reference?.rawPayload && typeof reference.rawPayload === 'object' && !Array.isArray(reference.rawPayload)
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
  const directImageUrl = toDirectDifyAssetUrl(freshPageImageUrl || reference?.pageImageUrl || imageUrl)
  const previewPath = reference?.id
    ? `/sources/preview/${encodeURIComponent(reference.id)}`
    : documentId
      ? `/library/preview/${encodeURIComponent(documentId)}`
      : ''
  if (!previewPath)
  { return Response.json({ error: 'Source not recorded yet' }, { status: 404 }) }

  const previewUrl = new URL(previewPath, request.url)
  previewUrl.searchParams.set('page', String(pageNumber))
  previewUrl.searchParams.set('filename', documentName)
  const returnTo = request.nextUrl.searchParams.get('returnTo')
  if (returnTo?.startsWith('/'))
  { previewUrl.searchParams.set('returnTo', returnTo) }

  if (request.nextUrl.searchParams.get('redirect') === '1')
  { return NextResponse.redirect(previewUrl) }

  return Response.json({
    referenceId: reference?.id,
    previewUrl: `${previewUrl.pathname}${previewUrl.search}`,
    imageUrl: directImageUrl || (reference?.id ? `/api/sources/${encodeURIComponent(reference.id)}/page-image?page=${pageNumber}` : ''),
    documentName,
    pageNumber,
    pageCount: freshPageImages.reduce((max, item) => Math.max(max, item.page), 0) || undefined,
  }, {
    headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=600' },
  })
}
