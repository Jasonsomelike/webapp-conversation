import { redirect } from 'next/navigation'
import AdminUsersView from '@/app/components/admin/admin-users-view'
import { db, withDatabaseRetry } from '@/lib/db'
import { isAdminSession } from '@/lib/admin'
import { getSession } from '@/lib/session'

export default async function AdminPage() {
  const session = await getSession()
  if (!session || !isAdminSession(session))
  { redirect('/profile') }

  const users = await withDatabaseRetry(() => db.appUser.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: {
      id: true,
      username: true,
      displayName: true,
      difyUserId: true,
      theme: true,
      failedLoginCount: true,
      lockedUntil: true,
      createdAt: true,
      lastLoginAt: true,
      _count: {
        select: { conversations: true, messages: true, references: true },
      },
    },
  }))

  return (
    <AdminUsersView initialUsers={users.map(user => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      lockedUntil: user.lockedUntil?.toISOString() || null,
    }))} />
  )
}
