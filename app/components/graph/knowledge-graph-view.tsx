'use client'

import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  ArrowsPointingOutIcon,
  ArrowUturnLeftIcon,
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
  emptyTitle = '知识图谱还是空的',
  emptyDescription = '完成一次计算机网络学习对话后，系统会根据你的问题和知识库引用生成专属节点与关系。',
  compactOuterPadding = false,
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
  emptyTitle?: string
  emptyDescription?: string
  compactOuterPadding?: boolean
}) {
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
  const lastNodeTapRef = useRef<{ nodeId: string, at: number } | null>(null)
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
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLElement>(null)
  const graphLayerRef = useRef<HTMLDivElement>(null)
  const cursorGlowRef = useRef<HTMLDivElement>(null)
  const chatResponding = useChatRuntime(state => state.isResponding)
  const selectedNode = nodes.find(node => node.id === selected) || nodes[0]
  const leafNodeSet = useMemo(() => new Set(leafNodeIds), [leafNodeIds])
  const rootNodeId = useMemo(
    () => nodes.find(node => node.id === preferredRootNodeId)?.id || nodes.find(node => node.type === 'user')?.id || nodes[0]?.id || '',
    [nodes, preferredRootNodeId],
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

    let fallbackDepth = depths.size ? Math.max(...depths.values()) + 1 : 0
    nodes.forEach((node) => {
      if (depths.has(node.id))
      { return }
      depths.set(node.id, fallbackDepth)
      fallbackDepth += 1
    })
    return depths
  }, [edges, nodes, rootNodeId])
  const graphSignature = useMemo(
    () => `${rootNodeId}|${nodes.map(node => `${node.id}:${node.x}:${node.y}`).join(',')}|${edges.map(edge => `${edge.source}>${edge.target}:${edge.type}`).join(',')}`,
    [edges, nodes, rootNodeId],
  )

  const related = useMemo(() => edges.filter(edge => edge.source === selected || edge.target === selected), [edges, selected])
  const relatedNodeIds = useMemo(() => new Set(related.flatMap(edge => [edge.source, edge.target])), [related])
  const rootNode = nodes.find(node => node.id === rootNodeId) || nodes[0]
  const denseGraph = nodes.length > 42
  const extraDenseGraph = nodes.length > 64
  const depthTone = (nodeId: string) => {
    const depth = graphDepth.get(nodeId) ?? 2
    if (depth <= 0)
    { return 'bg-[#17342b] text-white border-[#17342b]' }
    if (depth === 1)
    { return 'bg-[#e4f0e7] text-[#315f4b] border-[#82a18f]/35' }
    return 'bg-[#edf0ff] text-[#66508e] border-[#a993cf]/35'
  }
  const nodeTone = (node: KnowledgeGraphNode) => colorByDepth ? depthTone(node.id) : tones[node.type]
  const canDrillInto = (nodeId: string) => Boolean(nodeNavigationBasePath && nodeId !== rootNodeId && !leafNodeSet.has(nodeId))
  const buildNodeHref = (nodeId?: string) => {
    if (!nodeNavigationBasePath)
    { return '' }
    if (!nodeId)
    { return nodeNavigationBasePath }
    const separator = nodeNavigationBasePath.includes('?') ? '&' : '?'
    return `${nodeNavigationBasePath}${separator}node=${encodeURIComponent(nodeId)}`
  }

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
    setSelected(initialNodes.find(node => node.id === preferredRootNodeId)?.id || initialNodes.find(node => node.type === 'weakness')?.id || initialNodes[0]?.id || '')
    const dense = initialNodes.length > 42
    const extraDense = initialNodes.length > 64
    const mobile = globalThis.matchMedia?.('(max-width: 640px)').matches
    const nextZoom = mobile
      ? extraDense ? 0.5 : dense ? 0.58 : initialNodes.length > 24 ? 0.74 : 0.9
      : extraDense ? 0.74 : dense ? 0.82 : 1
    updateZoom(nextZoom)
    const viewport = viewportRef.current
    updatePan(viewport && nextZoom < 1
      ? {
        x: viewport.clientWidth * (1 - nextZoom) / 2,
        y: viewport.clientHeight * (1 - nextZoom) / 2,
      }
      : { x: 0, y: 0 })
  }, [initialEdges, initialNodes, preferredRootNodeId])

  const openNode = (nodeId: string, event?: MouseEvent<HTMLElement>) => {
    setSelected(nodeId)
    if (!canDrillInto(nodeId))
    { return }

    const coarsePointer = globalThis.matchMedia?.('(pointer: coarse)').matches
    if (coarsePointer) {
      const now = Date.now()
      const lastTap = lastNodeTapRef.current
      lastNodeTapRef.current = { nodeId, at: now }
      if (!lastTap || lastTap.nodeId !== nodeId || now - lastTap.at > 420)
      { return }
    }
    else if (event?.detail === 0)
    { return }

    router.push(buildNodeHref(nodeId))
  }

  const goParentNode = () => {
    if (!nodeNavigationBasePath)
    { return }
    router.push(parentNodeId ? buildNodeHref(parentNodeId) : buildNodeHref())
  }

  useGSAP(() => {
    const root = rootRef.current
    if (!root)
    { return }
    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion)
    { return }

    const nodeElements = gsap.utils.toArray<HTMLElement>('[data-graph-node]', root)
    const edgeElements = gsap.utils.toArray<SVGLineElement>('[data-graph-edge]', root)
    const sideCards = gsap.utils.toArray<HTMLElement>('[data-graph-panel]', root)
    const rippleElements = gsap.utils.toArray<HTMLElement>('[data-graph-ripple]', root)
    const rootNodeElement = nodeElements.find(node => node.dataset.graphNodeId === rootNodeId) || nodeElements[0]
    const rootRect = rootNodeElement?.getBoundingClientRect()
    const rootCenter = rootRect
      ? { x: rootRect.left + rootRect.width / 2, y: rootRect.top + rootRect.height / 2 }
      : undefined
    const nodeVectors = new Map<HTMLElement, { x: number, y: number }>()
    nodeElements.forEach((node) => {
      if (!rootCenter) {
        nodeVectors.set(node, { x: 0, y: 0 })
        return
      }
      const rect = node.getBoundingClientRect()
      nodeVectors.set(node, {
        x: rootCenter.x - (rect.left + rect.width / 2),
        y: rootCenter.y - (rect.top + rect.height / 2),
      })
    })

    edgeElements.forEach((line) => {
      const dashed = line.dataset.graphDashed === 'true'
      const length = typeof line.getTotalLength === 'function' ? line.getTotalLength() : 120
      if (dashed) {
        gsap.set(line, { autoAlpha: 0 })
        return
      }
      gsap.set(line, {
        strokeDasharray: length,
        strokeDashoffset: length,
        autoAlpha: 0,
      })
    })
    gsap.set(nodeElements, { autoAlpha: 0, scale: 0.52 })
    gsap.set(rippleElements, {
      autoAlpha: 0,
      scale: 0.35,
      transformOrigin: '50% 50%',
    })

    const timeline = gsap.timeline({
      defaults: {
        ease: 'power3.out',
        overwrite: 'auto',
      },
    })

    timeline
      .fromTo(
        '[data-graph-toolbar]',
        { autoAlpha: 0, y: -12, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, clearProps: 'transform,opacity,visibility' },
      )

    if (rootNodeElement) {
      timeline.fromTo(
        rootNodeElement,
        {
          autoAlpha: 0,
          scale: 0.46,
        },
        {
          autoAlpha: 1,
          scale: 1,
          duration: 0.58,
          ease: 'back.out(1.85)',
          clearProps: 'opacity,visibility,transform',
        },
        '-=0.08',
      )
    }

    if (rippleElements.length) {
      timeline.fromTo(
        rippleElements,
        { autoAlpha: 0.55, scale: 0.35 },
        {
          autoAlpha: 0,
          scale: 3.1,
          duration: 1.05,
          ease: 'power2.out',
          stagger: 0.16,
        },
        '-=0.36',
      )
      gsap.fromTo(
        rippleElements,
        { autoAlpha: 0.34, scale: 0.45 },
        {
          autoAlpha: 0,
          scale: 3.4,
          duration: 2.4,
          repeat: -1,
          stagger: 0.55,
          ease: 'power2.out',
          delay: 0.9,
        },
      )
    }

    const maxDepth = Math.max(0, ...nodeElements.map(node => Number(node.dataset.graphDepth || 0)))
    for (let depth = 1; depth <= maxDepth; depth += 1) {
      const depthEdges = edgeElements.filter(edge => Number(edge.dataset.graphDepth || 0) === depth)
      const solidEdges = depthEdges.filter(edge => edge.dataset.graphDashed !== 'true')
      const dashedEdges = depthEdges.filter(edge => edge.dataset.graphDashed === 'true')
      const depthNodes = nodeElements.filter(node => Number(node.dataset.graphDepth || 0) === depth)

      if (solidEdges.length) {
        timeline.to(
          solidEdges,
          {
            strokeDashoffset: 0,
            autoAlpha: 1,
            duration: 0.54,
            stagger: 0.035,
            clearProps: 'strokeDasharray,strokeDashoffset,opacity,visibility',
          },
          depth === 1 ? '-=0.18' : '-=0.1',
        )
      }
      if (dashedEdges.length) {
        timeline.to(
          dashedEdges,
          {
            autoAlpha: 1,
            duration: 0.28,
            stagger: 0.035,
            clearProps: 'opacity,visibility',
          },
          solidEdges.length ? '-=0.36' : '-=0.08',
        )
      }
      if (depthNodes.length) {
        timeline.fromTo(
          depthNodes,
          {
            autoAlpha: 0,
            scale: 0.5,
            x: (_index, target: HTMLElement) => nodeVectors.get(target)?.x ?? 0,
            y: (_index, target: HTMLElement) => nodeVectors.get(target)?.y ?? 0,
          },
          {
            autoAlpha: 1,
            scale: 1,
            x: 0,
            y: 0,
            duration: 0.6,
            ease: 'back.out(1.6)',
            stagger: 0.045,
            clearProps: 'opacity,visibility,transform',
          },
          depthEdges.length ? '-=0.38' : '-=0.04',
        )
      }
    }

    timeline
      .fromTo(
        sideCards,
        { autoAlpha: 0, x: 24, scale: 0.985 },
        {
          autoAlpha: 1,
          x: 0,
          scale: 1,
          duration: 0.48,
          stagger: 0.08,
          clearProps: 'opacity,visibility,transform',
        },
        '-=0.28',
      )
  }, { dependencies: [graphSignature], scope: rootRef, revertOnUpdate: true })

  useGSAP(() => {
    const root = rootRef.current
    if (!root)
    { return }
    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion)
    { return }

    const activeNode = gsap.utils
      .toArray<HTMLElement>('[data-graph-node]', root)
      .find(node => node.dataset.graphNodeId === selected)
    if (!activeNode)
    { return }

    gsap.fromTo(
      activeNode,
      {
        boxShadow: '0 0 0 0 color-mix(in srgb, var(--studio-accent) 80%, transparent)',
        scale: 0.96,
      },
      {
        boxShadow: '0 0 0 12px color-mix(in srgb, var(--studio-accent) 0%, transparent)',
        scale: 1,
        duration: 0.62,
        ease: 'power3.out',
        clearProps: 'boxShadow,transform',
      },
    )

    gsap.fromTo(
      root.querySelectorAll('[data-graph-related-edge="true"]'),
      { autoAlpha: 0.35 },
      { autoAlpha: 1, duration: 0.32, yoyo: true, repeat: 1, ease: 'power2.inOut' },
    )

    gsap.fromTo(
      root.querySelectorAll('[data-graph-related-node="true"]'),
      {
        scale: 0.98,
        boxShadow: '0 0 0 0 rgba(84,122,103,0)',
      },
      {
        scale: 1.035,
        boxShadow: '0 12px 34px rgba(84,122,103,.2)',
        duration: 0.34,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
        clearProps: 'transform,boxShadow',
      },
    )
  }, { dependencies: [selected], scope: rootRef })

  useGSAP(() => {
    const viewport = viewportRef.current
    const glow = cursorGlowRef.current
    if (!viewport || !glow || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    { return }
    const xTo = gsap.quickTo(glow, 'x', { duration: 0.36, ease: 'power3.out' })
    const yTo = gsap.quickTo(glow, 'y', { duration: 0.36, ease: 'power3.out' })
    const show = () => gsap.to(glow, { autoAlpha: 1, scale: 1, duration: 0.24, ease: 'power2.out', overwrite: 'auto' })
    const hide = () => gsap.to(glow, { autoAlpha: 0, scale: 0.86, duration: 0.32, ease: 'power2.out', overwrite: 'auto' })
    const move = (event: PointerEvent) => {
      const rect = viewport.getBoundingClientRect()
      xTo(event.clientX - rect.left - 0.75)
      yTo(event.clientY - rect.top - 0.75)
    }
    gsap.set(glow, { autoAlpha: 0, scale: 0.86 })
    viewport.addEventListener('pointerenter', show)
    viewport.addEventListener('pointerleave', hide)
    viewport.addEventListener('pointermove', move)
    return () => {
      viewport.removeEventListener('pointerenter', show)
      viewport.removeEventListener('pointerleave', hide)
      viewport.removeEventListener('pointermove', move)
    }
  }, { scope: rootRef })

  useEffect(() => {
    if (isDemo || staticNotice)
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
  }, [chatResponding, isDemo, staticNotice])

  const updatePan = (nextPan: { x: number, y: number }) => {
    panRef.current = nextPan
    setPan(nextPan)
  }

  const updateZoom = (nextZoom: number) => {
    const clamped = Math.min(2.5, Math.max(0.38, nextZoom))
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
    <div ref={rootRef} className={compactOuterPadding ? 'mx-auto max-w-[1500px] pb-4 sm:pb-6' : 'mx-auto max-w-[1500px] p-4 sm:p-6'}>
      <div data-graph-toolbar className="mb-5 grid gap-4 md:grid-cols-[1fr_auto]">
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
                  ['全部关系', 'bg-[#17342b] text-white'],
                  ['知识点', 'bg-[#e4f0e7] text-[#315f4b]'],
                  ['引用文档', 'bg-white text-[#65736c]'],
                  ['薄弱环节', 'bg-[#fff0df] text-[#9b5d31]'],
                  ['推荐路径', 'bg-[#eaf5bc] text-[#4e6422]'],
                ].map(([label, style]) => (
                  <button key={label} className={`rounded-full border border-[#183129]/[0.07] px-3 py-1.5 text-[11px] font-medium ${style}`}>{label}</button>
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
          </div>
          <button onClick={resetViewport} title="重置画布位置和缩放" className="grid h-9 w-9 place-items-center rounded-xl border border-[#183129]/10 bg-white">
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <PageCard
          ref={viewportRef}
          interactive={false}
          className={`relative h-[62dvh] min-h-[460px] overflow-hidden overscroll-none bg-[#f8f8f3] sm:h-auto sm:min-h-[680px] ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          style={{ touchAction: 'none', isolation: 'isolate' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div className="absolute left-5 top-5 z-20 rounded-xl border border-[#183129]/10 bg-white/90 px-3 py-2 text-[10px] text-[#728078] shadow-sm backdrop-blur">
            <CursorArrowRaysIcon className="mr-1.5 inline h-3.5 w-3.5" />
            <span className="sm:hidden">单指拖动 · 双指缩放 · 单击查看 · 双击下钻</span>
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
            ref={cursorGlowRef}
            className="pointer-events-none absolute left-0 top-0 z-[1] h-[1.5px] w-[1.5px] rounded-full bg-[radial-gradient(circle,rgba(223,246,122,.34),rgba(125,211,252,.16)_42%,transparent_72%)] blur-[0.25px]"
            aria-hidden="true"
          />

          <div
            ref={graphLayerRef}
            className={`absolute inset-0 origin-center ${isDragging ? '' : 'transition-transform duration-200'}`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              backgroundImage: 'radial-gradient(rgba(57,80,69,.12) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          >
            <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
              <defs>
                <marker id="graph-arrow" markerWidth="6" markerHeight="6" refX="5.2" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#aab5af" opacity="0.62" />
                </marker>
                <marker id="graph-arrow-active" markerWidth="6" markerHeight="6" refX="5.2" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#547a67" opacity="0.9" />
                </marker>
              </defs>
              {edges.map((edge, index) => {
                const source = nodes.find(node => node.id === edge.source)!
                const target = nodes.find(node => node.id === edge.target)!
                const highlighted = edge.source === selected || edge.target === selected
                const edgeDepth = Math.max(graphDepth.get(edge.source) ?? 0, graphDepth.get(edge.target) ?? 0)
                return (
                  <line
                    key={`${edge.source}-${edge.target}-${index}`}
                    data-graph-edge=""
                    data-graph-related-edge={highlighted ? 'true' : 'false'}
                    data-graph-dashed={edge.type === 'recommended_next' ? 'true' : 'false'}
                    data-graph-depth={edgeDepth}
                    x1={`${source.x}%`}
                    y1={`${source.y}%`}
                    x2={`${target.x}%`}
                    y2={`${target.y}%`}
                    stroke={highlighted ? '#547a67' : '#aab5af'}
                    strokeWidth={highlighted ? 2.2 : 1.2}
                    strokeDasharray={edge.type === 'recommended_next' ? '6 5' : undefined}
                    markerEnd={`url(#${highlighted ? 'graph-arrow-active' : 'graph-arrow'})`}
                    opacity={highlighted ? 0.85 : 0.45}
                  />
                )
              })}
            </svg>

            {rootNode && (
              <div
                data-graph-ripple-root=""
                className="pointer-events-none absolute z-[4] h-28 w-28 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${rootNode.x}%`, top: `${rootNode.y}%` }}
                aria-hidden="true"
              >
                {[0, 1, 2].map(index => (
                  <span
                    key={index}
                    data-graph-ripple=""
                    className="absolute inset-0 rounded-full border border-[#dff67a]/70 bg-[radial-gradient(circle,rgba(223,246,122,.22),rgba(84,122,103,.08)_46%,transparent_70%)]"
                  />
                ))}
              </div>
            )}

            {nodes.map((node) => {
              const active = node.id === selected
              const relatedActive = !active && relatedNodeIds.has(node.id)
              const leafNode = leafNodeSet.has(node.id)
              const drillable = canDrillInto(node.id)
              const denseNodeClass = extraDenseGraph
                ? 'max-w-[84px] px-2 py-1.5 sm:max-w-[122px] sm:px-2.5 sm:py-2'
                : denseGraph
                  ? 'max-w-[96px] px-2 py-1.5 sm:max-w-[136px] sm:px-3 sm:py-2'
                  : 'max-w-[108px] px-2.5 py-2 sm:max-w-[156px] sm:px-3.5 sm:py-2.5'
              const nodeFontSize = extraDenseGraph
                ? Math.min(11.6, 8.8 + node.weight * 0.24)
                : denseGraph
                  ? Math.min(12, 9.1 + node.weight * 0.26)
                  : Math.min(12.5, 9.5 + node.weight * 0.28)
              return (
                <button
                  key={node.id}
                  data-graph-node=""
                  data-graph-node-id={node.id}
                  data-graph-depth={graphDepth.get(node.id) ?? 0}
                  data-graph-related-node={relatedActive ? 'true' : 'false'}
                  onClick={event => openNode(node.id, event)}
                  onMouseEnter={() => setSelected(node.id)}
                  title={leafNode && node.id !== rootNodeId ? '叶子节点：点击仅查看详情' : drillable ? '电脑点击下钻；手机单击查看、双击下钻' : node.label}
                  className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-normal rounded-2xl border text-center text-[10px] font-semibold leading-tight shadow-[0_10px_28px_rgba(34,55,46,.11)] transition-[filter,box-shadow,border-color] duration-200 hover:brightness-105 ${denseNodeClass} ${
                    nodeTone(node)
                  } ${active ? 'ring-4 ring-[#dff67a]/60' : ''} ${relatedActive ? 'ring-2 ring-[#8eb9a5]/45' : ''} ${leafNode && node.id !== rootNodeId ? 'cursor-default opacity-90' : ''}`}
                  style={{ left: `${node.x}%`, top: `${node.y}%`, fontSize: `${nodeFontSize}px` }}
                >
                  {node.label}
                  {leafNode && node.id !== rootNodeId && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-35" />}
                </button>
              )
            })}
          </div>
        </PageCard>

        <div className="space-y-5">
          <PageCard data-graph-panel="" className="overflow-hidden">
            <div className="border-b border-[#183129]/[0.07] p-5">
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

          <PageCard data-graph-panel="" className="p-5">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.17em] text-[#819087]">关系证据</div>
            <div className="space-y-3">
              {related.slice(0, 4).map((edge, index) => {
                const otherId = edge.source === selected ? edge.target : edge.source
                const other = nodes.find(node => node.id === otherId)!
                return (
                  <button key={index} onClick={event => openNode(otherId, event)} className="flex w-full items-center gap-3 text-left">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#eef1ed] text-[#64736b]">
                      {other.type === 'document' ? <BookOpenIcon className="h-4 w-4" /> : <ChatBubbleLeftRightIcon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{other.label}</div>
                      <div className="mt-0.5 text-[10px] text-[#8a9690]">{edge.description || edge.type.replaceAll('_', ' ')}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </PageCard>

          <div data-graph-panel="" className="rounded-[22px] bg-[#17342b] p-5 text-white shadow-[0_18px_50px_rgba(23,52,43,.16)]">
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
