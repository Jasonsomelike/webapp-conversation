import { redirect } from 'next/navigation'
import PdfReferenceViewer from '@/app/components/sources/pdf-reference-viewer'
import { db, withDatabaseRetry } from '@/lib/db'
import { toDifyAssetProxyUrl } from '@/lib/dify-assets'
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
    select: { pageImageUrl: true },
  })).catch(() => null)
  return (
    <PdfReferenceViewer
      referenceId={referenceId}
      filename={query.filename || '知识库来源.pdf'}
      initialPage={page}
      pageImageUrl={reference?.pageImageUrl ? toDifyAssetProxyUrl(reference.pageImageUrl) : undefined}
      backHref={query.returnTo?.startsWith('/') ? query.returnTo : '/sources'}
    />
  )
}
