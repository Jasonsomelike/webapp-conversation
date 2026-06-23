import AppSettingsView from '@/app/components/profile/app-settings-view'
import { getSession } from '@/lib/session'

export default async function AppSettingsPage() {
  const session = await getSession()
  return <AppSettingsView initialTheme={session?.theme || 'forest'} />
}
