import { redirect } from 'next/navigation'
import LoginPanel from '@/app/components/auth/login-panel'
import { getSession } from '@/lib/session'

export default async function LoginPage() {
  const session = await getSession()
  if (session)
  { redirect('/chat') }

  return <LoginPanel />
}
