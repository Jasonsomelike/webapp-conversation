import type { HTMLAttributes, ReactNode } from 'react'

interface PageCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

export default function PageCard({ children, className = '', ...props }: PageCardProps) {
  return (
    <section
      className={`rounded-[22px] border border-black/[0.075] bg-[var(--studio-surface)] shadow-[0_16px_50px_rgba(29,50,42,0.055)] ${className}`}
      {...props}
    >
      {children}
    </section>
  )
}
