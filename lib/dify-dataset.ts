import 'server-only'

import { unstable_cache } from 'next/cache'
import { difyApiBaseUrl, fetchDify } from '@/lib/dify-server'

export interface DifyKnowledgeDocument {
  id: string
  name: string
  position?: number
  data_source_type?: string
  created_from?: string
  created_at?: number
  tokens?: number
  indexing_status?: string
  display_status?: string
  error?: string | null
  enabled?: boolean
  archived?: boolean
  word_count?: number
  hit_count?: number
  doc_form?: string
}

export interface DifyDocumentList {
  data: DifyKnowledgeDocument[]
  has_more: boolean
  limit: number
  total: number
  page: number
}

const fetchKnowledgeDocuments = async ({
  page = 1,
  limit = 20,
  keyword = '',
  status = '',
}: {
  page?: number
  limit?: number
  keyword?: string
  status?: string
}): Promise<DifyDocumentList> => {
  const apiKey = process.env.DIFY_DATASET_API_KEY
  const datasetId = process.env.DIFY_DATASET_ID
  if (!apiKey || !datasetId)
  { throw new Error('DIFY_DATASET_NOT_CONFIGURED') }

  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    limit: String(Math.min(100, Math.max(1, limit))),
  })
  if (keyword)
  { params.set('keyword', keyword) }
  if (status)
  { params.set('status', status) }

  const response = await fetchDify(
    `/datasets/${encodeURIComponent(datasetId)}/documents?${params}`,
    { method: 'GET' },
    { apiKey, connectTimeoutMs: 8_000, retries: 1 },
  )
  if (!response.ok)
  { throw new Error(`DIFY_DATASET_REQUEST_FAILED:${response.status}`) }
  return response.json()
}

const cachedKnowledgeDocuments = unstable_cache(
  fetchKnowledgeDocuments,
  ['dify-knowledge-documents', difyApiBaseUrl],
  { revalidate: 300, tags: ['dify-knowledge-documents'] },
)

export const listKnowledgeDocuments = cachedKnowledgeDocuments
