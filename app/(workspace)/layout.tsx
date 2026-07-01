import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import WorkspaceShell from '@/app/components/workspace/workspace-shell'
import { getSession } from '@/lib/session'
import { getAccountAvatar } from '@/lib/account-extension'

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session)
  { redirect('/login') }

  let avatarUrl: string | null = null
  if (session.provider !== 'guest') {
    try {
      avatarUrl = await getAccountAvatar(session.id)
    }
    catch {
      avatarUrl = null
    }
  }

  return <WorkspaceShell session={session} avatarUrl={avatarUrl}>{children}</WorkspaceShell>
}
