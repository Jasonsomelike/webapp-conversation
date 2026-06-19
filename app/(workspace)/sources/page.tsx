import { redirect } from 'next/navigation'
import SourcesView from '@/app/components/sources/sources-view'
import { getSession } from '@/lib/session'
import { getUserReferences } from '@/lib/user-data'

export default async function SourcesPage() {
  const session = await getSession()
  if (!session)
  { redirect('/login') }
  return <SourcesView initialReferences={await getUserReferences(session.id)} />
}
