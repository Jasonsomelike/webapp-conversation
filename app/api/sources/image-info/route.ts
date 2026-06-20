import type { NextRequest } from 'next/server'
import { db, withDatabaseRetry } from '@/lib/db'
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

  const reference = await withDatabaseRetry(() => db.messageReference.findFirst({
    where: {
      appUserId: session.id,
      OR: [
        { pageImageUrl: imageUrl },
        { sourceUrl: imageUrl },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: { documentName: true, pageNumber: true, pageImageUrl: true },
  })).catch(() => null)

  if (!reference)
  { return Response.json({ error: 'Source not recorded yet' }, { status: 404 }) }

  const inferredPage = Number(reference.pageImageUrl?.match(/\/page_(\d+)\./i)?.[1] || 0) || undefined
  return Response.json({
    documentName: cleanReferenceDocumentName(reference.documentName || '课程知识库原页'),
    pageNumber: reference.pageNumber || inferredPage,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  })
}
