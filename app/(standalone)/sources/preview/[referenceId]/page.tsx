import { redirect } from 'next/navigation'
import PdfReferenceViewer from '@/app/components/sources/pdf-reference-viewer'
import { getSession } from '@/lib/session'

export default async function SourcePdfPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ referenceId: string }>
  searchParams: Promise<{ filename?: string, page?: string }>
}) {
  const session = await getSession()
  if (!session)
  { redirect('/login') }
  const { referenceId } = await params
  const query = await searchParams
  const page = Math.max(1, Number(query.page || 1) || 1)
  return (
    <PdfReferenceViewer
      referenceId={referenceId}
      filename={query.filename || '知识库来源.pdf'}
      initialPage={page}
      backHref="/sources"
    />
  )
}
