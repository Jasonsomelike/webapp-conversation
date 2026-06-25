import { redirect } from 'next/navigation'
import AdminUsersView from '@/app/components/admin/admin-users-view'
import { isAdminSession } from '@/lib/admin'
import { getSession } from '@/lib/session'
import { listVisibleAdminUsers } from '@/lib/admin-users'

export default async function AdminPage() {
  const session = await getSession()
  if (!session || !isAdminSession(session))
  { redirect('/profile') }

  const users = await listVisibleAdminUsers()

  return <AdminUsersView initialUsers={users} />
}
