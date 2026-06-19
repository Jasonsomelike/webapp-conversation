import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import WorkspaceShell from '@/app/components/workspace/workspace-shell'
import { getSession } from '@/lib/session'

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session)
  { redirect('/login') }

  return <WorkspaceShell session={session}>{children}</WorkspaceShell>
}
