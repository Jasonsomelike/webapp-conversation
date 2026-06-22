import type { ReactNode } from 'react'

export default function WorkspaceTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="workspace-route-enter h-full min-h-0">
      {children}
    </div>
  )
}
