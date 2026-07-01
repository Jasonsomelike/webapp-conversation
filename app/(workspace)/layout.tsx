import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import WorkspaceShell from '@/app/components/workspace/workspace-shell'
import { getSession, type AppSession } from '@/lib/session'
import { getAccountAvatar } from '@/lib/account-extension'

const guestAllowedRoutes = new Set(['/textbook-knowledge-graph'])

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers()
  const pathname = headerStore.get('x-pathname') || ''
  const session = await getSession()
  const effectiveSession: AppSession | null = session || (guestAllowedRoutes.has(pathname)
    ? {
      id: 'guest-textbook-graph',
      difyUserId: 'guest-textbook-graph',
      username: 'guest',
      name: '游客',
      theme: 'forest',
      provider: 'guest',
      createdAt: Date.now(),
    }
    : null)
  if (!effectiveSession)
  { redirect('/login') }

  let avatarUrl: string | null = null
  if (effectiveSession.provider !== 'guest') {
    try {
      avatarUrl = await getAccountAvatar(effectiveSession.id)
    }
    catch {
      avatarUrl = null
    }
  }

  return <WorkspaceShell session={effectiveSession} avatarUrl={avatarUrl}>{children}</WorkspaceShell>
}
