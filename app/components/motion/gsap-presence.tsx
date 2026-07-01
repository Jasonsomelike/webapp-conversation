'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

type PresenceVariant = 'dialog' | 'drawer-left' | 'dropdown' | 'sheet-up'

const variants: Record<PresenceVariant, { from: gsap.TweenVars, to: gsap.TweenVars }> = {
  'dialog': {
    from: { autoAlpha: 0, y: 18, scale: 0.94, filter: 'blur(10px)' },
    to: { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.34, ease: 'back.out(1.45)' },
  },
  'drawer-left': {
    from: { autoAlpha: 0, x: -34, scale: 0.985 },
    to: { autoAlpha: 1, x: 0, scale: 1, duration: 0.32, ease: 'power3.out' },
  },
  'dropdown': {
    from: { autoAlpha: 0, y: -8, scale: 0.96, transformOrigin: '90% 0%' },
    to: { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: 'back.out(1.35)' },
  },
  'sheet-up': {
    from: { autoAlpha: 0, y: 22, scale: 0.985 },
    to: { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out' },
  },
}

export default function GsapPresence({
  children,
  variant = 'dialog',
  className = '',
  ...props
}: {
  children: ReactNode
  variant?: PresenceVariant
  className?: string
} & HTMLAttributes<HTMLDivElement>) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const root = rootRef.current
    if (!root)
    { return }
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(root, { autoAlpha: 1, clearProps: 'filter,transform,opacity,visibility' })
      return
    }
    const preset = variants[variant]
    gsap.fromTo(
      root,
      preset.from,
      {
        ...preset.to,
        overwrite: 'auto',
        clearProps: 'filter,transform,opacity,visibility',
      },
    )
  }, { dependencies: [variant], scope: rootRef, revertOnUpdate: true })

  return (
    <div ref={rootRef} className={className} {...props}>
      {children}
    </div>
  )
}
