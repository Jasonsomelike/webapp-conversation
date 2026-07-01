import { redirect } from 'next/navigation'
import PdfReferenceViewer from '@/app/components/sources/pdf-reference-viewer'
import { db, withDatabaseRetry } from '@/lib/db'
import { findKnowledgeDocumentByName, getKnowledgeDocumentPageImages } from '@/lib/dify-dataset'
import { toDifyAssetProxyUrl } from '@/lib/dify-assets'
import { cleanReferenceDocumentName } from '@/lib/reference-extractor'
import { getSession } from '@/lib/session'

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
  const pageImages = resolvedDocumentId
    ? await getKnowledgeDocumentPageImages(resolvedDocumentId).catch(() => [])
    : []
  const pageImageUrl = reference?.pageImageUrl
    || pageImages.find(image => image.page === page)?.url
    || pageImages.find(image => image.page >= page)?.url
    || ''
  const encodedFilename = encodeURIComponent(filename)
  const sourceUrl = resolvedDocumentId
    ? `/api/library/documents/${encodeURIComponent(resolvedDocumentId)}/file?disposition=inline&filename=${encodedFilename}`
    : undefined
  const downloadUrl = resolvedDocumentId
    ? `/api/library/documents/${encodeURIComponent(resolvedDocumentId)}/file?disposition=attachment&filename=${encodedFilename}`
    : undefined
  return (
    <PdfReferenceViewer
      referenceId={referenceId}
      filename={filename}
      initialPage={page}
      sourceUrl={sourceUrl}
      downloadUrl={downloadUrl}
      pageImageUrl={pageImageUrl ? toDifyAssetProxyUrl(pageImageUrl) : undefined}
      backHref={query.returnTo?.startsWith('/') ? query.returnTo : '/sources'}
    />
  )
}
