import { redirect } from 'next/navigation'
import DocumentLibrary from '@/app/components/library/document-library'
import { listKnowledgeDocuments, type DifyDocumentList } from '@/lib/dify-dataset'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string, keyword?: string, status?: string }>
}) {
  const session = await getSession()
  if (!session)
  { redirect('/login') }

  const params = await searchParams
  const page = Math.max(1, Number(params.page || 1))
  let error = ''
  let result: DifyDocumentList = { data: [], has_more: false, limit: 20, total: 0, page }
  try {
    result = await listKnowledgeDocuments({
      page,
      limit: 20,
      keyword: params.keyword || '',
      status: params.status || '',
    })
  }
  catch (caught) {
    error = caught instanceof Error && caught.message === 'LIBRARY_CATALOG_EMPTY'
      ? '知识库目录缓存尚未初始化，请点击“刷新”获取最新目录。'
      : '暂时无法读取服务端知识库目录，请稍后重试。'
  }

  return (
    <DocumentLibrary
      result={result}
      keyword={params.keyword || ''}
      status={params.status || ''}
      error={error}
    />
  )
}
