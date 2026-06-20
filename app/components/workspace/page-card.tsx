import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

interface PageCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

const PageCard = forwardRef<HTMLElement, PageCardProps>(({ children, className = '', ...props }, ref) => {
  return (
    <section
      ref={ref}
      className={`rounded-[22px] border border-black/[0.075] bg-[var(--studio-surface)] shadow-[0_16px_50px_rgba(29,50,42,0.055)] ${className}`}
      {...props}
    >
      {children}
    </section>
  )
})
PageCard.displayName = 'PageCard'

export default PageCard
