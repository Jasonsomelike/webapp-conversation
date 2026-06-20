import type { ReactNode } from 'react'

interface PageCardProps {
  children: ReactNode
  className?: string
}

export default function PageCard({ children, className = '' }: PageCardProps) {
  return (
    <section className={`rounded-[22px] border border-black/[0.075] bg-[var(--studio-surface)] shadow-[0_16px_50px_rgba(29,50,42,0.055)] ${className}`}>
      {children}
    </section>
  )
}
