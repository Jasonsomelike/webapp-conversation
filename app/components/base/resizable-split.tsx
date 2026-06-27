'use client'

import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

const toFiniteNumber = (value: string | null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

interface UseResizableSplitOptions {
  storageKey: string
  cssVariable: `--${string}`
  defaultSize: number
  minSize: number
  maxSize?: number
  minTrailingSize?: number
  label: string
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max))

export function useResizableSplit({
  storageKey,
  cssVariable,
  defaultSize,
  minSize,
  maxSize = Number.POSITIVE_INFINITY,
  minTrailingSize = 520,
  label,
}: UseResizableSplitOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widthRef = useRef(defaultSize)
  const dragRef = useRef({
    startX: 0,
    startWidth: defaultSize,
    raf: 0,
    pendingWidth: defaultSize,
    previousCursor: '',
    previousUserSelect: '',
  })
  const [width, setWidth] = useState(defaultSize)
  const [dragging, setDragging] = useState(false)

  const getMaxWidth = useCallback(() => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width || 0
    const trailingLimited = containerWidth > 0
      ? containerWidth - minTrailingSize
      : maxSize
    return Math.min(maxSize, trailingLimited)
  }, [maxSize, minTrailingSize])

  const clampWidth = useCallback(
    (value: number) => clamp(value, minSize, getMaxWidth()),
    [getMaxWidth, minSize],
  )

  const applyWidth = useCallback((nextWidth: number, commit = false) => {
    const next = clampWidth(nextWidth)
    widthRef.current = next
    containerRef.current?.style.setProperty(cssVariable, `${next}px`)
    if (commit) {
      setWidth(next)
      try {
        window.localStorage.setItem(storageKey, String(Math.round(next)))
      }
      catch {
        // localStorage can be unavailable in restricted browsers; resizing should still work.
      }
    }
    return next
  }, [clampWidth, cssVariable, storageKey])

  useEffect(() => {
    if (typeof window === 'undefined')
    { return }
    const stored = toFiniteNumber(window.localStorage.getItem(storageKey))
    applyWidth(stored ?? defaultSize, true)
  }, [applyWidth, defaultSize, storageKey])

  useEffect(() => {
    if (typeof window === 'undefined')
    { return }
    const handleResize = () => {
      applyWidth(widthRef.current, true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [applyWidth])

  const scheduleWidth = useCallback((nextWidth: number) => {
    const next = clampWidth(nextWidth)
    dragRef.current.pendingWidth = next
    if (dragRef.current.raf)
    { return }
    dragRef.current.raf = window.requestAnimationFrame(() => {
      dragRef.current.raf = 0
      applyWidth(dragRef.current.pendingWidth)
    })
  }, [applyWidth, clampWidth])

  useEffect(() => {
    if (!dragging || typeof window === 'undefined')
    { return }

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      scheduleWidth(dragRef.current.startWidth + event.clientX - dragRef.current.startX)
    }
    const stopDragging = () => {
      setDragging(false)
      if (dragRef.current.raf) {
        window.cancelAnimationFrame(dragRef.current.raf)
        dragRef.current.raf = 0
      }
      applyWidth(dragRef.current.pendingWidth, true)
      document.body.style.cursor = dragRef.current.previousCursor
      document.body.style.userSelect = dragRef.current.previousUserSelect
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging, { once: true })
    window.addEventListener('pointercancel', stopDragging, { once: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [applyWidth, dragging, scheduleWidth])

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0)
    { return }
    event.preventDefault()
    dragRef.current.startX = event.clientX
    dragRef.current.startWidth = widthRef.current
    dragRef.current.previousCursor = document.body.style.cursor
    dragRef.current.previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    setDragging(true)
  }, [])

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 48 : 16
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      applyWidth(widthRef.current - step, true)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      applyWidth(widthRef.current + step, true)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      applyWidth(minSize, true)
    }
    if (event.key === 'End') {
      event.preventDefault()
      applyWidth(getMaxWidth(), true)
    }
  }, [applyWidth, getMaxWidth, minSize])

  return {
    containerRef,
    dragging,
    containerStyle: { [cssVariable]: `${width}px` } as CSSProperties,
    separatorProps: {
      'role': 'separator',
      'tabIndex': 0,
      'aria-label': label,
      'aria-orientation': 'vertical' as const,
      'aria-valuenow': Math.round(width),
      'aria-valuemin': minSize,
      'onPointerDown': onPointerDown,
      'onKeyDown': onKeyDown,
      'style': { touchAction: 'none' } as CSSProperties,
    },
  }
}

export function ResizableSplitHandle({
  separatorProps,
  className = '',
}: {
  separatorProps: ReturnType<typeof useResizableSplit>['separatorProps']
  className?: string
}) {
  return (
    <div
      {...separatorProps}
      className={`group hidden h-full w-2 shrink-0 cursor-col-resize items-center justify-center outline-none transition-colors focus-visible:bg-[var(--studio-accent)]/35 lg:flex ${className}`}
    >
      <span className="h-16 w-1 rounded-full bg-black/10 transition group-hover:bg-[var(--studio-accent-strong)]/45 group-focus-visible:bg-[var(--studio-accent-strong)]/55" />
    </div>
  )
}
