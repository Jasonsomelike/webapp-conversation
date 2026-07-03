import 'server-only'

import type { Prisma } from '@prisma/client'
import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'
import { fetchDify } from '@/lib/dify-server'
import { cleanReferenceDocumentName } from '@/lib/reference-extractor'

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
  refresh_error_message?: string
  refresh_error_visible?: boolean
  refresh_error_kind?: 'blocking' | 'cached-fallback' | 'suppressed'
  refresh_pending?: boolean
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
    { apiKey, connectTimeoutMs: 30_000, retries: 2 },
  )
  if (!response.ok)
  { throw new Error(`DIFY_DATASET_REQUEST_FAILED:${response.status}`) }
  return response.json()
}

const describeErrorWithCause = (error: unknown) => {
  if (!(error instanceof Error))
  { return String(error) }
  const cause = (error as { cause?: unknown }).cause
  const causeMessage = cause instanceof Error
    ? cause.message
    : cause
      ? String(cause)
      : ''
  return causeMessage ? `${error.message}:${causeMessage}` : error.message
}

const libraryCatalogServiceUrls = () => {
  const rawUrls = [
    process.env.LIBRARY_FILE_SERVICE_URL,
    process.env.DIFY_API_BASE_URL
      ? `${new URL(process.env.DIFY_API_BASE_URL).origin}/custom-library`
      : '',
    process.env.NEXT_PUBLIC_API_URL
      ? `${new URL(process.env.NEXT_PUBLIC_API_URL).origin}/custom-library`
      : '',
  ].filter(Boolean) as string[]
  const candidates: string[] = []
  rawUrls.forEach((rawUrl) => {
    try {
      const url = new URL(rawUrl.replace(/\/$/, ''))
      candidates.push(url.toString().replace(/\/$/, ''))
      if (url.hostname === 'dify.jasonsome.cn' && !url.port) {
        url.port = '22380'
        candidates.push(url.toString().replace(/\/$/, ''))
      }
    }
    catch {
      candidates.push(rawUrl.replace(/\/$/, ''))
    }
  })
  return [...new Set(candidates)]
}

const fetchCompleteKnowledgeCatalog = async () => {
  const serviceToken = process.env.LIBRARY_FILE_SERVICE_TOKEN
  const serviceUrls = serviceToken ? libraryCatalogServiceUrls() : []
  if (serviceUrls.length && serviceToken) {
    const serviceErrors: string[] = []
    for (const serviceUrl of serviceUrls) {
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(new Error('LIBRARY_CATALOG_SERVICE_TIMEOUT')),
        45_000,
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
        const detail = await response.text().catch(() => '')
        serviceErrors.push(`${new URL(serviceUrl).host}:${response.status}:${detail.slice(0, 120)}`)
        if (response.status === 401 || response.status === 403)
        { break }
      }
      catch (error) {
        serviceErrors.push(`${serviceUrl}:${describeErrorWithCause(error)}`)
      }
      finally {
        clearTimeout(timeout)
      }
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
  all = false,
}: {
  documents: DifyKnowledgeDocument[]
  page?: number
  limit?: number
  keyword?: string
  status?: string
  refreshedAt: Date
  refreshError?: string | null
  all?: boolean
}): DifyDocumentList => {
  const hasRefreshError = Boolean(refreshError)
  const hasCachedDocuments = documents.length > 0
  const suppressCachedFallbackError = Boolean(
    hasCachedDocuments
    && refreshError?.includes('DIFY_DATASET_NOT_CONFIGURED'),
  )
  const cachedFallbackError = hasCachedDocuments && hasRefreshError && !suppressCachedFallbackError
  const visibleRefreshError = hasRefreshError && !suppressCachedFallbackError && !cachedFallbackError
  const safePage = Math.max(1, page)
  const safeLimit = all
    ? Math.min(10_000, Math.max(1, limit))
    : Math.min(100, Math.max(1, limit))
  const normalizedKeyword = keyword.trim().toLowerCase()
  const filtered = documents.filter((document) => {
    const matchesKeyword = !normalizedKeyword || document.name.toLowerCase().includes(normalizedKeyword)
    const currentStatus = document.indexing_status || document.display_status || ''
    return matchesKeyword && (!status || currentStatus === status)
  })
  const start = all ? 0 : (safePage - 1) * safeLimit
  const pageData = all
    ? filtered.slice(0, safeLimit)
    : filtered.slice(start, start + safeLimit)
  return {
    data: pageData,
    has_more: all ? pageData.length < filtered.length : start + safeLimit < filtered.length,
    limit: safeLimit,
    total: filtered.length,
    page: safePage,
    refreshed_at: refreshedAt.toISOString(),
    stale: hasRefreshError && !suppressCachedFallbackError,
    refresh_error: suppressCachedFallbackError ? undefined : refreshError || undefined,
    refresh_error_message: suppressCachedFallbackError ? undefined : describeKnowledgeCatalogError(refreshError),
    refresh_error_visible: visibleRefreshError,
    refresh_error_kind: suppressCachedFallbackError
      ? 'suppressed'
      : cachedFallbackError
        ? 'cached-fallback'
        : visibleRefreshError
          ? 'blocking'
          : undefined,
  }
}

const emptyCatalogResult = ({
  page = 1,
  limit = 20,
  refreshError,
  refreshPending = false,
  all = false,
}: {
  page?: number
  limit?: number
  refreshError?: string | null
  refreshPending?: boolean
  all?: boolean
}): DifyDocumentList => ({
  data: [],
  has_more: false,
  limit: all ? Math.min(10_000, Math.max(1, limit)) : Math.min(100, Math.max(1, limit)),
  total: 0,
  page: Math.max(1, page),
  stale: Boolean(refreshError),
  refresh_error: refreshError || undefined,
  refresh_error_message: describeKnowledgeCatalogError(refreshError),
  refresh_error_visible: Boolean(refreshError),
  refresh_error_kind: refreshError ? 'blocking' : undefined,
  refresh_pending: refreshPending,
})

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

export const describeKnowledgeCatalogError = (value?: string | null) => {
  if (!value)
  { return '' }
  if (value.includes('DIFY_CONNECT_TIMEOUT') || value.includes('Timeout') || value.includes('timeout'))
  { return 'Dify 知识库响应超时，已继续展示最近一次成功同步的数据；服务端会自动重试。' }
  if (value.includes('DIFY_DATASET_NOT_CONFIGURED'))
  { return '知识库 API 尚未配置，请检查服务端环境变量。' }
  if (value.includes('DIFY_DATASET_REQUEST_FAILED:401') || value.includes('DIFY_DATASET_REQUEST_FAILED:403'))
  { return '知识库 API 鉴权失败，请检查 Dify 知识库密钥。' }
  if (value.includes('DIFY_DATASET_REQUEST_FAILED'))
  { return 'Dify 知识库接口暂时不可用，已继续展示缓存数据。' }
  if (value.includes('LIBRARY_CATALOG_SERVICE_TIMEOUT'))
  { return '本地知识库目录服务响应超时，已继续展示缓存数据。' }
  return '知识库同步暂时失败，已继续展示最近一次成功同步的数据。'
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
  all = false,
}: {
  page?: number
  limit?: number
  keyword?: string
  status?: string
  all?: boolean
} = {}) => {
  let catalog
  try {
    catalog = await readCatalogRow()
  }
  catch (error) {
    if (error instanceof Error && error.message === 'LIBRARY_CATALOG_EMPTY')
    { return emptyCatalogResult({ page, limit, all }) }
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
    refreshError: catalog.refreshError,
    all,
  })
}

const documentHitKey = (value: unknown) =>
  cleanReferenceDocumentName(value)
    .toLocaleLowerCase('zh-CN')
    .replace(/\s+/g, '')

export const attachUserKnowledgeDocumentHitCounts = async (
  result: DifyDocumentList,
  appUserId: string,
): Promise<DifyDocumentList> => {
  if (!isDatabaseConfigured() || !result.data.length)
  { return result }

  try {
    const rows = await withDatabaseRetry(() => db.messageReference.groupBy({
      by: ['documentName'],
      where: {
        appUserId,
        documentName: { not: null },
      },
      _count: { _all: true },
    }))
    const hitCounts = new Map<string, number>()
    rows.forEach((row) => {
      const key = documentHitKey(row.documentName)
      if (!key)
      { return }
      hitCounts.set(key, (hitCounts.get(key) || 0) + row._count._all)
    })

    return {
      ...result,
      data: result.data.map(document => ({
        ...document,
        hit_count: hitCounts.get(documentHitKey(document.name)) || 0,
      })),
    }
  }
  catch (error) {
    console.warn('[library-documents] failed to attach user hit counts', {
      appUserId,
      error: error instanceof Error ? error.message : String(error),
    })
    return result
  }
}

export const refreshKnowledgeDocuments = async ({
  page = 1,
  limit = 20,
  keyword = '',
  status = '',
  recordFailure = true,
  all = false,
}: {
  page?: number
  limit?: number
  keyword?: string
  status?: string
  recordFailure?: boolean
  all?: boolean
} = {}) => {
  if (!isDatabaseConfigured())
  { throw new Error('LIBRARY_CATALOG_DATABASE_NOT_CONFIGURED') }
  await ensureKnowledgeDocumentCatalogTable()

  try {
    const documents = await fetchCompleteKnowledgeCatalog()
    const { refreshedAt } = await storeKnowledgeDocumentCatalog(documents)
    return filterCatalog({ documents, page, limit, keyword, status, refreshedAt, all })
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
      all,
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

const documentIdSimilarity = (left: string, right: string) => {
  if (!left || !right || left.length !== right.length)
  { return 0 }
  let same = 0
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] === right[index])
    { same += 1 }
  }
  return same / left.length
}

export const findKnowledgeDocumentByName = async (filename: string, hintDocumentId?: string) => {
  const normalized = cleanReferenceDocumentName(filename)
  if (!normalized)
  { return null }
  const compact = (value: unknown) =>
    cleanReferenceDocumentName(value)
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}]+/gu, '')
      .toLocaleLowerCase('zh-CN')
  const normalizedCompact = compact(filename)
  const rankMatch = (document: DifyKnowledgeDocument) => {
    const documentName = cleanReferenceDocumentName(document.name)
    const documentCompact = compact(document.name)
    const idScore = hintDocumentId && document.id
      ? documentIdSimilarity(document.id, hintDocumentId)
      : 0
    if (idScore >= 0.92)
    { return 110_000 + Math.round(idScore * 1000) }
    if (documentName === normalized)
    { return 100_000 + documentName.length }
    if (documentCompact && documentCompact === normalizedCompact)
    { return 90_000 + documentCompact.length }
    if (documentCompact && normalizedCompact && documentCompact.includes(normalizedCompact))
    { return 70_000 + normalizedCompact.length }
    if (documentCompact && normalizedCompact && normalizedCompact.includes(documentCompact))
    { return 60_000 + documentCompact.length }
    return 0
  }
  const bestMatch = (documents: DifyKnowledgeDocument[]) => {
    const matches = documents
      .map(document => ({ document, score: rankMatch(document) }))
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score)
    return matches[0]?.document || null
  }

  await ensureKnowledgeDocumentCatalogTable()
  const catalog = await db.knowledgeDocumentCatalog.findUnique({
    where: { id: 'default' },
  }).catch(() => null)
  const cachedDocuments = Array.isArray(catalog?.documents)
    ? catalog.documents as unknown as DifyKnowledgeDocument[]
    : []
  const cachedMatch = bestMatch(cachedDocuments)
  if (cachedMatch)
  { return cachedMatch }

  const documents = await fetchCompleteKnowledgeCatalog()
  return bestMatch(documents)
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

const pageImageUrlPattern = /(?:https:\/\/(?:dify\.jasonsome\.cn(?::22380)?|www\.jasonsome\.cn|jasonsome\.cn))?\/page-images\/[^\s<>"')\]]+?\/page_(\d+)\.(?:jpe?g|png|webp)(?:[?#][^\s<>"')\]]*)?/gi

const normalizePageImages = (value: unknown): KnowledgeDocumentPageImage[] => {
  if (!Array.isArray(value))
  { return [] }
  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item))
      { return null }
      const record = item as Record<string, unknown>
      const page = Number(record.page)
      const url = typeof record.url === 'string' ? record.url : ''
      if (!Number.isFinite(page) || page <= 0 || !url)
      { return null }
      return { page, url }
    })
    .filter((item): item is KnowledgeDocumentPageImage => Boolean(item))
    .sort((left, right) => left.page - right.page)
}

const getKnowledgeDocumentPageImagesFromService = async (documentId: string) => {
  const serviceToken = process.env.LIBRARY_FILE_SERVICE_TOKEN
  const serviceUrls = serviceToken ? libraryCatalogServiceUrls() : []
  if (!serviceToken || !serviceUrls.length)
  { return [] }

  const errors: string[] = []
  for (const serviceUrl of serviceUrls) {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(new Error('LIBRARY_PAGE_IMAGES_SERVICE_TIMEOUT')),
      8_000,
    )
    try {
      const response = await fetch(`${serviceUrl}/library/documents/${encodeURIComponent(documentId)}/page-images`, {
        cache: 'no-store',
        signal: controller.signal,
        headers: { 'X-Internal-Token': serviceToken },
      })
      if (response.ok) {
        const result = await response.json() as { data?: unknown }
        const images = normalizePageImages(result.data)
        if (images.length)
        { return images }
      }
      else {
        const detail = await response.text().catch(() => '')
        errors.push(`${new URL(serviceUrl).host}:${response.status}:${detail.slice(0, 120)}`)
      }
    }
    catch (error) {
      errors.push(`${serviceUrl}:${describeErrorWithCause(error)}`)
    }
    finally {
      clearTimeout(timeout)
    }
  }

  if (errors.length) {
    console.warn('[library-page-images] local page image manifest unavailable, using Dify API fallback', {
      documentId,
      errors,
    })
  }
  return []
}

export const getKnowledgeDocumentPageImages = async (documentId: string) => {
  const serviceImages = await getKnowledgeDocumentPageImagesFromService(documentId)
  if (serviceImages.length)
  { return serviceImages }

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
      const matches = segment.content.matchAll(pageImageUrlPattern)
      for (const match of matches) {
        const pageNumber = Number(match[1] || segment.position || images.size + 1)
        const imageUrl = match[0].startsWith('/page-images/')
          ? `https://dify.jasonsome.cn:22380${match[0]}`
          : match[0]
        if (Number.isFinite(pageNumber) && !images.has(pageNumber))
        { images.set(pageNumber, imageUrl) }
      }
    })
    hasMore = Boolean(result.has_more) && result.data.length > 0
    page += 1
  }

  return [...images.entries()]
    .sort(([left], [right]) => left - right)
    .map(([imagePage, url]) => ({ page: imagePage, url }))
}
