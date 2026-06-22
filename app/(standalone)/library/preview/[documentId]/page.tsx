import { redirect } from 'next/navigation'
import PdfReferenceViewer from '@/app/components/sources/pdf-reference-viewer'
import { getSession } from '@/lib/session'

export default async function LibraryPdfPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>
  searchParams: Promise<{ filename?: string, page?: string }>
}) {
  const session = await getSession()
  if (!session)
  { redirect('/login') }

  const { documentId } = await params
  const query = await searchParams
  const filename = query.filename || '知识库文档.pdf'
  const page = Math.max(1, Number(query.page || 1) || 1)
  const encodedId = encodeURIComponent(documentId)
  const encodedFilename = encodeURIComponent(filename)

  return (
    <PdfReferenceViewer
      filename={filename}
      initialPage={page}
      sourceUrl={`/api/library/documents/${encodedId}/file?disposition=inline&filename=${encodedFilename}`}
      downloadUrl={`/api/library/documents/${encodedId}/file?disposition=attachment&filename=${encodedFilename}`}
    />
  )
}
