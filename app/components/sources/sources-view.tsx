'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ChevronRightIcon,
  DocumentMagnifyingGlassIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import type { KnowledgeReference } from '@/lib/demo-data'
import { readReferences } from '@/lib/reference-store'

interface SourcesViewProps {
  initialReferences: KnowledgeReference[]
}

export default function SourcesView({ initialReferences }: SourcesViewProps) {
  const [query, setQuery] = useState('')
  const [references, setReferences] = useState(initialReferences)
  const [selectedId, setSelectedId] = useState(initialReferences[0]?.id)

  useEffect(() => {
    const local = readReferences()
    if (local.length) {
      setReferences([...local, ...initialReferences].filter((item, index, list) =>
        list.findIndex(candidate =>
          candidate.documentName === item.documentName
          && candidate.pageNumber === item.pageNumber
          && candidate.quote === item.quote,
        ) === index,
      ))
    }
  }, [initialReferences])

  const filtered = useMemo(() => references.filter(item =>
    `${item.documentName} ${item.topic} ${item.quote}`.toLowerCase().includes(query.toLowerCase()),
  ), [query, references])

  const documents = useMemo(() => {
    const grouped = new Map<string, KnowledgeReference[]>()
    filtered.forEach((item) => {
      grouped.set(item.documentName, [...(grouped.get(item.documentName) || []), item])
    })
    return Array.from(grouped.entries())
  }, [filtered])

  const selected = references.find(item => item.id === selectedId) || filtered[0]

  const exportReferences = () => {
    const rows = [
      ['文档名', '分卷页码', '原 PDF 页码', '知识点', '引用片段'],
      ...filtered.map(item => [
        item.documentName,
        String(item.pageNumber || ''),
        String(item.originalPageNumber || ''),
        item.topic,
        item.quote || '',
      ]),
    ]
    const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = '知识库引用清单.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          ['引用文档', `${documents.length}`, '份', 'bg-[#e9f2ff] text-[#345e88]'],
          ['教材页码', `${new Set(references.map(item => `${item.documentName}:${item.pageNumber}`)).size}`, '页', 'bg-[#e9f6ee] text-[#3f7558]'],
          ['平均相关度', `${Math.round(references.reduce((sum, item) => sum + (item.score || 0), 0) / references.length * 100)}`, '%', 'bg-[#fff0df] text-[#9b663a]'],
        ].map(([label, value, unit, tone]) => (
          <PageCard key={label} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-xs font-medium text-[#75827b]">{label}</div>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-2xl font-semibold tracking-tight">{value}</span>
                <span className="mb-0.5 text-xs text-[#829088]">{unit}</span>
              </div>
            </div>
            <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}>
              <BookOpenIcon className="h-5 w-5" />
            </div>
          </PageCard>
        ))}
      </div>

      <PageCard className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#183129]/[0.07] p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9690]" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索文档名、知识点或引用内容"
              className="h-10 w-full rounded-xl border border-[#183129]/10 bg-[#f8f8f3] pl-10 pr-4 text-xs outline-none transition focus:border-[#4f7665]/40 focus:bg-white"
            />
          </div>
          <button className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#183129]/10 bg-white px-4 text-xs font-medium text-[#526159]">
            <FunnelIcon className="h-4 w-4" />
            最近引用
          </button>
          <button
            onClick={exportReferences}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#17342b] px-4 text-xs font-semibold text-white"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            导出清单
          </button>
        </div>

        <div className="grid min-h-[620px] lg:grid-cols-[300px_1fr_410px]">
          <aside className="border-b border-[#183129]/[0.07] bg-[#fafaf6] lg:border-b-0 lg:border-r">
            <div className="border-b border-[#183129]/[0.07] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7b8982]">
              文档目录 · {documents.length}
            </div>
            <div className="max-h-[570px] overflow-y-auto p-2.5">
              {documents.map(([documentName, items]) => {
                const active = items.some(item => item.id === selected?.id)
                return (
                  <button
                    key={documentName}
                    onClick={() => setSelectedId(items[0].id)}
                    className={`mb-1.5 flex w-full gap-3 rounded-xl p-3 text-left transition ${
                      active ? 'bg-[#e7f0e8] text-[#17342b]' : 'hover:bg-[#f0f1ec]'
                    }`}
                  >
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-[#17342b] text-[#dff67a]' : 'bg-white text-[#718078]'}`}>
                      <DocumentMagnifyingGlassIcon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-xs font-semibold leading-5">{documentName}</div>
                      <div className="mt-1 text-[10px] text-[#85918b]">{items.length} 条引用 · 最近 {items[0].topic}</div>
                    </div>
                    <ChevronRightIcon className="mt-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="border-b border-[#183129]/[0.07] p-5 lg:border-b-0 lg:border-r">
            {selected && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#e7f0e8] px-2.5 py-1 text-[10px] font-semibold text-[#35634e]">{selected.topic}</span>
                  <span className="rounded-full bg-[#f1f1ed] px-2.5 py-1 text-[10px] text-[#718078]">
                    分卷第 {selected.pageNumber} 页
                  </span>
                  {selected.originalPageNumber && (
                    <span className="rounded-full bg-[#fff0df] px-2.5 py-1 text-[10px] text-[#9b663a]">
                      原 PDF 第 {selected.originalPageNumber} 页
                    </span>
                  )}
                </div>
                <h2 className="mt-4 break-all text-base font-semibold leading-7">{selected.documentName}</h2>
                <div className="mt-1 text-[11px] text-[#8a9690]">{selected.datasetName}</div>

                <div className="mt-6 rounded-2xl border border-[#183129]/[0.075] bg-[#f8f8f3] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#75827b]">命中片段</div>
                    <div className="text-[10px] font-semibold text-[#47705e]">相关度 {Math.round((selected.score || 0) * 100)}%</div>
                  </div>
                  <blockquote className="border-l-2 border-[#88a992] pl-4 text-sm leading-7 text-[#394942]">
                    {selected.quote}
                  </blockquote>
                </div>

                <div className="mt-5">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#75827b]">同文档引用</div>
                  <div className="space-y-2">
                    {references.filter(item => item.documentName === selected.documentName).map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                          item.id === selected.id
                            ? 'border-[#537865]/25 bg-[#f0f5ef]'
                            : 'border-[#183129]/[0.07] hover:bg-[#fafaf6]'
                        }`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-xs font-semibold text-[#4f6d5f]">
                          {item.pageNumber}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-[#5f6e66]">{item.quote}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <a href={`/chat?conversation=${selected.conversationId}`} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#315f4b]">
                  回到引用这段内容的对话
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </a>
              </>
            )}
          </section>

          <section className="bg-[#eeeee8] p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">来源整页预览</div>
                <div className="mt-1 text-[10px] text-[#7f8a84]">教材页图 · 仅当前用户可见</div>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#617068] shadow-sm">
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-auto aspect-[0.72] max-h-[515px] overflow-hidden rounded-lg bg-white p-7 shadow-[0_20px_50px_rgba(36,47,42,.15)]">
              <div className="flex items-end justify-between border-b-2 border-[#263832] pb-3">
                <div>
                  <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#63736b]">Chapter 4 · 网络层</div>
                  <div className="mt-1.5 text-base font-bold">最长前缀匹配</div>
                </div>
                <div className="text-xl font-light text-[#97a29d]">{selected?.originalPageNumber || selected?.pageNumber}</div>
              </div>
              <div className="mt-5 h-2 w-[72%] rounded-full bg-[#d5dbd7]" />
              <div className="mt-2 h-2 w-[93%] rounded-full bg-[#e2e5e2]" />
              <div className="mt-2 h-2 w-[85%] rounded-full bg-[#e2e5e2]" />
              <div className="mt-6 rounded-xl bg-[#edf4ef] p-4">
                <div className="text-[9px] font-semibold text-[#456253]">核心规则</div>
                <div className="mt-2 text-[10px] leading-5 text-[#586860]">
                  多个网络前缀同时匹配时，选择前缀长度最长、地址范围最具体的路由项。
                </div>
              </div>
              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="rounded-lg border border-[#cad4ce] p-3 text-center">
                  <div className="text-[8px] text-[#7c8982]">目的地址</div>
                  <div className="mt-1 text-[10px] font-semibold">11.1.2.5</div>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-[#7e8d85]" />
                <div className="rounded-lg bg-[#17342b] p-3 text-center text-white">
                  <div className="text-[8px] text-white/55">最佳匹配</div>
                  <div className="mt-1 text-[10px] font-semibold text-[#dff67a]">11.1.2.0/24</div>
                </div>
              </div>
              <div className="mt-7 space-y-2">
                {[90, 76, 95, 62, 86, 72].map((width, index) => (
                  <div key={index} className="h-1.5 rounded-full bg-[#e5e8e6]" style={{ width: `${width}%` }} />
                ))}
              </div>
              <div className="mt-7 border-t border-[#dfe3e0] pt-3 text-center text-[8px] text-[#9ba49f]">
                计算机网络（第8版）· 教学用途预览
              </div>
            </div>
          </section>
        </div>
      </PageCard>
    </div>
  )
}
