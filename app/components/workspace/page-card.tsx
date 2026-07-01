'use client'

import { forwardRef, type HTMLAttributes, type PointerEvent, type ReactNode, useImperativeHandle, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

interface PageCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  interactive?: boolean
}

const PageCard = forwardRef<HTMLElement, PageCardProps>(({
  children,
  className = '',
  interactive = true,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  ...props
}, ref) => {
  const localRef = useRef<HTMLElement>(null)
  const shineXToRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null)
  const shineYToRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null)
  useImperativeHandle(ref, () => localRef.current as HTMLElement)

  const { contextSafe } = useGSAP(() => {
    const card = localRef.current
    if (!card || !interactive || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    { return }

    const shine = card.querySelector<HTMLElement>('[data-card-shine]')
    if (shine) {
      gsap.set(shine, { autoAlpha: 0, scale: 0.88 })
      shineXToRef.current = gsap.quickTo(shine, 'x', { duration: 0.18, ease: 'power3.out' })
      shineYToRef.current = gsap.quickTo(shine, 'y', { duration: 0.18, ease: 'power3.out' })
    }
    return () => {
      shineXToRef.current = null
      shineYToRef.current = null
    }
  }, { scope: localRef })

  const handlePointerEnter = contextSafe((event: PointerEvent<HTMLElement>) => {
    onPointerEnter?.(event)
    if (!interactive || event.defaultPrevented || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    { return }
    const card = localRef.current
    const shine = card?.querySelector<HTMLElement>('[data-card-shine]')
    if (!card)
    { return }
    if (shine) {
      const rect = card.getBoundingClientRect()
      shineXToRef.current?.(event.clientX - rect.left - 3)
      shineYToRef.current?.(event.clientY - rect.top - 3)
      gsap.to(shine, {
        autoAlpha: 1,
        scale: 1,
        duration: 0.18,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }
  })

  const handlePointerMove = contextSafe((event: PointerEvent<HTMLElement>) => {
    onPointerMove?.(event)
    if (!interactive || event.defaultPrevented || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    { return }
    const card = localRef.current
    const shine = card?.querySelector<HTMLElement>('[data-card-shine]')
    if (!card)
    { return }
    const rect = card.getBoundingClientRect()
    if (shine) {
      shineXToRef.current?.(event.clientX - rect.left - 3)
      shineYToRef.current?.(event.clientY - rect.top - 3)
    }
  })

  const handlePointerLeave = contextSafe((event: PointerEvent<HTMLElement>) => {
    onPointerLeave?.(event)
    if (!interactive || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    { return }
    const card = localRef.current
    const shine = card?.querySelector<HTMLElement>('[data-card-shine]')
    if (!card)
    { return }
    if (shine) {
      gsap.to(shine, {
        autoAlpha: 0,
        scale: 0.88,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }
  })

  return (
    <section
      ref={localRef}
      data-gsap-card=""
      data-gsap-card-interactive={interactive ? 'true' : 'false'}
      className={`relative rounded-[22px] border border-black/[0.075] bg-[var(--studio-surface)] shadow-[0_16px_50px_rgba(29,50,42,0.055)] ${className}`}
      {...props}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {interactive && (
        <span
          data-card-shine=""
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-0 h-1.5 w-1.5 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.55),rgba(223,246,122,.22)_42%,transparent_72%)] opacity-0 blur-[0.5px]"
        />
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,.16),transparent_42%,rgba(255,255,255,.08))]"
      />
      {children}
    </section>
  )
})
PageCard.displayName = 'PageCard'

export default PageCard
