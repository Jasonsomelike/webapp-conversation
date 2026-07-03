import { redirect } from 'next/navigation'
import PdfReferenceViewer from '@/app/components/sources/pdf-reference-viewer'
import { findKnowledgeDocumentByName, getKnowledgeDocumentPageImages } from '@/lib/dify-dataset'
import { toDifyAssetProxyUrl } from '@/lib/dify-assets'
import { getSession } from '@/lib/session'
import { getStaticCourseware } from '@/lib/static-courseware'

export default async function LibraryPdfPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>
  searchParams: Promise<{ filename?: string, page?: string, returnTo?: string }>
}) {
  const session = await getSession()
  if (!session)
  { redirect('/login') }

  const { documentId } = await params
  const query = await searchParams
  const filename = query.filename || '知识库文档.pdf'
  const page = Math.max(1, Number(query.page || 1) || 1)
  const currentDocument = filename ? await findKnowledgeDocumentByName(filename, documentId).catch(() => null) : null
  const resolvedDocumentId = currentDocument?.id || documentId
  const encodedId = encodeURIComponent(resolvedDocumentId)
  const encodedFilename = encodeURIComponent(filename)
  const staticCourseware = getStaticCourseware(resolvedDocumentId, filename)
  const pageImages = !staticCourseware && /\.pdf(?:[?#].*)?$/i.test(filename)
    ? await getKnowledgeDocumentPageImages(resolvedDocumentId).catch(() => [])
    : []
  const pageImage = pageImages.find(item => item.page === page) || pageImages[0]
  const pageImageCount = pageImages.reduce((max, item) => Math.max(max, item.page), 0)
  return (
    <PdfReferenceViewer
      filename={filename}
      initialPage={page}
      sourceUrl={staticCourseware?.url || `/api/library/documents/${encodedId}/file?disposition=inline&page=${page}&filename=${encodedFilename}`}
      downloadUrl={staticCourseware?.url || `/api/library/documents/${encodedId}/file?disposition=attachment&filename=${encodedFilename}`}
      pageImageUrl={pageImage ? toDifyAssetProxyUrl(pageImage.url) : undefined}
      pageImageCount={pageImageCount || undefined}
      backHref={query.returnTo?.startsWith('/') ? query.returnTo : '/library'}
    />
  )
}
