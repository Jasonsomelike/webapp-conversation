import type { AppSession } from '@/lib/session'

const configuredAdmins = () =>
  (process.env.ADMIN_USERNAMES || 'jason')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)

export const isAdminUsername = (username?: string | null) =>
  Boolean(username && configuredAdmins().includes(username.trim().toLowerCase()))

export const isAdminSession = (session?: Pick<AppSession, 'username'> | null) =>
  isAdminUsername(session?.username)
