import { redirect } from 'next/navigation'
import DocumentLibrary from '@/app/components/library/document-library'
import { listKnowledgeDocuments, type DifyDocumentList } from '@/lib/dify-dataset'
import { getSession } from '@/lib/session'

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
    error = caught instanceof Error && caught.message === 'DIFY_DATASET_NOT_CONFIGURED'
      ? '知识库 API 尚未配置，请在部署环境设置服务端密钥和知识库 ID。'
      : '暂时无法读取 Dify 知识库，请稍后重试。'
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
