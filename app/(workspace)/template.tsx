import type { ReactNode } from 'react'
import GsapRouteTransition from '@/app/components/motion/gsap-route-transition'

export default function WorkspaceTemplate({ children }: { children: ReactNode }) {
  return (
    <GsapRouteTransition>
      {children}
    </GsapRouteTransition>
  )
}
