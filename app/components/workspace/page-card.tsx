import type { ReactNode } from 'react'

interface PageCardProps {
  children: ReactNode
  className?: string
}

export default function PageCard({ children, className = '' }: PageCardProps) {
  return (
    <section className={`rounded-[22px] border border-[#183129]/[0.075] bg-[#fffefa] shadow-[0_16px_50px_rgba(29,50,42,0.055)] ${className}`}>
      {children}
    </section>
  )
}
