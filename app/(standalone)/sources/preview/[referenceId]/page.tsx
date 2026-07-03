import { redirect } from 'next/navigation'
import PdfReferenceViewer from '@/app/components/sources/pdf-reference-viewer'
import { db, withDatabaseRetry } from '@/lib/db'
import { findKnowledgeDocumentByName, getKnowledgeDocumentPageImages } from '@/lib/dify-dataset'
import { toDifyAssetProxyUrl } from '@/lib/dify-assets'
import { cleanReferenceDocumentName } from '@/lib/reference-extractor'
import { getSession } from '@/lib/session'
import { getStaticCourseware } from '@/lib/static-courseware'

export default async function SourcePdfPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ referenceId: string }>
  searchParams: Promise<{ filename?: string, page?: string, returnTo?: string }>
}) {
  const session = await getSession()
  if (!session)
  { redirect('/login') }
  const { referenceId } = await params
  const query = await searchParams
  const page = Math.max(1, Number(query.page || 1) || 1)
  const reference = await withDatabaseRetry(() => db.messageReference.findFirst({
    where: { id: referenceId, appUserId: session.id },
    select: { documentName: true, pageImageUrl: true, rawPayload: true },
  })).catch(() => null)
  const rawPayload = reference?.rawPayload && typeof reference.rawPayload === 'object' && !Array.isArray(reference.rawPayload)
    ? reference.rawPayload as Record<string, unknown>
    : undefined
  const hintedDocumentId = typeof rawPayload?.document_id === 'string' ? rawPayload.document_id : undefined
  const filename = query.filename || cleanReferenceDocumentName(reference?.documentName || '') || '知识库来源.pdf'
  const resolvedDocument = await findKnowledgeDocumentByName(filename, hintedDocumentId).catch(() => null)
  const resolvedDocumentId = resolvedDocument?.id || hintedDocumentId
  const staticCourseware = getStaticCourseware(resolvedDocumentId, filename)
  const pageImageUrl = reference?.pageImageUrl && /\/page_\d+\.(?:jpe?g|png|webp)(?:[?#].*)?$/i.test(reference.pageImageUrl)
    ? reference.pageImageUrl
    : ''
  const isPdfSource = /\.pdf(?:[?#].*)?$/i.test(filename)
  const pageImages = !staticCourseware && resolvedDocumentId && isPdfSource
    ? await getKnowledgeDocumentPageImages(resolvedDocumentId).catch(() => [])
    : []
  const freshPageImage = pageImages.find(item => item.page === page)
    || pageImages[0]
    || (pageImageUrl ? { page, url: pageImageUrl } : undefined)
  const pageImageCount = pageImages.reduce((max, item) => Math.max(max, item.page), 0)
  const shouldUsePageImageFallback = Boolean(!staticCourseware && freshPageImage && (isPdfSource || !resolvedDocumentId))
  const encodedFilename = encodeURIComponent(filename)
  const sourceUrl = resolvedDocumentId
    ? `/api/library/documents/${encodeURIComponent(resolvedDocumentId)}/file?disposition=inline&page=${page}&filename=${encodedFilename}`
    : `/api/sources/${encodeURIComponent(referenceId)}/file?disposition=inline&page=${page}&filename=${encodedFilename}`
  const downloadUrl = resolvedDocumentId
    ? `/api/library/documents/${encodeURIComponent(resolvedDocumentId)}/file?disposition=attachment&filename=${encodedFilename}`
    : `/api/sources/${encodeURIComponent(referenceId)}/file?disposition=attachment&filename=${encodedFilename}`
  return (
    <PdfReferenceViewer
      referenceId={referenceId}
      filename={filename}
      initialPage={page}
      sourceUrl={staticCourseware?.url || sourceUrl}
      downloadUrl={staticCourseware?.url || downloadUrl}
      pageImageUrl={shouldUsePageImageFallback && freshPageImage ? toDifyAssetProxyUrl(freshPageImage.url) : undefined}
      pageImageCount={pageImageCount || undefined}
      backHref={query.returnTo?.startsWith('/') ? query.returnTo : '/sources'}
    />
  )
}
