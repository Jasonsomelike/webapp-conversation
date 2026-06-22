'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  EyeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import type { DifyDocumentList } from '@/lib/dify-dataset'

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
  ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp * 1000))
  : '—'

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

  useEffect(() => {
    setResult(initialResult)
    setError(initialError)
  }, [initialError, initialResult])

  const refreshDocuments = useCallback(async (showLoading = false) => {
    if (showLoading)
    { setRefreshing(true) }
    try {
      const params = new URLSearchParams({
        page: String(initialResult.page),
        limit: '20',
      })
      if (keyword)
      { params.set('keyword', keyword) }
      if (status)
      { params.set('status', status) }
      params.set('refresh', '1')
      const response = await fetch(`/api/library/documents?${params}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!response.ok)
      { throw new Error(`LIBRARY_REFRESH_FAILED:${response.status}`) }
      setResult(await response.json())
      setError('')
    }
    catch {
      if (showLoading)
      { setError('知识库同步失败，请稍后重试。') }
    }
    finally {
      if (showLoading)
      { setRefreshing(false) }
    }
  }, [initialResult.page, keyword, status])

  const completed = result.data.filter(item => ['completed', 'available'].includes(item.indexing_status || item.display_status || '')).length
  const totalWords = result.data.reduce((sum, item) => sum + (item.word_count || 0), 0)
  const summaryCards = [
    { label: '知识库文档', value: result.total, unit: '份', icon: CircleStackIcon },
    { label: '本页索引完成', value: completed, unit: '份', icon: CheckCircleIcon },
    { label: '本页总字符数', value: totalWords.toLocaleString('zh-CN'), unit: '字符', icon: DocumentTextIcon },
  ]
  const buildHref = (page: number) => {
    const params = new URLSearchParams()
    if (keyword)
    { params.set('keyword', keyword) }
    if (status)
    { params.set('status', status) }
    params.set('page', String(page))
    return `/library?${params}`
  }

  return (
    <div className="mx-auto max-w-[1450px] p-4 sm:p-6">
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {summaryCards.map(({ label, value, unit, icon: Icon }) => (
          <PageCard key={label} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-xs text-black/45">{label}</div>
              <div className="mt-1 text-2xl font-semibold">{value}<span className="ml-1 text-xs font-normal text-black/35">{unit}</span></div>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--studio-accent)]/35 text-[var(--studio-accent-strong)]">
              <Icon className="h-5 w-5" />
            </div>
          </PageCard>
        ))}
      </div>

      <PageCard className="overflow-hidden">
        <form className="flex flex-col gap-3 border-b border-black/[0.07] p-4 sm:flex-row" action="/library">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <input name="keyword" defaultValue={keyword} placeholder="按文档名称搜索知识库" className="h-10 w-full rounded-xl border border-black/10 bg-black/[0.025] pl-10 pr-4 text-xs outline-none focus:border-[var(--studio-accent-strong)]/40" />
          </div>
          <select name="status" defaultValue={status} className="h-10 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none">
            <option value="">全部状态</option>
            <option value="completed">索引完成</option>
            <option value="indexing">索引中</option>
            <option value="error">处理失败</option>
            <option value="paused">已暂停</option>
          </select>
          <button className="h-10 rounded-xl bg-[var(--studio-deep)] px-5 text-xs font-semibold text-white">查询文档</button>
          <button
            type="button"
            onClick={() => void refreshDocuments(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 text-xs font-semibold disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </form>

        <div className="flex items-center justify-end border-b border-black/[0.05] px-5 py-2 text-[10px] text-black/40">
          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${result.stale ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          服务端每 30 分钟同步
          {result.refreshed_at && ` · 最近更新 ${new Date(result.refreshed_at).toLocaleString('zh-CN', { hour12: false })}`}
        </div>

        {result.stale && result.data.length > 0 && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs text-amber-800">
            本次同步暂时失败，当前展示最近一次成功更新的数据。
          </div>
        )}

        {error
          ? <div className="p-10 text-center text-sm text-red-600">{error}</div>
          : !result.data.length
            ? (
              <div className="grid min-h-[420px] place-items-center p-10 text-center">
                <div>
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-black/20" />
                  <h2 className="mt-4 font-semibold">没有找到文档</h2>
                  <p className="mt-2 text-xs text-black/40">请调整搜索词或处理状态。</p>
                </div>
              </div>
            )
            : (
              <>
                <div className="divide-y divide-black/[0.06]">
                  {result.data.map((document) => {
                    const currentStatus = document.indexing_status || document.display_status || 'waiting'
                    const healthy = ['completed', 'available'].includes(currentStatus)
                    return (
                      <div key={document.id} className="grid gap-4 px-5 py-5 transition [contain-intrinsic-size:116px] [content-visibility:auto] hover:bg-black/[0.018] md:grid-cols-[minmax(0,1fr)_110px_100px_150px_150px] md:items-center">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--studio-accent)]/30 text-[var(--studio-accent-strong)]">
                            <DocumentTextIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold" title={document.name}>{document.name}</div>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-black/40">
                              <span>{document.data_source_type || '上传文件'}</span>
                              <span>{document.doc_form || '文本分段'}</span>
                              <span>命中 {document.hit_count || 0} 次</span>
                            </div>
                            {document.error && <div className="mt-2 text-[10px] text-red-600">{document.error}</div>}
                          </div>
                        </div>
                        <div>
                          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${healthy ? 'bg-emerald-50 text-emerald-700' : currentStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
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
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/library/preview/${document.id}?filename=${encodeURIComponent(document.name)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-2 text-[10px] font-semibold transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <EyeIcon className="h-3.5 w-3.5" />预览
                          </a>
                          <a
                            href={`/api/library/documents/${document.id}/file?disposition=attachment&filename=${encodeURIComponent(document.name)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--studio-deep)] px-2.5 py-2 text-[10px] font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <ArrowDownTrayIcon className="h-3.5 w-3.5" />下载
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-black/[0.07] px-5 py-4 text-xs">
                  <span className="text-black/40">第 {result.page} 页 · 共 {result.total} 份文档</span>
                  <div className="flex gap-2">
                    <Link href={buildHref(Math.max(1, result.page - 1))} aria-disabled={result.page <= 1} className={`rounded-xl border border-black/10 px-4 py-2 ${result.page <= 1 ? 'pointer-events-none opacity-35' : 'bg-white'}`}>上一页</Link>
                    <Link href={buildHref(result.page + 1)} aria-disabled={!result.has_more} className={`rounded-xl border border-black/10 px-4 py-2 ${!result.has_more ? 'pointer-events-none opacity-35' : 'bg-white'}`}>下一页</Link>
                  </div>
                </div>
              </>
            )}
      </PageCard>
    </div>
  )
}
