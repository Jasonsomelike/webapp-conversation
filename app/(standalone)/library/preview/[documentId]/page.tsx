import { redirect } from 'next/navigation'
import PdfReferenceViewer from '@/app/components/sources/pdf-reference-viewer'
import { findKnowledgeDocumentByName } from '@/lib/dify-dataset'
import { getSession } from '@/lib/session'

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
  return (
    <PdfReferenceViewer
      filename={filename}
      initialPage={page}
      sourceUrl={`/api/library/documents/${encodedId}/file?proxy=1&disposition=inline&page=${page}&filename=${encodedFilename}`}
      downloadUrl={`/api/library/documents/${encodedId}/file?proxy=1&disposition=attachment&filename=${encodedFilename}`}
      backHref={query.returnTo?.startsWith('/') ? query.returnTo : '/library'}
    />
  )
}
