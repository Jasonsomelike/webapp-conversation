'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  ArrowUturnLeftIcon,
  ArrowsPointingOutIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CursorArrowRaysIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useChatRuntime } from '@/app/components/chat/runtime-store'
import PageCard from '@/app/components/workspace/page-card'
import type { KnowledgeGraphEdge, KnowledgeGraphNode } from '@/lib/graph-data'

gsap.registerPlugin(useGSAP)

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

const edgeLabel = (edge: KnowledgeGraphEdge) =>
  edge.description || edge.type.replaceAll('_', ' ')

const markerTypes = new Set(['contains', 'depends-on', 'belongs-to', 'implements', 'related-to', 'recommended-next'])
const normalizeRelationType = (type: string) => {
  const normalized = type.replaceAll('_', '-').replace(/[^a-z0-9-\u4e00-\u9fa5]/gi, '').toLowerCase()
  if (normalized.includes('contains') || normalized.includes('包含'))
  { return 'contains' }
  if (normalized.includes('depends-on') || normalized.includes('依赖'))
  { return 'depends-on' }
  if (normalized.includes('belongs-to') || normalized.includes('归属'))
  { return 'belongs-to' }
  if (normalized.includes('implements') || normalized.includes('实现'))
  { return 'implements' }
  if (normalized.includes('recommended-next') || normalized.includes('推荐'))
  { return 'recommended-next' }
  if (normalized.includes('related-to') || normalized.includes('相关'))
  { return 'related-to' }
  return markerTypes.has(normalized) ? normalized : 'related-to'
}
const arrowMarkerId = (edge: KnowledgeGraphEdge, highlighted: boolean) => {
  if (highlighted)
  { return 'graph-arrow-active' }
  return `graph-arrow-${normalizeRelationType(edge.type)}`
}

export default function KnowledgeGraphView({
  nodes: initialNodes,
  edges: initialEdges,
  isDemo = false,
  staticNotice,
  rootNodeId: preferredRootNodeId,
  nodeNavigationBasePath,
  parentNodeId,
  leafNodeIds = [],
  colorByDepth = false,
  omittedNodeCount = 0,
  emptyTitle = '知识图谱还是空的',
  emptyDescription = '完成一次计算机网络学习对话后，系统会根据你的问题和知识库引用生成专属节点与关系。',
}: {
  nodes: KnowledgeGraphNode[]
  edges: KnowledgeGraphEdge[]
  isDemo?: boolean
  staticNotice?: string
  rootNodeId?: string
  nodeNavigationBasePath?: string
  parentNodeId?: string
  leafNodeIds?: string[]
  colorByDepth?: boolean
  omittedNodeCount?: number
  emptyTitle?: string
  emptyDescription?: string
}) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLElement>(null)
  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)
  const [selected, setSelected] = useState(initialNodes.find(node => node.id === preferredRootNodeId)?.id || initialNodes.find(node => node.type === 'weakness')?.id || initialNodes[0]?.id || '')
  const [hoveredNodeId, setHoveredNodeId] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const hasHoverAnimatedRef = useRef(false)
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
  const chatResponding = useChatRuntime(state => state.isResponding)
  const selectedNode = nodes.find(node => node.id === selected) || nodes[0]
  const leafNodeSet = useMemo(() => new Set(leafNodeIds), [leafNodeIds])
  const rootNodeId = useMemo(
    () => nodes.find(node => node.id === preferredRootNodeId)?.id || nodes.find(node => node.type === 'user')?.id || nodes[0]?.id || '',
    [nodes, preferredRootNodeId],
  )
  const layoutCenterNode = useMemo(
    () => nodes.find(node => node.id === rootNodeId) || nodes.find(node => node.id === selected) || nodes[0],
    [nodes, rootNodeId, selected],
  )
  const graphDepth = useMemo(() => {
    const depths = new Map<string, number>()
    if (!rootNodeId)
    { return depths }

    const adjacency = new Map<string, string[]>()
    nodes.forEach(node => adjacency.set(node.id, []))
    edges.forEach((edge) => {
      if (!adjacency.has(edge.source) || !adjacency.has(edge.target))
      { return }
      adjacency.get(edge.source)!.push(edge.target)
      adjacency.get(edge.target)!.push(edge.source)
    })

    const queue = [rootNodeId]
    depths.set(rootNodeId, 0)
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index]
      const currentDepth = depths.get(current) ?? 0
      adjacency.get(current)?.forEach((next) => {
        if (depths.has(next))
        { return }
        depths.set(next, currentDepth + 1)
        queue.push(next)
      })
    }
    return depths
  }, [edges, nodes, rootNodeId])
  const related = useMemo(() => edges.filter(edge => edge.source === selected || edge.target === selected), [edges, selected])
  const focusedNodeId = hoveredNodeId || selected
  const interactionNodeId = hoveredNodeId
  const focusedNodeIds = useMemo(() => {
    if (!interactionNodeId)
    { return new Set<string>() }
    const ids = new Set<string>([interactionNodeId])
    edges.forEach((edge) => {
      if (edge.source === interactionNodeId)
      { ids.add(edge.target) }
      if (edge.target === interactionNodeId)
      { ids.add(edge.source) }
    })
    return ids
  }, [edges, interactionNodeId])

  const depthTone = (nodeId: string) => {
    const depth = graphDepth.get(nodeId) ?? 2
    if (depth <= 0)
    { return 'bg-[#17342b] text-white border-[#17342b]' }
    if (depth === 1)
    { return 'bg-[#e4f0e7] text-[#315f4b] border-[#82a18f]/35' }
    return 'bg-[#edf0ff] text-[#66508e] border-[#a993cf]/35'
  }
  const nodeTone = (node: KnowledgeGraphNode) => colorByDepth ? depthTone(node.id) : (tones[node.type] || tones.concept)
  const canDrillInto = (nodeId: string) => Boolean(nodeNavigationBasePath && nodeId !== rootNodeId && !leafNodeSet.has(nodeId))
  const getNodeDistance = (nodeId: string) => graphDepth.get(nodeId) ?? 2
  const graphRadialOrder = (node: KnowledgeGraphNode) =>
    getNodeDistance(node.id) * 100 + Math.hypot(node.x - (layoutCenterNode?.x ?? 50), node.y - (layoutCenterNode?.y ?? 50))
  const nodeEndpointOffset = (nodeId: string) => {
    const distance = getNodeDistance(nodeId)
    if (distance <= 0)
    { return 3.7 }
    if (distance === 1)
    { return 3.25 }
    return 2.85
  }

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
    setSelected(initialNodes.find(node => node.id === preferredRootNodeId)?.id || initialNodes.find(node => node.type === 'weakness')?.id || initialNodes[0]?.id || '')
    setHoveredNodeId('')
  }, [initialEdges, initialNodes, preferredRootNodeId])

  useGSAP(() => {
    const root = rootRef.current
    if (!root)
    { return }

    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(root.querySelectorAll('[data-graph-toolbar], [data-graph-panel], [data-graph-node], [data-graph-edge], [data-graph-relation]'), {
        autoAlpha: 1,
        clearProps: 'transform,opacity,visibility',
      })
      return
    }

    const graphNodes = gsap.utils.toArray<HTMLElement>('[data-graph-node]', root)
      .sort((left, right) => Number.parseFloat(left.dataset.graphOrder || '0') - Number.parseFloat(right.dataset.graphOrder || '0'))
    const graphEdges = gsap.utils.toArray<SVGElement>('[data-graph-edge]', root)
      .sort((left, right) => Number.parseFloat(left.dataset.graphOrder || '0') - Number.parseFloat(right.dataset.graphOrder || '0'))
    const graphPulse = root.querySelector<HTMLElement>('[data-graph-center-pulse]')
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out', overwrite: 'auto' } })

    timeline.fromTo(
      root.querySelectorAll('[data-graph-toolbar], [data-graph-panel]'),
      { autoAlpha: 0, y: 16, scale: 0.985 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.42,
        stagger: 0.06,
        clearProps: 'opacity,visibility,transform',
      },
      0,
    )

    timeline.fromTo(
      graphEdges,
      { autoAlpha: 0 },
      {
        autoAlpha: 1,
        duration: 0.36,
        stagger: {
          each: 0.012,
          from: 0,
        },
        clearProps: 'opacity,visibility',
      },
      0.08,
    )

    timeline.fromTo(
      graphNodes,
      {
        autoAlpha: 0,
        scale: 0.54,
        x: (_index, element) => Number.parseFloat(element.dataset.graphEnterX || '0'),
        y: (_index, element) => Number.parseFloat(element.dataset.graphEnterY || '0'),
      },
      {
        autoAlpha: 1,
        scale: 1,
        x: 0,
        y: 0,
        duration: 0.52,
        ease: 'back.out(1.45)',
        stagger: {
          each: 0.016,
          from: 0,
        },
        clearProps: 'opacity,visibility,transform',
      },
      0.12,
    )

    if (graphPulse) {
      timeline.fromTo(
        graphPulse,
        { autoAlpha: 0.42, scale: 0.22 },
        {
          autoAlpha: 0,
          scale: 3.9,
          duration: 0.95,
          ease: 'power2.out',
          clearProps: 'opacity,visibility,transform',
        },
        0.16,
      )
    }
  }, {
    dependencies: [layoutCenterNode?.id, nodes.length, edges.length],
    revertOnUpdate: true,
    scope: rootRef,
  })

  useGSAP(() => {
    const root = rootRef.current
    if (!root || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    { return }

    const graphNodes = gsap.utils.toArray<HTMLElement>('[data-graph-node]', root)
    const graphLines = gsap.utils.toArray<SVGLineElement>('[data-graph-edge-line]', root)

    if (!hoveredNodeId) {
      if (!hasHoverAnimatedRef.current)
      { return }
      hasHoverAnimatedRef.current = false
      gsap.to(graphNodes, {
        filter: 'brightness(1)',
        duration: 0.16,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'filter',
      })
      gsap.to(graphLines, {
        filter: 'none',
        duration: 0.16,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'filter',
      })
      return
    }

    hasHoverAnimatedRef.current = true
    gsap.to(graphNodes, {
      filter: 'brightness(1)',
      duration: 0.16,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'filter',
    })
    gsap.to(graphLines, {
      filter: 'none',
      duration: 0.16,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'filter',
    })

    const connectedNodes = graphNodes.filter(node => focusedNodeIds.has(node.dataset.graphNodeId || ''))
    const connectedLines = graphLines.filter(line =>
      line.dataset.graphEdgeSource === hoveredNodeId || line.dataset.graphEdgeTarget === hoveredNodeId,
    )
    gsap.to(connectedNodes, {
      filter: 'brightness(1.065)',
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
    })
    gsap.to(connectedLines, {
      filter: 'drop-shadow(0 0 5px rgba(47,116,91,.32))',
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }, {
    dependencies: [focusedNodeIds, hoveredNodeId],
    revertOnUpdate: true,
    scope: rootRef,
  })

  useEffect(() => {
    if (isDemo || staticNotice || nodeNavigationBasePath)
    { return }
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
  }, [chatResponding, isDemo, nodeNavigationBasePath, staticNotice])

  const updatePan = useCallback((nextPan: { x: number, y: number }) => {
    panRef.current = nextPan
    setPan(nextPan)
  }, [])

  const updateZoom = useCallback((nextZoom: number) => {
    const clamped = Math.min(2.8, Math.max(0.45, nextZoom))
    zoomRef.current = clamped
    setZoom(clamped)
    return clamped
  }, [])

  const fitGraphToViewport = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport || !nodes.length) {
      updateZoom(1)
      updatePan({ x: 0, y: 0 })
      return
    }
    const width = viewport.clientWidth
    const height = viewport.clientHeight
    if (!width || !height) {
      updateZoom(1)
      updatePan({ x: 0, y: 0 })
      return
    }

    const xs = nodes.map(node => node.x)
    const ys = nodes.map(node => node.y)
    const minX = Math.max(0, Math.min(...xs) - 10)
    const maxX = Math.min(100, Math.max(...xs) + 10)
    const minY = Math.max(0, Math.min(...ys) - 12)
    const maxY = Math.min(100, Math.max(...ys) + 12)
    const graphWidth = Math.max(24, (maxX - minX) / 100 * width)
    const graphHeight = Math.max(24, (maxY - minY) / 100 * height)
    const isSmallViewport = width < 640
    const sidePadding = isSmallViewport ? 42 : 78
    const topPadding = isSmallViewport ? 72 : 84
    const bottomPadding = isSmallViewport ? 66 : 84
    const availableWidth = Math.max(160, width - sidePadding * 2)
    const availableHeight = Math.max(160, height - topPadding - bottomPadding)
    const nextZoom = Math.min(1.04, Math.max(0.55, Math.min(availableWidth / graphWidth, availableHeight / graphHeight)))
    const centerX = ((minX + maxX) / 2) / 100 * width
    const centerY = ((minY + maxY) / 2) / 100 * height
    const nextPan = {
      x: width / 2 - centerX * nextZoom,
      y: (topPadding + availableHeight / 2) - centerY * nextZoom,
    }
    updateZoom(nextZoom)
    updatePan(nextPan)
  }, [nodes, updatePan, updateZoom])

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
    const resizeObserver = new ResizeObserver(() => {
      if (gestureRef.current.mode === 'idle')
      { fitGraphToViewport() }
    })
    resizeObserver.observe(viewport)
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
      resizeObserver.disconnect()
      viewport.removeEventListener('wheel', isolateGraphZoom, { capture: true })
      viewport.removeEventListener('touchmove', isolateTouchMove, { capture: true })
    }
  }, [fitGraphToViewport, nodes, updatePan, updateZoom])

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => fitGraphToViewport(), 80)
    return () => globalThis.clearTimeout(timeout)
  }, [edges.length, fitGraphToViewport, nodes, rootNodeId])

  const resetViewport = () => {
    fitGraphToViewport()
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

  const openNode = (nodeId: string) => {
    setSelected(nodeId)
    if (canDrillInto(nodeId))
    { router.push(`${nodeNavigationBasePath}?node=${encodeURIComponent(nodeId)}`) }
  }

  const goParentNode = () => {
    if (!nodeNavigationBasePath)
    { return }
    const href = parentNodeId
      ? `${nodeNavigationBasePath}?node=${encodeURIComponent(parentNodeId)}`
      : nodeNavigationBasePath
    router.push(href)
  }

  if (!nodes.length || !selectedNode) {
    return (
      <div className="mx-auto flex h-full min-h-[520px] max-w-[1000px] items-center justify-center p-5 sm:p-8">
        <PageCard className="w-full max-w-xl px-6 py-12 text-center sm:px-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[var(--studio-accent)]/35 text-[var(--studio-accent-strong)]">
            <SparklesIcon className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">{emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--studio-muted)]">
            {emptyDescription}
          </p>
          <a href="/chat" className="mt-6 inline-flex rounded-xl bg-[var(--studio-deep)] px-5 py-2.5 text-xs font-semibold text-white">
            开始第一次学习对话
          </a>
        </PageCard>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="mx-auto max-w-[1520px] px-3 py-3 pb-[calc(96px+env(safe-area-inset-bottom))] sm:p-6 lg:pb-6">
      <div data-graph-toolbar className="mb-3 grid gap-3 md:mb-5 md:grid-cols-[1fr_auto] md:gap-4">
        <div>
          {(isDemo || staticNotice) && (
            <div className="mb-3 inline-flex rounded-full border border-[#dff67a]/60 bg-[#f7fbd7] px-3 py-1.5 text-[11px] font-semibold text-[#52651f]">
              {staticNotice || '本地图谱动效验收 Demo · 不写入真实学习数据'}
            </div>
          )}
          {colorByDepth
            ? (
              <div className="flex flex-wrap gap-2">
                {[
                  ['当前中心', 'bg-[#17342b] text-white'],
                  ['一级相关', 'bg-[#e4f0e7] text-[#315f4b]'],
                  ['二级延展', 'bg-[#edf0ff] text-[#66508e]'],
                  ['叶子节点不再下钻', 'bg-white text-[#65736c]'],
                ].map(([label, style]) => (
                  <span key={label} className={`rounded-full border border-[#183129]/[0.07] px-3 py-1.5 text-[11px] font-medium ${style}`}>{label}</span>
                ))}
              </div>
            )
            : (
              <div className="flex flex-wrap gap-2">
                {[
                  ['当前中心', 'bg-[#17342b] text-white'],
                  ['知识点', 'bg-[#e4f0e7] text-[#315f4b]'],
                  ['引用文档', 'bg-white text-[#65736c]'],
                  ['薄弱环节', 'bg-[#fff0df] text-[#9b5d31]'],
                  ['推荐路径', 'bg-[#eaf5bc] text-[#4e6422]'],
                ].map(([label, style]) => (
                  <span key={label} className={`rounded-full border border-[#183129]/[0.07] px-3 py-1.5 text-[11px] font-medium ${style}`}>{label}</span>
                ))}
              </div>
            )}
        </div>
        <div className="flex items-center gap-2">
          {nodeNavigationBasePath && (
            <button
              onClick={goParentNode}
              disabled={!parentNodeId}
              title={parentNodeId ? '返回上一级节点' : '已经在根节点'}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#183129]/10 bg-white px-3 text-[11px] font-semibold text-[#4c6b5c] transition hover:bg-[#f5f8f3] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              返回上一级
            </button>
          )}
          <div className="rounded-full bg-[#e9f3ed] px-3 py-1.5 text-[11px] font-medium text-[#4c6b5c]">
            {nodes.length} 节点 · {edges.length} 关系
            {omittedNodeCount > 0 && ` · 已收起 ${omittedNodeCount} 个二级节点`}
          </div>
          <button onClick={resetViewport} title="重置画布位置和缩放" className="grid h-9 w-9 place-items-center rounded-xl border border-[#183129]/10 bg-white">
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_330px]">
        <PageCard
          ref={viewportRef}
          className={`relative h-[min(52dvh,430px)] min-h-[330px] overflow-hidden overscroll-none bg-[#f8f8f3] sm:h-[min(68dvh,680px)] sm:min-h-[520px] xl:h-[calc(100dvh-250px)] xl:min-h-[560px] ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          style={{ touchAction: 'none', isolation: 'isolate' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onPointerLeave={() => setHoveredNodeId('')}
        >
          <div className="absolute left-3 top-3 z-20 max-w-[calc(100%-96px)] rounded-xl border border-[#183129]/10 bg-white/90 px-2.5 py-2 text-[10px] text-[#728078] shadow-sm backdrop-blur sm:left-5 sm:top-5 sm:max-w-none sm:px-3">
            <CursorArrowRaysIcon className="mr-1.5 inline h-3.5 w-3.5" />
            <span className="sm:hidden">单指拖动 · 双指缩放 · 点击节点</span>
            <span className="hidden sm:inline">
              拖动画布 · 滚轮缩放 · 点击节点查看证据 · 悬浮节点高亮相邻关系
              {omittedNodeCount > 0 && ` · 还有 ${omittedNodeCount} 个节点可下钻探索`}
            </span>
          </div>
          <div data-graph-control className="absolute bottom-3 right-3 z-20 flex overflow-hidden rounded-xl border border-[#183129]/10 bg-white shadow-sm sm:bottom-5 sm:right-5">
            <button onClick={() => zoomFromCenter(1.15)} className="grid h-11 w-11 place-items-center border-r border-[#183129]/10 sm:h-9 sm:w-9">
              <MagnifyingGlassPlusIcon className="h-4 w-4" />
            </button>
            <button onClick={() => zoomFromCenter(0.85)} className="grid h-11 w-11 place-items-center sm:h-9 sm:w-9">
              <MagnifyingGlassMinusIcon className="h-4 w-4" />
            </button>
          </div>

          <div
            data-graph-canvas=""
            className={`absolute inset-0 origin-center ${isDragging ? '' : 'transition-transform duration-200'}`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              backgroundImage: 'radial-gradient(rgba(57,80,69,.12) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          >
            <span
              data-graph-center-pulse=""
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#dff67a]/80 bg-[#dff67a]/20 shadow-[0_0_60px_rgba(223,246,122,.38)]"
              style={{
                left: `${layoutCenterNode?.x ?? 50}%`,
                top: `${layoutCenterNode?.y ?? 50}%`,
              }}
            />
            <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
              <defs>
                {[
                  ['graph-arrow-contains', '#9fb4aa'],
                  ['graph-arrow-depends-on', '#9aa5b5'],
                  ['graph-arrow-belongs-to', '#a8b3ad'],
                  ['graph-arrow-implements', '#b0a6c4'],
                  ['graph-arrow-related-to', '#aaaeb8'],
                  ['graph-arrow-recommended-next', '#9ab460'],
                  ['graph-arrow-active', '#236f54'],
                ].map(([id, color]) => (
                  <marker
                    key={id}
                    id={id}
                    markerWidth="7"
                    markerHeight="7"
                    refX="6.4"
                    refY="3.5"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d="M 0 0 L 7 3.5 L 0 7 z" fill={color} opacity={id === 'graph-arrow-active' ? 0.92 : 0.64} />
                  </marker>
                ))}
              </defs>
              {edges.map((edge, index) => {
                const source = nodes.find(node => node.id === edge.source)
                const target = nodes.find(node => node.id === edge.target)
                if (!source || !target)
                { return null }
                const highlighted = edge.source === focusedNodeId || edge.target === focusedNodeId
                const interacted = Boolean(interactionNodeId && (edge.source === interactionNodeId || edge.target === interactionNodeId))
                const midX = (source.x + target.x) / 2
                const midY = (source.y + target.y) / 2
                const angle = Math.atan2(target.y - source.y, target.x - source.x)
                const sourceOffset = nodeEndpointOffset(source.id)
                const targetOffset = nodeEndpointOffset(target.id) + 1.05
                const x1 = source.x + Math.cos(angle) * sourceOffset
                const y1 = source.y + Math.sin(angle) * sourceOffset
                const x2 = target.x - Math.cos(angle) * targetOffset
                const y2 = target.y - Math.sin(angle) * targetOffset
                const edgeOrder = Math.min(graphRadialOrder(source), graphRadialOrder(target))
                return (
                  <g
                    key={`${edge.source}-${edge.target}-${index}`}
                    data-graph-edge=""
                    data-graph-edge-source={edge.source}
                    data-graph-edge-target={edge.target}
                    data-graph-order={edgeOrder}
                    className="transition-opacity duration-200"
                  >
                    <line
                      data-graph-edge-line=""
                      data-graph-edge-source={edge.source}
                      data-graph-edge-target={edge.target}
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      stroke={interacted ? '#2f745b' : highlighted ? '#6f8f82' : '#aab5af'}
                      strokeWidth={interacted ? 1.85 : highlighted ? 1.35 : 0.95}
                      strokeDasharray={normalizeRelationType(edge.type) === 'recommended-next' ? '6 5' : undefined}
                      opacity={interactionNodeId ? (interacted ? 0.96 : 0.46) : (highlighted ? 0.68 : 0.4)}
                      markerEnd={`url(#${arrowMarkerId(edge, interacted)})`}
                    />
                    {interacted && (
                      <text
                        data-graph-relation=""
                        x={`${midX}%`}
                        y={`${midY}%`}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="pointer-events-none fill-[#2f5d4b] text-[10px] font-semibold drop-shadow-[0_1px_4px_rgba(255,255,255,.9)]"
                      >
                        {edgeLabel(edge)}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            {nodes.map((node) => {
              const active = node.id === selected
              const adjacent = focusedNodeIds.has(node.id)
              const leaf = leafNodeSet.has(node.id) && node.id !== rootNodeId
              const enterX = ((layoutCenterNode?.x ?? 50) - node.x) * 2.2
              const enterY = ((layoutCenterNode?.y ?? 50) - node.y) * 2.2
              const distance = getNodeDistance(node.id)
              const nodeOrder = graphRadialOrder(node)
              return (
                <button
                  key={node.id}
                  data-graph-node=""
                  data-graph-node-id={node.id}
                  data-graph-depth={distance}
                  data-graph-enter-x={enterX}
                  data-graph-enter-y={enterY}
                  data-graph-order={nodeOrder}
                  onClick={() => openNode(node.id)}
                  onPointerEnter={() => setHoveredNodeId(node.id)}
                  onPointerLeave={() => setHoveredNodeId('')}
                  title={leaf ? `${node.label}（叶子节点）` : node.label}
                  className={`absolute z-10 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold shadow-[0_10px_28px_rgba(34,55,46,.11)] transition-[box-shadow,border-color,filter] duration-200 ${
                    nodeTone(node)
                  } ${active ? 'ring-4 ring-[#dff67a]/60' : ''} ${adjacent && hoveredNodeId ? 'border-[#dff67a] shadow-[0_18px_40px_rgba(47,116,91,.24)] brightness-[1.03]' : ''}`}
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    translate: '-50% -50%',
                    fontSize: `${Math.min(13.2, 9.3 + node.weight * 0.32)}px`,
                    maxWidth: distance >= 2 ? '108px' : '138px',
                    lineHeight: 1.18,
                  }}
                >
                  <span className="block max-w-full overflow-hidden break-words [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">{node.label}</span>
                  {node.type === 'weakness' && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#dc744e]" />}
                </button>
              )
            })}
          </div>
        </PageCard>

        <div className="space-y-5">
          <PageCard data-graph-panel="" className="overflow-hidden">
            <div className="border-b border-[#183129]/[0.07] p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${nodeTone(selectedNode)}`}>
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#819087]">{selectedNode.type}</div>
                  <h2 className="mt-1 text-base font-semibold">{selectedNode.label}</h2>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-xs leading-6 text-[#65736c]">
                {selectedNode.description || '该节点来自当前账号的近期对话、知识库引用与学习证据。'}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5">
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

          <PageCard data-graph-panel="" className="p-4 sm:p-5">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.17em] text-[#819087] sm:mb-4">关系证据</div>
            <div className="space-y-2.5 sm:space-y-3">
              {related.slice(0, 4).map((edge, index) => {
                const otherId = edge.source === selected ? edge.target : edge.source
                const other = nodes.find(node => node.id === otherId)!
                return (
                  <button key={`${edge.source}-${edge.target}-${index}`} onClick={() => openNode(otherId)} className="flex w-full items-center gap-3 text-left">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#eef1ed] text-[#64736b]">
                      {other.type === 'document' ? <BookOpenIcon className="h-4 w-4" /> : <ChatBubbleLeftRightIcon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{other.label}</div>
                      <div className="mt-0.5 text-[10px] text-[#8a9690]">{edgeLabel(edge)}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </PageCard>

          <div data-graph-panel="" className="rounded-[22px] bg-[#17342b] p-4 text-white shadow-[0_18px_50px_rgba(23,52,43,.16)] sm:p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#dff67a]">AI 建议</div>
            <div className="mt-2 text-sm font-semibold">围绕当前知识点继续学习</div>
            <p className="mt-2 text-[11px] leading-5 text-white/55 sm:block">从当前选中的知识点出发，结合相邻问题、引用文档和推荐节点完成下一轮巩固。</p>
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
