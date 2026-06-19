import { redirect } from 'next/navigation'
import ProfileView from '@/app/components/profile/profile-view'
import { getSession } from '@/lib/session'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session)
  { redirect('/login') }

  return <ProfileView session={session} />
}
