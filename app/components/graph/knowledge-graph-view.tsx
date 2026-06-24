'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import type { KnowledgeGraphEdge, KnowledgeGraphNode } from '@/lib/graph-data'
import { useChatRuntime } from '@/app/components/chat/runtime-store'

const tones: Record<string, string> = {
  user: 'bg-[#17342b] text-white border-[#17342b]',
  topic: 'bg-[#e4f0e7] text-[#315f4b] border-[#82a18f]/35',
  concept: 'bg-[#e9effa] text-[#3f5f86] border-[#8299b5]/30',
  weakness: 'bg-[#fff0df] text-[#9b5d31] border-[#d69b68]/35',
  document: 'bg-white text-[#5e6d65] border-[#89978f]/25',
  skill: 'bg-[#f0e8fa] text-[#745294] border-[#9b80b5]/30',
  question: 'bg-[#fff7d9] text-[#80611b] border-[#d8bd67]/35',
  next: 'bg-[#eaf5bc] text-[#4e6422] border-[#91a952]/35',
}

export default function KnowledgeGraphView({ nodes: initialNodes, edges: initialEdges }: { nodes: KnowledgeGraphNode[], edges: KnowledgeGraphEdge[] }) {
  const router = useRouter()
  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)
  const [selected, setSelected] = useState(initialNodes.find(node => node.type === 'weakness')?.id || initialNodes[0]?.id || '')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const pointersRef = useRef(new Map<number, { x: number, y: number }>())
  const gestureRef = useRef<{
    mode: 'idle' | 'drag' | 'pinch'
    startX: number
    startY: number
    startPanX: number
    startPanY: number
    startDistance: number
    graphCenterX: number
    graphCenterY: number
  }>({
    mode: 'idle',
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    startDistance: 0,
    graphCenterX: 0,
    graphCenterY: 0,
  })
  const viewportRef = useRef<HTMLElement>(null)
  const chatResponding = useChatRuntime(state => state.isResponding)
  const selectedNode = nodes.find(node => node.id === selected) || nodes[0]

  const related = useMemo(() => edges.filter(edge => edge.source === selected || edge.target === selected), [edges, selected])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof globalThis.setInterval> | undefined
    const refresh = async () => {
      try {
        const response = await fetch('/api/graph', { credentials: 'include', cache: 'no-store' })
        if (!response.ok)
        { return }
        const graph = await response.json() as { nodes?: KnowledgeGraphNode[], edges?: KnowledgeGraphEdge[] }
        if (cancelled || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges))
        { return }
        setNodes(graph.nodes)
        setEdges(graph.edges)
        setSelected(current => graph.nodes!.some(node => node.id === current)
          ? current
          : graph.nodes!.find(node => node.type === 'weakness')?.id || graph.nodes![0]?.id || '')
      }
      catch {
        // Keep the last successfully rendered graph while a refresh is unavailable.
      }
    }
    void refresh()
    if (chatResponding)
    { timer = globalThis.setInterval(refresh, 3500) }
    return () => {
      cancelled = true
      if (timer)
      { globalThis.clearInterval(timer) }
    }
  }, [chatResponding])

  const updatePan = (nextPan: { x: number, y: number }) => {
    panRef.current = nextPan
    setPan(nextPan)
  }

  const updateZoom = (nextZoom: number) => {
    const clamped = Math.min(2.5, Math.max(0.45, nextZoom))
    zoomRef.current = clamped
    setZoom(clamped)
    return clamped
  }

  const pointerPair = () => [...pointersRef.current.values()].slice(0, 2)
  const pointerDistance = (pair: Array<{ x: number, y: number }>) =>
    Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y)
  const pointerCenter = (pair: Array<{ x: number, y: number }>) => ({
    x: (pair[0].x + pair[1].x) / 2,
    y: (pair[0].y + pair[1].y) / 2,
  })

  const startPinch = (element: HTMLElement) => {
    const pair = pointerPair()
    if (pair.length < 2)
    { return }
    const rect = element.getBoundingClientRect()
    const center = pointerCenter(pair)
    const localCenter = { x: center.x - rect.left, y: center.y - rect.top }
    gestureRef.current = {
      mode: 'pinch',
      startX: 0,
      startY: 0,
      startPanX: panRef.current.x,
      startPanY: panRef.current.y,
      startDistance: Math.max(1, pointerDistance(pair)),
      graphCenterX: (localCenter.x - panRef.current.x) / zoomRef.current,
      graphCenterY: (localCenter.y - panRef.current.y) / zoomRef.current,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (
      (event.pointerType === 'mouse' && event.button !== 0)
      || (event.target as HTMLElement).closest('[data-graph-control]')
      || (event.pointerType === 'mouse' && (event.target as HTMLElement).closest('button, a'))
    )
    { return }
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size >= 2)
    { startPinch(event.currentTarget) }
    else {
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'drag',
        startX: event.clientX,
        startY: event.clientY,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
      }
    }
    setIsDragging(true)
  }
  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!pointersRef.current.has(event.pointerId))
    { return }
    event.preventDefault()
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size >= 2) {
      if (gestureRef.current.mode !== 'pinch')
      { startPinch(event.currentTarget) }
      const pair = pointerPair()
      const rect = event.currentTarget.getBoundingClientRect()
      const center = pointerCenter(pair)
      const localCenter = { x: center.x - rect.left, y: center.y - rect.top }
      const nextZoom = updateZoom(
        zoomRef.current * pointerDistance(pair) / Math.max(1, gestureRef.current.startDistance),
      )
      gestureRef.current.startDistance = pointerDistance(pair)
      updatePan({
        x: localCenter.x - gestureRef.current.graphCenterX * nextZoom,
        y: localCenter.y - gestureRef.current.graphCenterY * nextZoom,
      })
      return
    }
    if (gestureRef.current.mode === 'drag') {
      updatePan({
        x: gestureRef.current.startPanX + event.clientX - gestureRef.current.startX,
        y: gestureRef.current.startPanY + event.clientY - gestureRef.current.startY,
      })
    }
  }
  const finishDrag = (event: React.PointerEvent<HTMLElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
    { event.currentTarget.releasePointerCapture(event.pointerId) }
    const remaining = [...pointersRef.current.values()][0]
    if (remaining) {
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'drag',
        startX: remaining.x,
        startY: remaining.y,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
      }
    }
    else {
      gestureRef.current.mode = 'idle'
      setIsDragging(false)
    }
  }

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport)
    { return }
    const isolateGraphZoom = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const rect = viewport.getBoundingClientRect()
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      const graphPoint = {
        x: (point.x - panRef.current.x) / zoomRef.current,
        y: (point.y - panRef.current.y) / zoomRef.current,
      }
      const nextZoom = updateZoom(zoomRef.current * (event.deltaY < 0 ? 1.1 : 0.9))
      updatePan({
        x: point.x - graphPoint.x * nextZoom,
        y: point.y - graphPoint.y * nextZoom,
      })
    }
    const isolateTouchMove = (event: TouchEvent) => {
      if (event.touches.length)
      { event.preventDefault() }
    }
    viewport.addEventListener('wheel', isolateGraphZoom, { passive: false, capture: true })
    viewport.addEventListener('touchmove', isolateTouchMove, { passive: false, capture: true })
    return () => {
      viewport.removeEventListener('wheel', isolateGraphZoom, { capture: true })
      viewport.removeEventListener('touchmove', isolateTouchMove, { capture: true })
    }
  }, [])

  const resetViewport = () => {
    updateZoom(1)
    updatePan({ x: 0, y: 0 })
  }

  const zoomFromCenter = (factor: number) => {
    const viewport = viewportRef.current
    if (!viewport)
    { return }
    const point = { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 }
    const graphPoint = {
      x: (point.x - panRef.current.x) / zoomRef.current,
      y: (point.y - panRef.current.y) / zoomRef.current,
    }
    const nextZoom = updateZoom(zoomRef.current * factor)
    updatePan({
      x: point.x - graphPoint.x * nextZoom,
      y: point.y - graphPoint.y * nextZoom,
    })
  }

  if (!nodes.length || !selectedNode) {
    return (
      <div className="mx-auto flex h-full min-h-[520px] max-w-[1000px] items-center justify-center p-5 sm:p-8">
        <PageCard className="w-full max-w-xl px-6 py-12 text-center sm:px-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[var(--studio-accent)]/35 text-[var(--studio-accent-strong)]">
            <SparklesIcon className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">知识图谱还是空的</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--studio-muted)]">
            完成一次计算机网络学习对话后，系统会根据你的问题和知识库引用生成专属节点与关系。
          </p>
          <a href="/chat" className="mt-6 inline-flex rounded-xl bg-[var(--studio-deep)] px-5 py-2.5 text-xs font-semibold text-white">
            开始第一次学习对话
          </a>
        </PageCard>
      </div>
    )
  }

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
            {nodes.length} 节点 · {edges.length} 关系
          </div>
          <button onClick={resetViewport} title="重置画布位置和缩放" className="grid h-9 w-9 place-items-center rounded-xl border border-[#183129]/10 bg-white">
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <PageCard
          ref={viewportRef}
          className={`relative h-[62dvh] min-h-[460px] overflow-hidden overscroll-none bg-[#f8f8f3] sm:h-auto sm:min-h-[680px] ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          style={{ touchAction: 'none', isolation: 'isolate' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div className="absolute left-5 top-5 z-20 rounded-xl border border-[#183129]/10 bg-white/90 px-3 py-2 text-[10px] text-[#728078] shadow-sm backdrop-blur">
            <CursorArrowRaysIcon className="mr-1.5 inline h-3.5 w-3.5" />
            <span className="sm:hidden">单指拖动 · 双指缩放 · 点击节点</span>
            <span className="hidden sm:inline">拖动画布 · 滚轮缩放 · 点击节点查看证据</span>
          </div>
          <div data-graph-control className="absolute bottom-5 right-5 z-20 flex overflow-hidden rounded-xl border border-[#183129]/10 bg-white shadow-sm">
            <button onClick={() => zoomFromCenter(1.15)} className="grid h-11 w-11 place-items-center border-r border-[#183129]/10 sm:h-9 sm:w-9">
              <MagnifyingGlassPlusIcon className="h-4 w-4" />
            </button>
            <button onClick={() => zoomFromCenter(0.85)} className="grid h-11 w-11 place-items-center sm:h-9 sm:w-9">
              <MagnifyingGlassMinusIcon className="h-4 w-4" />
            </button>
          </div>

          <div
            className={`absolute inset-0 origin-center ${isDragging ? '' : 'transition-transform duration-200'}`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              backgroundImage: 'radial-gradient(rgba(57,80,69,.12) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          >
            <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
              {edges.map((edge, index) => {
                const source = nodes.find(node => node.id === edge.source)!
                const target = nodes.find(node => node.id === edge.target)!
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

            {nodes.map((node) => {
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
                {selectedNode.description || '该节点来自当前账号的近期对话、知识库引用与学习证据。'}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[#f2f3ee] p-3">
                  <div className="text-[10px] text-[#819087]">关联关系</div>
                  <div className="mt-1 text-lg font-semibold">{related.length}</div>
                </div>
                <div className="rounded-xl bg-[#f2f3ee] p-3">
                  <div className="text-[10px] text-[#819087]">掌握置信度</div>
                  <div className="mt-1 text-lg font-semibold">{selectedNode.confidence || 60}%</div>
                </div>
              </div>
            </div>
          </PageCard>

          <PageCard className="p-5">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.17em] text-[#819087]">关系证据</div>
            <div className="space-y-3">
              {related.slice(0, 4).map((edge, index) => {
                const otherId = edge.source === selected ? edge.target : edge.source
                const other = nodes.find(node => node.id === otherId)!
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
            <div className="mt-2 text-sm font-semibold">围绕当前薄弱点继续学习</div>
            <p className="mt-2 text-[11px] leading-5 text-white/55">从当前选中的知识点出发，结合相邻问题、引用文档和推荐节点完成下一轮巩固。</p>
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem(
                  'network-study-prefill-chat',
                  `围绕“${selectedNode.label}”安排今天的计算机网络学习任务，并结合我的历史学习记录给出练习建议。`,
                )
                sessionStorage.setItem('network-study-open-chat-detail', '1')
                router.push('/chat')
              }}
              className="mt-4 rounded-xl bg-[#dff67a] px-4 py-2 text-[11px] font-semibold text-[#17342b]"
            >
              开始今日任务
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
