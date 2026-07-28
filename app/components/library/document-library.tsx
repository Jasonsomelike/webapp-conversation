'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  BookOpenIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClockIcon,
  DocumentTextIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import type { DifyDocumentList, DifyKnowledgeDocument } from '@/lib/dify-dataset'
import { getStaticCoursewareDownloadUrl } from '@/lib/static-courseware'

const statusLabel: Record<string, string> = {
  completed: '索引完成',
  available: '可用',
  waiting: '等待处理',
  parsing: '解析中',
  cleaning: '清洗中',
  splitting: '分段中',
  indexing: '索引中',
  paused: '已暂停',
  error: '处理失败',
}

const formatDate = (timestamp?: number) => timestamp
  ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(timestamp * 1000))
  : '—'

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value))

interface DocumentBookGroup {
  key: string
  title: string
  documents: DifyKnowledgeDocument[]
  totalWords: number
  totalTokens: number
  totalHits: number
  latestCreatedAt?: number
  primaryStatus: string
  healthyCount: number
  errorCount: number
  sourceTypes: string[]
  docForms: string[]
}

const documentPartPattern = /(?:[_\s-]*(?:part|第)\s*\d+\s*(?:部分|卷|册)?|[_\s-]*p(?:age)?\s*\d+\s*(?:[-~–—]\s*\d+)?|[_\s-]*第\s*\d+\s*(?:[-~–—]\s*\d+)?\s*页)+$/i
const documentExtensionPattern = /\.(?:pdf|docx?|pptx?|xlsx?|txt|md)$/i
const duplicatedWhitespacePattern = /\s+/g
const chapterShardPattern = /^第\s*(\d{1,2})\s*章\s*(.+?)(?:\s*[-_—–]\s*\d+|\s*[（(]\s*\d+\s*[）)])$/u

const toChineseChapterNumber = (value: number) => {
  if (!Number.isFinite(value) || value < 0 || value > 99)
  { return String(value) }
  if (value === 0)
  { return '零' }
  const digits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  if (value < 10)
  { return digits[value] }
  if (value === 10)
  { return '十' }
  if (value < 20)
  { return `十${digits[value % 10]}` }
  const tens = Math.floor(value / 10)
  const ones = value % 10
  return `${digits[tens]}十${ones ? digits[ones] : ''}`
}

const normalizeChapterShardTitle = (title: string) => {
  const matched = title.match(chapterShardPattern)
  if (!matched)
  { return title }
  const chapterNumber = Number(matched[1])
  const chapterName = matched[2]
    .replace(/[_\s-]+$/g, '')
    .replace(duplicatedWhitespacePattern, ' ')
    .trim()
  return `第${toChineseChapterNumber(chapterNumber)}章 ${chapterName}`.trim()
}

const normalizeDocumentBookTitle = (name: string) => {
  const withoutExtension = name.replace(documentExtensionPattern, '')
  const cleaned = withoutExtension
    .replace(documentPartPattern, '')
    .replace(/[_\s-]+$/g, '')
    .replace(duplicatedWhitespacePattern, ' ')
    .trim()
  return normalizeChapterShardTitle(cleaned || withoutExtension.trim() || name)
}

const groupKeyFromTitle = (title: string) =>
  title
    .toLowerCase()
    .replace(/[《》「」『』"'`*_()[\]（）【】\s-]+/g, '')
    .trim()

const compareDocumentPart = (left: DifyKnowledgeDocument, right: DifyKnowledgeDocument) => {
  const byPosition = (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER)
  if (byPosition !== 0)
  { return byPosition }
  const byCreated = (left.created_at || 0) - (right.created_at || 0)
  if (byCreated !== 0)
  { return byCreated }
  return left.name.localeCompare(right.name, 'zh-CN')
}

const isHealthyDocumentStatus = (status: string) =>
  ['completed', 'available'].includes(status)

const isBlockingDocumentError = (status: string) =>
  status === 'error'

const isNonBlockingProcessorError = (document: DifyKnowledgeDocument) => {
  const status = document.indexing_status || document.display_status || ''
  const message = document.error || ''
  const hasUsableContent = Boolean((document.word_count || 0) > 0 || (document.tokens || 0) > 0)
  return status === 'error'
    && hasUsableContent
    && /pdf[_-]?page[_-]?processor|page processor|ConnectError|Connection refused|Errno 111/i.test(message)
}

const getEffectiveDocumentStatus = (document: DifyKnowledgeDocument) =>
  isNonBlockingProcessorError(document)
    ? 'completed'
    : document.indexing_status || document.display_status || 'waiting'

const getEffectiveDocumentError = (document: DifyKnowledgeDocument) =>
  isNonBlockingProcessorError(document) ? null : document.error

const buildDocumentGroups = (documents: DifyKnowledgeDocument[]): DocumentBookGroup[] => {
  const groups = new Map<string, DocumentBookGroup>()

  documents.forEach((document) => {
    const title = normalizeDocumentBookTitle(document.name)
    const key = groupKeyFromTitle(title) || document.id
    const currentStatus = getEffectiveDocumentStatus(document)
    const group = groups.get(key) || {
      key,
      title,
      documents: [],
      totalWords: 0,
      totalTokens: 0,
      totalHits: 0,
      primaryStatus: currentStatus,
      healthyCount: 0,
      errorCount: 0,
      sourceTypes: [],
      docForms: [],
    }
    group.documents.push(document)
    group.totalWords += document.word_count || 0
    group.totalTokens += document.tokens || 0
    group.totalHits += document.hit_count || 0
    group.latestCreatedAt = Math.max(group.latestCreatedAt || 0, document.created_at || 0) || undefined
    if (isHealthyDocumentStatus(currentStatus))
    { group.healthyCount += 1 }
    if (isBlockingDocumentError(currentStatus))
    { group.errorCount += 1 }
    if (document.data_source_type && !group.sourceTypes.includes(document.data_source_type))
    { group.sourceTypes.push(document.data_source_type) }
    if (document.doc_form && !group.docForms.includes(document.doc_form))
    { group.docForms.push(document.doc_form) }
    groups.set(key, group)
  })

  return [...groups.values()].map((group) => {
    group.documents.sort(compareDocumentPart)
    if (group.errorCount)
    { group.primaryStatus = 'error' }
    else if (group.healthyCount === group.documents.length)
    { group.primaryStatus = 'completed' }
    else {
      const firstPendingDocument = group.documents.find((document) => {
        const status = getEffectiveDocumentStatus(document)
        return !isHealthyDocumentStatus(status)
      })
      group.primaryStatus = firstPendingDocument
        ? getEffectiveDocumentStatus(firstPendingDocument)
        : getEffectiveDocumentStatus(group.documents[0])
    }
    return group
  })
}

const groupsPerPage = 20
const documentActionClass = 'inline-flex h-9 min-w-[72px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-xs font-semibold leading-none transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-accent-strong)]/45'

export default function DocumentLibrary({
  result: initialResult,
  keyword,
  status,
  error: initialError,
}: {
  result: DifyDocumentList
  keyword: string
  status: string
  error: string
}) {
  const [result, setResult] = useState(initialResult)
  const [error, setError] = useState(initialError)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshPending, setRefreshPending] = useState(Boolean(initialResult.refresh_pending))
  const [refreshNotice, setRefreshNotice] = useState<{
    tone: 'info' | 'success' | 'warning' | 'error'
    message: string
  } | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState(keyword)
  const [statusFilter, setStatusFilter] = useState(status)
  const [currentGroupPage, setCurrentGroupPage] = useState(Math.max(1, initialResult.page || 1))
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setResult(initialResult)
    setError(initialError)
    setRefreshPending(Boolean(initialResult.refresh_pending))
  }, [initialError, initialResult])

  useEffect(() => {
    setSearchTerm(keyword)
    setStatusFilter(status)
  }, [keyword, status])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditing = target?.matches('input, textarea, select, [contenteditable="true"]')
      if (event.key === '/' && !isEditing) {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    globalThis.addEventListener('keydown', handleShortcut)
    return () => globalThis.removeEventListener('keydown', handleShortcut)
  }, [])

  const refreshDocuments = useCallback(async (showLoading = false) => {
    if (showLoading)
    {
      setRefreshing(true)
      setRefreshNotice({
        tone: 'info',
        message: '正在从服务端同步知识库目录，请稍等…',
      })
    }
    const startedAt = Date.now()
    try {
      if (showLoading) {
        setError('')
        setRefreshPending(false)
      }
      const params = new URLSearchParams({
        page: '1',
        limit: '10000',
        all: '1',
      })
      params.set('refresh', '1')
      params.set('_', String(Date.now()))
      const response = await fetch(`/api/library/documents?${params}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })
      if (!response.ok)
      {
        const payload = await response.json().catch(() => null) as { detail?: string, error?: string, error_message?: string } | null
        throw new Error(payload?.error_message || payload?.error || `LIBRARY_REFRESH_FAILED:${response.status}`)
      }
      const nextResult = await response.json() as DifyDocumentList
      setResult(nextResult)
      setRefreshPending(Boolean(nextResult.refresh_pending))
      const elapsedSeconds = Math.max(0.1, (Date.now() - startedAt) / 1000).toFixed(1)
      if (nextResult.refresh_pending) {
        setError('')
        setRefreshNotice({
          tone: 'info',
          message: `已开始同步知识库目录，当前先展示 ${nextResult.total} 份缓存文档；稍后会自动更新（本次请求 ${elapsedSeconds}s）。`,
        })
        window.setTimeout(() => {
          void (async () => {
            const pollParams = new URLSearchParams({
              page: '1',
              limit: '10000',
              all: '1',
              _: String(Date.now()),
            })
            const pollResponse = await fetch(`/api/library/documents?${pollParams}`, {
              credentials: 'include',
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
              },
            })
            if (!pollResponse.ok)
            { return }
            const polledResult = await pollResponse.json() as DifyDocumentList
            setResult(polledResult)
            setRefreshPending(Boolean(polledResult.refresh_pending))
            if (!polledResult.stale) {
              setError('')
              setRefreshNotice({
                tone: 'success',
                message: `后台刷新已完成：已同步 ${polledResult.total} 份文档${polledResult.refreshed_at ? `，最近更新 ${formatDateTime(polledResult.refreshed_at)}` : ''}`,
              })
            }
          })().catch(() => {
            // Keep the visible cached catalog; the server-side scheduled refresh will retry.
          })
        }, 6000)
      }
      else if (nextResult.stale && nextResult.refresh_error_message) {
        if (!nextResult.data.length)
        { setError(nextResult.refresh_error_message) }
        else
        { setError('') }
        setRefreshNotice({
          tone: 'warning',
          message: `${nextResult.refresh_error_message}（本次请求 ${elapsedSeconds}s，当前仍展示 ${nextResult.total} 份缓存文档）`,
        })
      }
      else {
        setError('')
        setRefreshNotice({
          tone: 'success',
          message: `刷新成功：已同步 ${nextResult.total} 份文档${nextResult.refreshed_at ? `，最近更新 ${formatDateTime(nextResult.refreshed_at)}` : ''}（${elapsedSeconds}s）`,
        })
      }
    }
    catch (caught) {
      if (showLoading) {
        const message = caught instanceof Error ? caught.message : '知识库同步请求已失败，请稍后重试。'
        setError(message)
        setRefreshNotice({
          tone: 'error',
          message,
        })
      }
    }
    finally {
      if (showLoading)
      { setRefreshing(false) }
    }
  }, [])

  const documentGroups = useMemo(() => buildDocumentGroups(result.data), [result.data])
  const filteredDocumentGroups = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('zh-CN')
    return documentGroups.filter((group) => {
      const matchesSearch = !normalizedSearch
        || group.title.toLocaleLowerCase('zh-CN').includes(normalizedSearch)
        || group.documents.some(document => document.name.toLocaleLowerCase('zh-CN').includes(normalizedSearch))
      const matchesStatus = !statusFilter
        || group.documents.some(document => getEffectiveDocumentStatus(document) === statusFilter)
      return matchesSearch && matchesStatus
    })
  }, [documentGroups, searchTerm, statusFilter])
  const totalGroupPages = Math.max(1, Math.ceil(filteredDocumentGroups.length / groupsPerPage))
  const safeCurrentGroupPage = Math.min(currentGroupPage, totalGroupPages)
  useEffect(() => {
    setCurrentGroupPage(1)
  }, [searchTerm, statusFilter])
  useEffect(() => {
    setCurrentGroupPage(page => Math.min(page, totalGroupPages))
  }, [totalGroupPages])
  const groupPageStart = (safeCurrentGroupPage - 1) * groupsPerPage
  const visibleDocumentGroups = useMemo(
    () => filteredDocumentGroups.slice(groupPageStart, groupPageStart + groupsPerPage),
    [filteredDocumentGroups, groupPageStart],
  )
  const hasMoreGroupPages = groupPageStart + groupsPerPage < filteredDocumentGroups.length
  const completed = result.data.filter(item => isHealthyDocumentStatus(getEffectiveDocumentStatus(item))).length
  const totalWords = result.data.reduce((sum, item) => sum + (item.word_count || 0), 0)
  const groupedCount = documentGroups.length
  const refreshInProgress = refreshPending || refreshNotice?.tone === 'info'
  const showCachedFallbackWarning = Boolean(
    result.stale
    && result.data.length > 0
    && !refreshInProgress
    && result.refresh_error_visible !== false,
  )
  const isUsingCachedFallback = Boolean(
    result.stale
    && result.data.length > 0
    && result.refresh_error_visible === false,
  )
  const summaryCards = [
    { label: '自动合并后', value: groupedCount, mobileValue: groupedCount, unit: '组', icon: CircleStackIcon },
    { label: '原始文档', value: result.total, mobileValue: result.total, unit: '份', icon: DocumentTextIcon },
    { label: '索引已完成', value: completed, mobileValue: completed, unit: '份', icon: CheckCircleIcon },
    {
      label: '总字符数',
      value: totalWords.toLocaleString('zh-CN'),
      mobileValue: new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(totalWords),
      unit: '字符',
      icon: DocumentTextIcon,
    },
  ]

  const previewHref = (document: DifyKnowledgeDocument) =>
    `/library/preview/${document.id}?filename=${encodeURIComponent(document.name)}`

  const downloadHref = (document: DifyKnowledgeDocument) =>
    getStaticCoursewareDownloadUrl(document.id, document.name)
    || `/api/library/documents/${document.id}/file?disposition=attachment&filename=${encodeURIComponent(document.name)}`

  const downloadName = (document: DifyKnowledgeDocument) =>
    document.name

  const toggleGroup = (key: string) => {
    setExpandedGroups(current => ({
      ...current,
      [key]: !current[key],
    }))
  }

  const expandableVisibleGroups = visibleDocumentGroups.filter(group => group.documents.length > 1)
  const allVisibleExpanded = expandableVisibleGroups.length > 0
    && expandableVisibleGroups.every(group => expandedGroups[group.key])
  const toggleVisibleGroups = () => {
    setExpandedGroups((current) => {
      const next = { ...current }
      expandableVisibleGroups.forEach((group) => {
        next[group.key] = !allVisibleExpanded
      })
      return next
    })
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    searchInputRef.current?.focus()
  }

  return (
    <div className="mx-auto max-w-[1560px] p-3 sm:p-5 lg:p-6">
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summaryCards.map(({ label, value, mobileValue, unit, icon: Icon }) => (
          <PageCard key={label} interactive={false} className="flex min-w-0 items-center justify-between gap-2 px-3 py-3.5 sm:gap-3 sm:px-5">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium text-black/45">{label}</div>
              <div className="mt-1 flex min-w-0 items-baseline gap-1 whitespace-nowrap font-semibold tabular-nums tracking-[-0.025em]">
                <span className="truncate text-lg sm:hidden">{mobileValue}</span>
                <span className="hidden truncate text-2xl sm:inline">{value}</span>
                <span className="shrink-0 text-[11px] font-normal tracking-normal text-black/35">{unit}</span>
              </div>
            </div>
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--studio-accent)]/30 text-[var(--studio-accent-strong)] sm:h-10 sm:w-10">
              <Icon className="h-[18px] w-[18px]" />
            </div>
          </PageCard>
        ))}
      </div>

      <PageCard interactive={false} className="overflow-visible">
        <div className="sticky top-0 z-20 flex flex-col gap-3 rounded-t-[22px] border-b border-black/[0.07] bg-[var(--studio-surface)]/95 p-3 backdrop-blur-xl sm:flex-row sm:items-center sm:p-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <input
              ref={searchInputRef}
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="搜索文档，按 / 快速聚焦"
              aria-label="搜索知识库文档"
              className="h-10 w-full rounded-xl border border-black/10 bg-black/[0.025] pl-10 pr-10 text-xs outline-none transition focus:border-[var(--studio-accent-strong)]/45 focus:bg-white focus:ring-4 focus:ring-[var(--studio-accent)]/15"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-black/35 transition hover:bg-black/[0.05] hover:text-black/65"
                aria-label="清空搜索词"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            aria-label="按索引状态筛选"
            className="h-10 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none transition focus:border-[var(--studio-accent-strong)]/45 focus:ring-4 focus:ring-[var(--studio-accent)]/15"
          >
            <option value="">全部状态</option>
            <option value="completed">索引完成</option>
            <option value="indexing">索引中</option>
            <option value="error">处理失败</option>
            <option value="paused">已暂停</option>
          </select>
          {(searchTerm || statusFilter) && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-semibold text-black/60 transition hover:border-black/20 hover:bg-black/[0.025]"
            >
              清除筛选
            </button>
          )}
          {expandableVisibleGroups.length > 0 && (
            <button
              type="button"
              onClick={toggleVisibleGroups}
              className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-semibold text-black/60 transition hover:border-black/20 hover:bg-black/[0.025]"
            >
              {allVisibleExpanded ? '收起全部' : '展开全部'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void refreshDocuments(true)}
            disabled={refreshing}
            data-testid="library-refresh-button"
            aria-busy={refreshing}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--studio-deep)] px-4 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '刷新中…' : '刷新'}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.05] px-4 py-2 text-[10px] text-black/40 sm:px-5">
          <span aria-live="polite">
            当前显示 <strong className="font-semibold text-black/65">{filteredDocumentGroups.length}</strong> 本/组，共 {result.total} 份原始文档
          </span>
          <span className="inline-flex items-center">
            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${refreshInProgress ? 'animate-pulse bg-blue-500' : showCachedFallbackWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            服务端每 30 分钟同步
            {result.refreshed_at && ` · 最近更新 ${formatDateTime(result.refreshed_at)}`}
            {refreshInProgress && ' · 已发起后台刷新'}
            {isUsingCachedFallback && ' · 后台同步会自动重试'}
          </span>
        </div>

        {(refreshing || refreshNotice) && (
          <div
            className={`border-b px-5 py-2.5 text-xs ${
              refreshNotice?.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : refreshNotice?.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : refreshNotice?.tone === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-blue-100 bg-blue-50 text-blue-700'
            }`}
          >
            {refreshing ? '正在从服务端同步知识库目录，请稍等…' : refreshNotice?.message}
          </div>
        )}

        {showCachedFallbackWarning && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs text-amber-800">
            {result.refresh_error_message || '本次同步暂时失败，当前展示最近一次成功更新的数据。'}
          </div>
        )}

        {refreshPending && !result.stale && (
          <div className="border-b border-blue-100 bg-blue-50 px-5 py-2.5 text-xs text-blue-700">
            已通知服务端后台刷新知识库目录；当前先展示缓存数据，稍后会自动由定时任务更新。
          </div>
        )}

        {error
          ? <div className="p-10 text-center text-sm text-red-600">{error}</div>
          : !filteredDocumentGroups.length
            ? (
              <div className="grid min-h-[420px] place-items-center p-10 text-center">
                <div>
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-black/20" />
                  <h2 className="mt-4 font-semibold">{refreshPending && !result.data.length ? '正在同步知识库目录' : '没有找到匹配文档'}</h2>
                  <p className="mt-2 text-xs text-black/40">
                    {refreshPending && !result.data.length ? '服务端已开始后台拉取知识库文档，稍后刷新即可看到最新目录。' : '请调整搜索词或处理状态，筛选结果会即时更新。'}
                  </p>
                  {(searchTerm || statusFilter) && (
                    <button type="button" onClick={clearFilters} className="mt-4 rounded-xl bg-[var(--studio-deep)] px-4 py-2 text-xs font-semibold text-white">
                      清除筛选
                    </button>
                  )}
                </div>
              </div>
            )
            : (
              <>
                <div className="divide-y divide-black/[0.06]">
                  {visibleDocumentGroups.map((group) => {
                    const healthy = ['completed', 'available'].includes(group.primaryStatus)
                    const expanded = Boolean(expandedGroups[group.key])
                    const sourceSummary = [
                      group.sourceTypes.length ? group.sourceTypes.join(' / ') : '上传文件',
                      group.docForms.length ? group.docForms.join(' / ') : '文本分段',
                    ].join(' · ')
                    return (
                      <div
                        key={group.key}
                        className="transition-colors hover:bg-black/[0.018]"
                        style={{ contentVisibility: 'auto', containIntrinsicSize: '96px' }}
                      >
                        <div className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(280px,1fr)_auto_minmax(150px,180px)_auto] lg:items-center">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--studio-accent)]/30 text-[var(--studio-accent-strong)] sm:h-11 sm:w-11">
                              <BookOpenIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <div className="line-clamp-2 text-sm font-semibold leading-5" title={group.title}>{group.title}</div>
                                <span className="rounded-full bg-[var(--studio-accent)]/35 px-2 py-0.5 text-[10px] font-semibold text-[var(--studio-accent-strong)]">
                                  {group.documents.length} 份
                                </span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-black/40">
                                <span>{sourceSummary}</span>
                                <span>命中 {group.totalHits} 次</span>
                                <span>已自动合并同书分片</span>
                              </div>
                              {group.errorCount > 0 && <div className="mt-2 text-[10px] text-red-600">{group.errorCount} 份文档处理失败，展开查看详情。</div>}
                            </div>
                          </div>

                          <div className="pl-14 sm:pl-[60px] lg:pl-0">
                            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${healthy ? 'bg-emerald-50 text-emerald-700' : group.primaryStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {healthy && group.documents.length > 1 ? `全部${statusLabel[group.primaryStatus] || '可用'}` : statusLabel[group.primaryStatus] || group.primaryStatus}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 pl-14 text-xs sm:pl-[60px] lg:block lg:pl-0">
                            <div className="font-semibold tabular-nums">
                              {group.totalWords.toLocaleString('zh-CN')}
                              <span className="ml-1 text-[10px] font-normal text-black/35">字符</span>
                            </div>
                            {Boolean(group.totalTokens > 0) && (
                              <div className="mt-1 text-[10px] text-black/35">{group.totalTokens.toLocaleString('zh-CN')} tokens</div>
                            )}
                            <div className="flex items-center gap-1.5 text-[10px] font-normal text-black/40 lg:mt-1.5">
                              <ClockIcon className="h-3.5 w-3.5" />
                              {formatDate(group.latestCreatedAt)}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pl-14 sm:pl-[60px] lg:justify-end lg:pl-0">
                            {group.documents.length === 1 && (
                              <>
                                <a
                                  href={previewHref(group.documents[0])}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`${documentActionClass} border border-black/10 bg-white text-[var(--studio-ink)]`}
                                >
                                  <EyeIcon className="h-4 w-4" />预览
                                </a>
                                <a
                                  href={downloadHref(group.documents[0])}
                                  download={downloadName(group.documents[0])}
                                  className={`${documentActionClass} bg-[var(--studio-deep)] text-white`}
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4" />下载
                                </a>
                              </>
                            )}
                            {group.documents.length > 1 && (
                              <button
                                type="button"
                                onClick={() => toggleGroup(group.key)}
                                aria-expanded={expanded}
                                className={`${documentActionClass} border border-black/10 bg-white text-[var(--studio-ink)]`}
                              >
                                <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                {expanded ? '收起' : '展开'}
                              </button>
                            )}
                          </div>
                        </div>

                        {expanded && group.documents.length > 1 && (
                          <div className="mx-3 mb-4 overflow-hidden rounded-2xl border border-black/[0.07] bg-black/[0.018] sm:mx-5 sm:mb-5">
                            <div className="border-b border-black/[0.06] px-4 py-2 text-[10px] font-semibold text-black/45">
                              该书包含的知识库分片
                            </div>
                            <div className="divide-y divide-black/[0.055]">
                              {group.documents.map((document) => {
                                const currentStatus = getEffectiveDocumentStatus(document)
                                const partHealthy = isHealthyDocumentStatus(currentStatus)
                                const documentError = getEffectiveDocumentError(document)
                                const showDocumentError = isBlockingDocumentError(currentStatus) && Boolean(documentError)
                                return (
                                  <div key={document.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(260px,1fr)_auto_105px_140px_auto] lg:items-center">
                                    <div className="min-w-0">
                                      <div className="truncate text-xs font-semibold" title={document.name}>{document.name}</div>
                                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-black/40">
                                        <span>{document.data_source_type || '上传文件'}</span>
                                        <span>{document.doc_form || '文本分段'}</span>
                                        <span>命中 {document.hit_count || 0} 次</span>
                                      </div>
                                      {showDocumentError && <div className="mt-1 text-[10px] text-red-600">{documentError}</div>}
                                    </div>
                                    <div className="pl-0">
                                      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${partHealthy ? 'bg-emerald-50 text-emerald-700' : currentStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                        {statusLabel[currentStatus] || currentStatus}
                                      </div>
                                    </div>
                                    <div className="text-xs">
                                      <div className="font-semibold">
                                        {(document.word_count || 0).toLocaleString('zh-CN')}
                                        <span className="ml-1 text-[10px] font-normal text-black/35">字符</span>
                                      </div>
                                      {Boolean(document.tokens && document.tokens > 0) && (
                                        <div className="mt-1 text-[10px] text-black/35">{document.tokens!.toLocaleString('zh-CN')} tokens</div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-black/40">
                                      <ClockIcon className="h-4 w-4" />
                                      {formatDate(document.created_at)}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                      <a
                                        href={previewHref(document)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`${documentActionClass} border border-black/10 bg-white text-[var(--studio-ink)]`}
                                      >
                                        <EyeIcon className="h-4 w-4" />预览
                                      </a>
                                      <a
                                        href={downloadHref(document)}
                                        download={downloadName(document)}
                                        className={`${documentActionClass} bg-[var(--studio-deep)] text-white`}
                                      >
                                        <ArrowDownTrayIcon className="h-4 w-4" />下载
                                      </a>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-col items-center justify-between gap-3 border-t border-black/[0.07] px-4 py-4 text-xs sm:flex-row sm:px-5">
                  <span className="text-black/40">第 {safeCurrentGroupPage} / {totalGroupPages} 页 · 筛选后 {filteredDocumentGroups.length} 本/组 · {result.total} 份原始文档</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentGroupPage(page => Math.max(1, page - 1))}
                      disabled={safeCurrentGroupPage <= 1}
                      className="rounded-xl border border-black/10 bg-white px-4 py-2 transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentGroupPage(page => Math.min(totalGroupPages, page + 1))}
                      disabled={!hasMoreGroupPages}
                      className="rounded-xl border border-black/10 bg-white px-4 py-2 transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </>
            )}
      </PageCard>
    </div>
  )
}
