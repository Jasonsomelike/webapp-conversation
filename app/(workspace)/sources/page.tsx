import { redirect } from 'next/navigation'
import SourcesView from '@/app/components/sources/sources-view'
import { getSession } from '@/lib/session'
import { getUserReferences } from '@/lib/user-data'

export default async function SourcesPage() {
  const session = await getSession()
  if (!session)
  { redirect('/login') }

  try {
    // Keep the first paint cheap: resolving fresh page-image manifests can
    // touch the Dify/file-service layer for many documents. The detail dialog
    // now resolves the current page image on demand when a user opens a
    // specific reference.
    const references = await getUserReferences(session.id)
    return <SourcesView initialReferences={references} />
  }
  catch (error) {
    console.error('[sources-page] failed to load user references', {
      appUserId: session.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return (
      <SourcesView
        initialReferences={[]}
        loadError="数据连接短暂波动，当前先展示空状态；请稍后刷新，不会影响账号数据。"
      />
    )
  }
}
