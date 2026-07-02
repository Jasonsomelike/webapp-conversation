import type { FC, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import XClose from '@/app/components/base/icons/line/x-close'
import { isNetworkStudyApp } from '@/lib/native-app'

interface ImagePreviewProps {
  url: string
  onCancel: () => void
}
const ImagePreview: FC<ImagePreviewProps> = ({
  url,
  onCancel,
}) => {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const nativeApp = typeof window !== 'undefined' && isNetworkStudyApp()
  const pointersRef = useRef(new Map<number, { x: number, y: number }>())
  const gestureRef = useRef({
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 },
    lastPoint: { x: 0, y: 0 },
  })
  const scaleRef = useRef(scale)
  const historyKeyRef = useRef('')

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  const clampScale = (value: number) => Math.min(5, Math.max(1, value))
  const distance = (a: { x: number, y: number }, b: { x: number, y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)
  const center = (a: { x: number, y: number }, b: { x: number, y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  })

  const resetTransform = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    pointersRef.current.clear()
  }, [])

  const closePreview = useCallback(() => {
    if (
      !nativeApp
      && typeof window !== 'undefined'
      && historyKeyRef.current
      && window.history.state?.networkStudyImagePreview === historyKeyRef.current
    ) {
      window.history.back()
      return
    }
    onCancel()
  }, [nativeApp, onCancel])

  const closePreviewFromNativeBack = useCallback(() => {
    onCancel()
  }, [onCancel])

  const openExternal = () => {
    if (typeof window === 'undefined')
    { return }
    if (window.NetworkStudyApp?.openExternalUrl)
    { window.NetworkStudyApp.openExternalUrl(url) }
    else
    { window.open(url, '_blank', 'noopener,noreferrer') }
  }

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
    setReloadKey(key => key + 1)
    resetTransform()
  }, [url, resetTransform])

  useEffect(() => {
    if (scale <= 1.01)
    { setOffset({ x: 0, y: 0 }) }
  }, [scale])

  useEffect(() => {
    if (typeof window === 'undefined')
    { return }
    const key = `image-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`
    historyKeyRef.current = key
    window.NetworkStudyApp?.setImagePreviewOpen?.(true)
    if (!nativeApp) {
      try {
        const currentState = window.history.state
        window.history.pushState(
          {
            ...(currentState && typeof currentState === 'object' ? currentState : {}),
            networkStudyImagePreview: key,
          },
          '',
          window.location.href,
        )
      }
      catch {
        historyKeyRef.current = ''
      }
    }

    const handlePopState = () => {
      onCancel()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
      { closePreview() }
    }
    const handleNativeBack = (event: Event) => {
      const action = (event as CustomEvent<{ action?: string }>).detail?.action
      if (action === 'image-preview-close')
      { closePreviewFromNativeBack() }
    }
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('network-study-native-back', handleNativeBack)
    return () => {
      window.NetworkStudyApp?.setImagePreviewOpen?.(false)
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('network-study-native-back', handleNativeBack)
    }
  }, [closePreview, closePreviewFromNativeBack, nativeApp, onCancel])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget)
    { return }
    event.stopPropagation()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    catch {
    }
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = [...pointersRef.current.values()]
    if (points.length >= 2) {
      gestureRef.current.lastDistance = distance(points[0], points[1])
      gestureRef.current.lastCenter = center(points[0], points[1])
    }
    else {
      gestureRef.current.lastPoint = { x: event.clientX, y: event.clientY }
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId))
    { return }
    event.stopPropagation()
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = [...pointersRef.current.values()]
    if (points.length >= 2) {
      const nextDistance = distance(points[0], points[1])
      const nextCenter = center(points[0], points[1])
      const previousDistance = gestureRef.current.lastDistance || nextDistance
      const previousCenter = gestureRef.current.lastCenter
      const factor = previousDistance ? nextDistance / previousDistance : 1
      setScale(value => clampScale(value * factor))
      setOffset(value => ({
        x: value.x + nextCenter.x - previousCenter.x,
        y: value.y + nextCenter.y - previousCenter.y,
      }))
      gestureRef.current.lastDistance = nextDistance
      gestureRef.current.lastCenter = nextCenter
      return
    }

    if (points.length === 1 && scaleRef.current > 1) {
      const previous = gestureRef.current.lastPoint
      const current = points[0]
      setOffset(value => ({
        x: value.x + current.x - previous.x,
        y: value.y + current.y - previous.y,
      }))
      gestureRef.current.lastPoint = current
    }
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId))
    { return }
    event.stopPropagation()
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    catch {
    }
    pointersRef.current.delete(event.pointerId)
    const points = [...pointersRef.current.values()]
    if (points.length >= 2) {
      gestureRef.current.lastDistance = distance(points[0], points[1])
      gestureRef.current.lastCenter = center(points[0], points[1])
    }
    else if (points.length === 1) {
      gestureRef.current.lastPoint = points[0]
    }
  }

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey)
    { return }
    event.preventDefault()
    event.stopPropagation()
    setScale(value => clampScale(value + (event.deltaY < 0 ? 0.25 : -0.25)))
  }

  return createPortal(
    <div
      className={nativeApp
        ? 'fixed inset-0 z-[1000] flex items-center justify-center bg-black/35 p-4 pt-[calc(74px+env(safe-area-inset-top))] backdrop-blur-[1px]'
        : 'fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-[max(12px,env(safe-area-inset-top))] backdrop-blur-[2px]'}
      onClick={closePreview}
    >
      <div
        className={nativeApp
          ? 'relative flex h-[min(72dvh,760px)] w-[min(92vw,860px)] overflow-hidden rounded-[26px] bg-black/88 shadow-[0_18px_52px_rgba(0,0,0,.38)] ring-1 ring-white/10'
          : 'relative flex h-[min(82dvh,880px)] w-[min(94vw,1100px)] overflow-hidden rounded-[28px] bg-black/88 shadow-[0_24px_80px_rgba(0,0,0,.42)] ring-1 ring-white/10'}
        onClick={(event) => {
          if (event.target === event.currentTarget)
          { closePreview() }
          else
          { event.stopPropagation() }
        }}
      >
        {!loaded && !failed && (
          <div className='absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white shadow-xl'>
            图片加载中…
          </div>
        )}
        {failed
          ? (
            <div className='m-auto max-w-[min(86vw,420px)] rounded-3xl bg-white p-5 text-center shadow-2xl'>
              <div className='text-base font-semibold text-gray-900'>原图加载失败</div>
              <div className='mt-2 break-all text-xs leading-5 text-gray-500'>{url}</div>
              <div className='mt-5 flex gap-2'>
                <button
                  type='button'
                  className='flex-1 rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700'
                  onClick={() => {
                    setLoaded(false)
                    setFailed(false)
                    setReloadKey(key => key + 1)
                  }}
                >重试</button>
                <button type='button' className='flex-1 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white' onClick={openExternal}>外部打开</button>
              </div>
            </div>
          )
          : (
            <div
              className='flex h-full w-full touch-none select-none items-center justify-center overflow-hidden'
              onClick={(event) => {
                if (event.target === event.currentTarget)
                { closePreview() }
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onWheel={handleWheel}
              onDoubleClick={() => {
                if (scale > 1)
                { resetTransform() }
                else
                { setScale(2) }
              }}
            >
              <img
                key={reloadKey}
                alt='preview image'
                src={url}
                className={`max-h-full max-w-full rounded-xl object-contain shadow-2xl transition-opacity duration-200 ${scale > 1 ? 'cursor-grab' : 'cursor-zoom-in'} ${loaded ? 'opacity-100' : 'opacity-0'}`}
                style={{
                  transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                  transformOrigin: 'center',
                }}
                decoding='async'
                loading='eager'
                draggable={false}
                onClick={(event) => {
                  event.stopPropagation()
                  if (scaleRef.current > 1.01)
                  { resetTransform() }
                }}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
              />
            </div>
          )}
        <div
          className='absolute right-4 top-4 z-30 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-white/[0.12] backdrop-blur-[2px] transition hover:bg-white/20'
          onClick={(event) => {
            event.stopPropagation()
            closePreview()
          }}
        >
          <XClose className='h-4 w-4 text-white' />
        </div>
        <div className='absolute bottom-[calc(16px+env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/12 px-2 py-2 text-xs font-semibold text-white backdrop-blur'>
          <button
            type='button'
            className='rounded-full px-3 py-1.5 transition hover:bg-white/15'
            onClick={(event) => {
              event.stopPropagation()
              resetTransform()
            }}
          >
            复位
          </button>
          <button
            type='button'
            className='rounded-full px-3 py-1.5 transition hover:bg-white/15'
            onClick={(event) => {
              event.stopPropagation()
              openExternal()
            }}
          >
            外部打开
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ImagePreview
