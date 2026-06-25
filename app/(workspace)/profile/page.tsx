import { redirect } from 'next/navigation'
import ProfileView from '@/app/components/profile/profile-view'
import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'
import { getSession } from '@/lib/session'
import { isAdminSession } from '@/lib/admin'
import { getAccountAvatar } from '@/lib/account-extension'
import { getQqIdentitySummary } from '@/lib/qq-auth'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session)
  { redirect('/login') }

  let profile = null
  let joinedAt = new Date(session.createdAt).toISOString()
  let currentDisplayName = session.name
  let stats = { conversations: 0, references: 0, messages: 0 }
  let avatarUrl: string | null = null
  let qqIdentity = { bound: false, appIds: [] as string[] }
  if (isDatabaseConfigured()) {
    try {
      const [user, savedProfile, conversations, references, messages, accountAvatar, qqSummary] = await withDatabaseRetry(() => Promise.all([
        db.appUser.findUnique({ where: { id: session.id }, select: { createdAt: true, displayName: true } }),
        db.userProfile.findUnique({ where: { appUserId: session.id } }),
        db.chatConversation.count({ where: { appUserId: session.id, deletedAt: null } }),
        db.messageReference.count({ where: { appUserId: session.id } }),
        db.chatMessage.count({ where: { appUserId: session.id, role: 'user' } }),
        getAccountAvatar(session.id),
        getQqIdentitySummary(session.id),
      ]))
      profile = savedProfile
      joinedAt = user?.createdAt.toISOString() || joinedAt
      currentDisplayName = user?.displayName || currentDisplayName
      stats = { conversations, references, messages }
      avatarUrl = accountAvatar
      qqIdentity = qqSummary
    }
    catch (error) {
      console.error('[profile-page] database unavailable', { appUserId: session.id, error })
    }
  }

  return (
    <ProfileView
      session={{ ...session, name: currentDisplayName }}
      initialProfile={profile}
      stats={stats}
      joinedAt={joinedAt}
      isAdmin={isAdminSession(session)}
      initialAvatarUrl={avatarUrl}
      initialQqIdentity={qqIdentity}
    />
  )
}
