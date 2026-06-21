import 'server-only'

import { unstable_cache } from 'next/cache'
import { fetchDify } from '@/lib/dify-server'

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
  data_source_info?: {
    upload_file_id?: string
  }
  data_source_detail_dict?: {
    upload_file?: {
      id?: string
      name?: string
      size?: number
      extension?: string
      mime_type?: string
    }
  }
}

export interface DifyDocumentList {
  data: DifyKnowledgeDocument[]
  has_more: boolean
  limit: number
  total: number
  page: number
}

interface DifyDocumentSegment {
  id: string
  position?: number
  content?: string
}

interface DifyDocumentSegmentList {
  data: DifyDocumentSegment[]
  has_more?: boolean
  total?: number
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
  async (page: number, limit: number, keyword: string, status: string) =>
    fetchKnowledgeDocuments({ page, limit, keyword, status }),
  ['dify-knowledge-documents-v2'],
  { revalidate: 300 },
)

export const listKnowledgeDocuments = ({
  page = 1,
  limit = 20,
  keyword = '',
  status = '',
}: {
  page?: number
  limit?: number
  keyword?: string
  status?: string
} = {}) => cachedKnowledgeDocuments(page, limit, keyword, status)

export const refreshKnowledgeDocuments = fetchKnowledgeDocuments

export const getKnowledgeDocumentDownloadUrl = async (documentId: string) => {
  const apiKey = process.env.DIFY_DATASET_API_KEY
  const datasetId = process.env.DIFY_DATASET_ID
  if (!apiKey || !datasetId)
  { throw new Error('DIFY_DATASET_NOT_CONFIGURED') }

  const response = await fetchDify(
    `/datasets/${encodeURIComponent(datasetId)}/documents/${encodeURIComponent(documentId)}/download`,
    { method: 'GET' },
    { apiKey, connectTimeoutMs: 10_000, retries: 1 },
  )
  if (!response.ok)
  { throw new Error(`DIFY_DOCUMENT_DOWNLOAD_FAILED:${response.status}`) }
  const result = await response.json() as { url?: string }
  if (!result.url)
  { throw new Error('DIFY_DOCUMENT_DOWNLOAD_URL_MISSING') }
  return result.url
}

export const getKnowledgeDocumentIndexedText = async (documentId: string) => {
  const apiKey = process.env.DIFY_DATASET_API_KEY
  const datasetId = process.env.DIFY_DATASET_ID
  if (!apiKey || !datasetId)
  { throw new Error('DIFY_DATASET_NOT_CONFIGURED') }

  const sections: string[] = []
  let page = 1
  let hasMore = true
  let totalCharacters = 0

  while (hasMore && page <= 20 && totalCharacters < 8_000_000) {
    const response = await fetchDify(
      `/datasets/${encodeURIComponent(datasetId)}/documents/${encodeURIComponent(documentId)}/segments?page=${page}&limit=100`,
      { method: 'GET' },
      { apiKey, connectTimeoutMs: 10_000, retries: 1 },
    )
    if (!response.ok)
    { throw new Error(`DIFY_DOCUMENT_SEGMENTS_FAILED:${response.status}`) }

    const result = await response.json() as DifyDocumentSegmentList
    result.data.forEach((segment, index) => {
      if (!segment.content)
      { return }
      const position = segment.position || ((page - 1) * 100 + index + 1)
      const section = `【索引片段 ${position}】\n${segment.content.trim()}`
      sections.push(section)
      totalCharacters += section.length
    })
    hasMore = Boolean(result.has_more) && result.data.length > 0
    page += 1
  }

  if (!sections.length)
  { throw new Error('DIFY_DOCUMENT_SEGMENTS_EMPTY') }
  return sections.join('\n\n────────────────────────────────────────\n\n')
}

export interface KnowledgeDocumentPageImage {
  page: number
  url: string
}

export const getKnowledgeDocumentPageImages = async (documentId: string) => {
  const apiKey = process.env.DIFY_DATASET_API_KEY
  const datasetId = process.env.DIFY_DATASET_ID
  if (!apiKey || !datasetId)
  { throw new Error('DIFY_DATASET_NOT_CONFIGURED') }

  const images = new Map<number, string>()
  let page = 1
  let hasMore = true

  while (hasMore && page <= 20 && images.size < 500) {
    const response = await fetchDify(
      `/datasets/${encodeURIComponent(datasetId)}/documents/${encodeURIComponent(documentId)}/segments?page=${page}&limit=100`,
      { method: 'GET' },
      { apiKey, connectTimeoutMs: 15_000, retries: 2 },
    )
    if (!response.ok)
    { throw new Error(`DIFY_DOCUMENT_SEGMENTS_FAILED:${response.status}`) }

    const result = await response.json() as DifyDocumentSegmentList
    result.data.forEach((segment) => {
      if (!segment.content)
      { return }
      const matches = segment.content.matchAll(
        /!\[[^\]]*]\((https:\/\/(?:dify\.jasonsome\.cn(?::22380)?|www\.jasonsome\.cn|jasonsome\.cn)\/page-images\/[^\s)]+\.(?:jpe?g|png|webp))\)/gi,
      )
      for (const match of matches) {
        const pageMatch = match[1].match(/\/page_(\d+)\.(?:jpe?g|png|webp)$/i)
        const pageNumber = Number(pageMatch?.[1] || segment.position || images.size + 1)
        if (Number.isFinite(pageNumber) && !images.has(pageNumber))
        { images.set(pageNumber, match[1]) }
      }
    })
    hasMore = Boolean(result.has_more) && result.data.length > 0
    page += 1
  }

  return [...images.entries()]
    .sort(([left], [right]) => left - right)
    .map(([imagePage, url]) => ({ page: imagePage, url }))
}
