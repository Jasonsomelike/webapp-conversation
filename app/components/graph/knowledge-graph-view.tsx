'use client'

import { useMemo, useState } from 'react'
import {
  ArrowsPointingOutIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CursorArrowRaysIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import { graphEdges, graphNodes } from '@/lib/demo-data'

const tones: Record<string, string> = {
  user: 'bg-[#17342b] text-white border-[#17342b]',
  topic: 'bg-[#e4f0e7] text-[#315f4b] border-[#82a18f]/35',
  concept: 'bg-[#e9effa] text-[#3f5f86] border-[#8299b5]/30',
  weakness: 'bg-[#fff0df] text-[#9b5d31] border-[#d69b68]/35',
  document: 'bg-white text-[#5e6d65] border-[#89978f]/25',
  skill: 'bg-[#f0e8fa] text-[#745294] border-[#9b80b5]/30',
  next: 'bg-[#eaf5bc] text-[#4e6422] border-[#91a952]/35',
}

export default function KnowledgeGraphView() {
  const [selected, setSelected] = useState('lpm')
  const [zoom, setZoom] = useState(1)
  const selectedNode = graphNodes.find(node => node.id === selected)!

  const related = useMemo(() => graphEdges.filter(edge => edge.source === selected || edge.target === selected), [selected])

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <div className="mb-5 grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap gap-2">
            {[
              ['全部关系', 'bg-[#17342b] text-white'],
              ['知识点', 'bg-[#e4f0e7] text-[#315f4b]'],
              ['引用文档', 'bg-white text-[#65736c]'],
              ['薄弱环节', 'bg-[#fff0df] text-[#9b5d31]'],
              ['推荐路径', 'bg-[#eaf5bc] text-[#4e6422]'],
            ].map(([label, style]) => (
              <button key={label} className={`rounded-full border border-[#183129]/[0.07] px-3 py-1.5 text-[11px] font-medium ${style}`}>{label}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-[#e9f3ed] px-3 py-1.5 text-[11px] font-medium text-[#4c6b5c]">
            9 节点 · 10 关系
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-xl border border-[#183129]/10 bg-white">
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <PageCard className="relative min-h-[680px] overflow-hidden bg-[#f8f8f3]">
          <div className="absolute left-5 top-5 z-20 rounded-xl border border-[#183129]/10 bg-white/90 px-3 py-2 text-[10px] text-[#728078] shadow-sm backdrop-blur">
            <CursorArrowRaysIcon className="mr-1.5 inline h-3.5 w-3.5" />
            点击节点查看学习证据
          </div>
          <div className="absolute bottom-5 right-5 z-20 flex overflow-hidden rounded-xl border border-[#183129]/10 bg-white shadow-sm">
            <button onClick={() => setZoom(value => Math.min(1.25, value + 0.1))} className="grid h-9 w-9 place-items-center border-r border-[#183129]/10">
              <MagnifyingGlassPlusIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setZoom(value => Math.max(0.75, value - 0.1))} className="grid h-9 w-9 place-items-center">
              <MagnifyingGlassMinusIcon className="h-4 w-4" />
            </button>
          </div>

          <div
            className="absolute inset-0 origin-center transition-transform duration-300"
            style={{
              transform: `scale(${zoom})`,
              backgroundImage: 'radial-gradient(rgba(57,80,69,.12) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          >
            <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
              {graphEdges.map((edge, index) => {
                const source = graphNodes.find(node => node.id === edge.source)!
                const target = graphNodes.find(node => node.id === edge.target)!
                const highlighted = edge.source === selected || edge.target === selected
                return (
                  <line
                    key={`${edge.source}-${edge.target}-${index}`}
                    x1={`${source.x}%`}
                    y1={`${source.y}%`}
                    x2={`${target.x}%`}
                    y2={`${target.y}%`}
                    stroke={highlighted ? '#547a67' : '#aab5af'}
                    strokeWidth={highlighted ? 2.2 : 1.2}
                    strokeDasharray={edge.type === 'recommended_next' ? '6 5' : undefined}
                    opacity={highlighted ? 0.85 : 0.45}
                  />
                )
              })}
            </svg>

            {graphNodes.map((node) => {
              const active = node.id === selected
              return (
                <button
                  key={node.id}
                  onClick={() => setSelected(node.id)}
                  className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold shadow-[0_10px_28px_rgba(34,55,46,.11)] transition-all hover:-translate-y-[55%] ${
                    tones[node.type]
                  } ${active ? 'ring-4 ring-[#dff67a]/60' : ''}`}
                  style={{ left: `${node.x}%`, top: `${node.y}%`, fontSize: `${Math.min(14, 10 + node.weight * 0.35)}px` }}
                >
                  {node.label}
                  {node.type === 'weakness' && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#dc744e]" />}
                </button>
              )
            })}
          </div>
        </PageCard>

        <div className="space-y-5">
          <PageCard className="overflow-hidden">
            <div className="border-b border-[#183129]/[0.07] p-5">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${tones[selectedNode.type]}`}>
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#819087]">{selectedNode.type}</div>
                  <h2 className="mt-1 text-base font-semibold">{selectedNode.label}</h2>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-xs leading-6 text-[#65736c]">
                {selectedNode.id === 'lpm'
                  ? '这是你当前最需要强化的知识点。你已经理解“前缀越长越具体”，但在默认路由、主机路由和重叠地址块同时出现时仍会反复确认。'
                  : '该节点来自你的近期对话、知识库引用与学习记忆。点击相连节点可以继续追溯它的来源和下一步关系。'}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[#f2f3ee] p-3">
                  <div className="text-[10px] text-[#819087]">关联关系</div>
                  <div className="mt-1 text-lg font-semibold">{related.length}</div>
                </div>
                <div className="rounded-xl bg-[#f2f3ee] p-3">
                  <div className="text-[10px] text-[#819087]">掌握置信度</div>
                  <div className="mt-1 text-lg font-semibold">{selectedNode.id === 'lpm' ? '58%' : '76%'}</div>
                </div>
              </div>
            </div>
          </PageCard>

          <PageCard className="p-5">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.17em] text-[#819087]">关系证据</div>
            <div className="space-y-3">
              {related.slice(0, 4).map((edge, index) => {
                const otherId = edge.source === selected ? edge.target : edge.source
                const other = graphNodes.find(node => node.id === otherId)!
                return (
                  <button key={index} onClick={() => setSelected(otherId)} className="flex w-full items-center gap-3 text-left">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#eef1ed] text-[#64736b]">
                      {other.type === 'document' ? <BookOpenIcon className="h-4 w-4" /> : <ChatBubbleLeftRightIcon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{other.label}</div>
                      <div className="mt-0.5 text-[10px] text-[#8a9690]">{edge.type.replaceAll('_', ' ')}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </PageCard>

          <div className="rounded-[22px] bg-[#17342b] p-5 text-white shadow-[0_18px_50px_rgba(23,52,43,.16)]">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#dff67a]">AI 建议</div>
            <div className="mt-2 text-sm font-semibold">从最长前缀匹配进入 OSPF</div>
            <p className="mt-2 text-[11px] leading-5 text-white/55">完成两道多前缀冲突题后，你的图谱将自动解锁“链路状态路由”学习路径。</p>
            <button className="mt-4 rounded-xl bg-[#dff67a] px-4 py-2 text-[11px] font-semibold text-[#17342b]">开始今日任务</button>
          </div>
        </div>
      </div>
    </div>
  )
}
