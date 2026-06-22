import 'server-only'

import type { Prisma } from '@prisma/client'
import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'
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
  refreshed_at?: string
  stale?: boolean
  refresh_error?: string
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

let catalogTablePromise: Promise<unknown> | undefined

const ensureKnowledgeDocumentCatalogTable = async () => {
  catalogTablePromise ||= withDatabaseRetry(() => db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "knowledge_document_catalog" (
      "id" VARCHAR(32) NOT NULL DEFAULT 'default',
      "documents" JSONB NOT NULL,
      "total" INTEGER NOT NULL,
      "refreshed_at" TIMESTAMPTZ NOT NULL,
      "refresh_error" TEXT,
      "failed_at" TIMESTAMPTZ,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "knowledge_document_catalog_pkey" PRIMARY KEY ("id")
    )
  `)).catch((error) => {
    catalogTablePromise = undefined
    throw error
  })
  await catalogTablePromise
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

const fetchCompleteKnowledgeCatalog = async () => {
  const serviceUrl = process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '')
  const serviceToken = process.env.LIBRARY_FILE_SERVICE_TOKEN
  if (serviceUrl && serviceToken) {
    const serviceErrors: string[] = []
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(new Error('LIBRARY_CATALOG_SERVICE_TIMEOUT')),
        25_000,
      )
      try {
        const response = await fetch(`${serviceUrl}/library/documents/catalog`, {
          cache: 'no-store',
          signal: controller.signal,
          headers: { 'X-Internal-Token': serviceToken },
        })
        if (response.ok) {
          const result = await response.json() as { data?: unknown }
          return normalizeCatalogDocuments(result.data)
        }
        serviceErrors.push(`attempt-${attempt + 1}:${response.status}`)
        if (response.status === 401 || response.status === 403)
        { break }
      }
      catch (error) {
        serviceErrors.push(`attempt-${attempt + 1}:${error instanceof Error ? error.message : String(error)}`)
      }
      finally {
        clearTimeout(timeout)
      }
      if (attempt < 2)
      { await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))) }
    }
    console.warn('[library-catalog] local catalog service unavailable, using Dify API fallback', {
      errors: serviceErrors,
    })
  }

  const documents: DifyKnowledgeDocument[] = []
  let page = 1
  let hasMore = true
  while (hasMore && page <= 100) {
    const result = await fetchKnowledgeDocuments({ page, limit: 100 })
    documents.push(...result.data)
    hasMore = result.has_more && result.data.length > 0
    page += 1
  }
  return documents
}

const normalizeCatalogDocuments = (value: unknown): DifyKnowledgeDocument[] => {
  if (!Array.isArray(value))
  { throw new Error('LIBRARY_CATALOG_INVALID_PAYLOAD') }
  if (value.length > 10_000)
  { throw new Error('LIBRARY_CATALOG_TOO_LARGE') }
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
    { throw new Error('LIBRARY_CATALOG_INVALID_DOCUMENT') }
    const document = item as Record<string, unknown>
    if (typeof document.id !== 'string' || typeof document.name !== 'string')
    { throw new Error('LIBRARY_CATALOG_INVALID_DOCUMENT') }
    return document as unknown as DifyKnowledgeDocument
  })
}

const filterCatalog = ({
  documents,
  page = 1,
  limit = 20,
  keyword = '',
  status = '',
  refreshedAt,
  refreshError,
}: {
  documents: DifyKnowledgeDocument[]
  page?: number
  limit?: number
  keyword?: string
  status?: string
  refreshedAt: Date
  refreshError?: string | null
}): DifyDocumentList => {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(100, Math.max(1, limit))
  const normalizedKeyword = keyword.trim().toLowerCase()
  const filtered = documents.filter((document) => {
    const matchesKeyword = !normalizedKeyword || document.name.toLowerCase().includes(normalizedKeyword)
    const currentStatus = document.indexing_status || document.display_status || ''
    return matchesKeyword && (!status || currentStatus === status)
  })
  const start = (safePage - 1) * safeLimit
  return {
    data: filtered.slice(start, start + safeLimit),
    has_more: start + safeLimit < filtered.length,
    limit: safeLimit,
    total: filtered.length,
    page: safePage,
    refreshed_at: refreshedAt.toISOString(),
    stale: Boolean(refreshError),
    refresh_error: refreshError || undefined,
  }
}

const readCatalogRow = async () => {
  if (!isDatabaseConfigured())
  { throw new Error('LIBRARY_CATALOG_DATABASE_NOT_CONFIGURED') }
  await ensureKnowledgeDocumentCatalogTable()
  const catalog = await withDatabaseRetry(() => db.knowledgeDocumentCatalog.findUnique({
    where: { id: 'default' },
  }))
  if (!catalog)
  { throw new Error('LIBRARY_CATALOG_EMPTY') }
  return catalog
}

export const storeKnowledgeDocumentCatalog = async (value: unknown) => {
  if (!isDatabaseConfigured())
  { throw new Error('LIBRARY_CATALOG_DATABASE_NOT_CONFIGURED') }
  await ensureKnowledgeDocumentCatalogTable()
  const documents = normalizeCatalogDocuments(value)
  const refreshedAt = new Date()
  await withDatabaseRetry(() => db.knowledgeDocumentCatalog.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      documents: documents as unknown as Prisma.InputJsonValue,
      total: documents.length,
      refreshedAt,
    },
    update: {
      documents: documents as unknown as Prisma.InputJsonValue,
      total: documents.length,
      refreshedAt,
      refreshError: null,
      failedAt: null,
    },
  }))
  return { total: documents.length, refreshedAt }
}

export const listKnowledgeDocuments = async ({
  page = 1,
  limit = 20,
  keyword = '',
  status = '',
}: {
  page?: number
  limit?: number
  keyword?: string
  status?: string
} = {}) => {
  const catalog = await readCatalogRow()
  const documents = Array.isArray(catalog.documents)
    ? catalog.documents as unknown as DifyKnowledgeDocument[]
    : []
  return filterCatalog({
    documents,
    page,
    limit,
    keyword,
    status,
    refreshedAt: catalog.refreshedAt,
    refreshError: catalog.refreshError,
  })
}

export const refreshKnowledgeDocuments = async ({
  page = 1,
  limit = 20,
  keyword = '',
  status = '',
  recordFailure = true,
}: {
  page?: number
  limit?: number
  keyword?: string
  status?: string
  recordFailure?: boolean
} = {}) => {
  if (!isDatabaseConfigured())
  { throw new Error('LIBRARY_CATALOG_DATABASE_NOT_CONFIGURED') }
  await ensureKnowledgeDocumentCatalogTable()

  try {
    const documents = await fetchCompleteKnowledgeCatalog()
    const { refreshedAt } = await storeKnowledgeDocumentCatalog(documents)
    return filterCatalog({ documents, page, limit, keyword, status, refreshedAt })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'DIFY_DATASET_REQUEST_FAILED'
    if (recordFailure) {
      await withDatabaseRetry(() => db.knowledgeDocumentCatalog.updateMany({
        where: { id: 'default' },
        data: { refreshError: message, failedAt: new Date() },
      }))
    }
    let catalog
    try {
      catalog = await readCatalogRow()
    }
    catch {
      console.error('[library-catalog] initial refresh failed', { error })
      throw error
    }
    const documents = Array.isArray(catalog.documents)
      ? catalog.documents as unknown as DifyKnowledgeDocument[]
      : []
    return filterCatalog({
      documents,
      page,
      limit,
      keyword,
      status,
      refreshedAt: catalog.refreshedAt,
      refreshError: recordFailure ? message : catalog.refreshError,
    })
  }
}

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
