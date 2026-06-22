'use client'

import { useMemo, useState } from 'react'
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import Toast from '@/app/components/base/toast'
import AdminUserConversations from '@/app/components/admin/admin-user-conversations'
import { themes } from '@/lib/themes'

export interface AdminUserRow {
  id: string
  username: string
  displayName: string
  difyUserId: string
  theme: string
  failedLoginCount: number
  lockedUntil: string | null
  createdAt: string
  lastLoginAt: string | null
  _count: { conversations: number, messages: number, references: number }
}

export default function AdminUsersView({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState('')
  const [savingId, setSavingId] = useState('')
  const [conversationUser, setConversationUser] = useState<AdminUserRow>()
  const { notify } = Toast
  const filtered = useMemo(() => users.filter(user =>
    `${user.username} ${user.displayName} ${user.difyUserId}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [query, users])

  const patchLocal = (id: string, patch: Partial<AdminUserRow>) =>
    setUsers(current => current.map(user => user.id === id ? { ...user, ...patch } : user))

  const save = async (user: AdminUserRow, unlock = false) => {
    setSavingId(user.id)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          displayName: user.displayName,
          theme: user.theme,
          unlock,
        }),
      })
      if (!response.ok)
      { throw new Error('SAVE_FAILED') }
      const result = await response.json()
      patchLocal(user.id, result.user)
      notify({ type: 'success', message: unlock ? '账号锁定已解除' : '用户信息已保存' })
    }
    catch {
      notify({ type: 'error', message: '用户信息保存失败' })
    }
    finally {
      setSavingId('')
    }
  }

  return (
    <div className="mx-auto max-w-[1450px] p-4 sm:p-6">
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          ['注册用户', users.length],
          ['累计会话', users.reduce((sum, user) => sum + user._count.conversations, 0)],
          ['累计引用', users.reduce((sum, user) => sum + user._count.references, 0)],
        ].map(([label, value]) => (
          <PageCard key={label} className="p-5">
            <div className="text-xs text-black/45">{label}</div>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
          </PageCard>
        ))}
      </div>

      <PageCard className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-black/[0.07] p-4">
          <UserGroupIcon className="h-5 w-5 text-[var(--studio-accent-strong)]" />
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索账号、显示名称或 Dify 用户 ID" className="h-11 w-full rounded-xl border border-black/10 bg-black/[0.02] pl-10 pr-4 text-sm outline-none" />
          </div>
        </div>
        <div className="divide-y divide-black/[0.06]">
          {filtered.map(user => (
            <div key={user.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(220px,1fr)_180px_180px_210px] lg:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <input
                    value={user.displayName}
                    onChange={event => patchLocal(user.id, { displayName: event.target.value })}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-black/10 px-3 text-sm font-semibold outline-none"
                  />
                  {user.lockedUntil && new Date(user.lockedUntil) > new Date() && <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">已锁定</span>}
                </div>
                <div className="mt-2 truncate text-xs text-black/45">@{user.username}</div>
                <div className="mt-1 truncate text-[10px] text-black/30">{user.difyUserId}</div>
              </div>
              <select value={user.theme} onChange={event => patchLocal(user.id, { theme: event.target.value })} className="h-10 rounded-xl border border-black/10 bg-white px-3 text-xs">
                {themes.map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
              </select>
              <div className="text-xs leading-6 text-black/50">
                <div>{user._count.conversations} 会话 · {user._count.messages} 消息</div>
                <div>{user._count.references} 引用 · 登录 {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '从未'}</div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConversationUser(user)}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-black/10 px-3 text-xs font-semibold"
                  title="查看用户对话记录"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  对话
                </button>
                {(user.failedLoginCount > 0 || user.lockedUntil) && (
                  <button onClick={() => void save(user, true)} disabled={savingId === user.id} className="grid h-10 w-10 place-items-center rounded-xl border border-black/10" title="解除锁定">
                    <LockOpenIcon className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => void save(user)} disabled={savingId === user.id} className="flex h-10 min-w-[88px] items-center justify-center gap-2 rounded-xl bg-[var(--studio-deep)] px-4 text-xs font-semibold text-white disabled:opacity-50">
                  {savingId === user.id ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                  保存
                </button>
              </div>
            </div>
          ))}
        </div>
      </PageCard>
      {conversationUser && (
        <AdminUserConversations
          userId={conversationUser.id}
          displayName={conversationUser.displayName}
          username={conversationUser.username}
          onClose={() => setConversationUser(undefined)}
        />
      )}
    </div>
  )
}
