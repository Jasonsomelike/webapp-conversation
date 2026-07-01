'use client'

import type { ReactNode } from 'react'
import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { isNetworkStudyApp } from '@/lib/native-app'

gsap.registerPlugin(useGSAP)

export default function GsapRouteTransition({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const root = rootRef.current
    if (!root)
    { return }

    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      gsap.set(root, { autoAlpha: 1, clearProps: 'filter,transform,opacity,visibility' })
      return
    }

    const native = isNetworkStudyApp()
    const cards = gsap.utils.toArray<HTMLElement>('[data-gsap-card]', root)
    const animatedCards = cards.slice(0, 10)
    const overflowCards = cards.slice(10)
    const timeline = gsap.timeline({
      defaults: {
        ease: 'power3.out',
        overwrite: 'auto',
      },
    })

    timeline.fromTo(
      root,
      {
        autoAlpha: 0,
        y: native ? 8 : 16,
        scale: native ? 0.996 : 0.99,
        filter: native ? 'blur(0px)' : 'blur(8px)',
      },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: native ? 0.28 : 0.42,
        clearProps: 'filter,transform,opacity,visibility',
      },
    )

    if (overflowCards.length)
    { gsap.set(overflowCards, { autoAlpha: 1, clearProps: 'filter,transform,opacity,visibility' }) }

    if (animatedCards.length) {
      timeline.fromTo(
        animatedCards,
        {
          autoAlpha: 0,
          y: native ? 12 : 24,
          scale: 0.985,
        },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: native ? 0.32 : 0.52,
          stagger: {
            amount: Math.min(native ? 0.18 : 0.32, animatedCards.length * 0.045),
            from: 'start',
          },
          clearProps: 'filter,transform,opacity,visibility',
        },
        native ? '-=0.16' : '-=0.25',
      )
    }
  }, { scope: rootRef })

  return (
    <div ref={rootRef} className="h-full min-h-0 will-change-transform">
      {children}
    </div>
  )
}
