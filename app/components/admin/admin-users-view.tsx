'use client'

import { useMemo, useState } from 'react'
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
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
  const [deletingId, setDeletingId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow>()
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [hiddenCleanupName, setHiddenCleanupName] = useState('')
  const [cleaningHidden, setCleaningHidden] = useState(false)
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

  const deleteUser = async (user: AdminUserRow) => {
    if (deleteConfirmText !== user.username) {
      notify({ type: 'error', message: '请先输入完整账户名再注销' })
      return
    }

    setDeletingId(user.id)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok)
      { throw new Error(result.error || '删除用户失败') }
      setUsers(current => current.filter(item => item.id !== user.id))
      setDeleteTarget(undefined)
      setDeleteConfirmText('')
      notify({ type: 'success', message: '用户已注销' })
    }
    catch (error) {
      notify({ type: 'error', message: error instanceof Error ? error.message : '删除用户失败' })
    }
    finally {
      setDeletingId('')
    }
  }

  const cleanupUsers = async (body: { mode: 'hidden-test-users' } | { mode: 'username', username: string }) => {
    if (body.mode === 'username' && !body.username.trim()) {
      notify({ type: 'error', message: '请输入要清理的账户名' })
      return
    }

    setCleaningHidden(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok)
      { throw new Error(result.error || '清理用户失败') }
      const names = new Set<string>((result.users || []).map((name: string) => name.toLowerCase()))
      setUsers(current => current.filter(item => !names.has(item.username.toLowerCase())))
      if (body.mode === 'username')
      { setHiddenCleanupName('') }
      notify({ type: 'success', message: `已清理 ${result.deleted || 0} 个账号` })
    }
    catch (error) {
      notify({ type: 'error', message: error instanceof Error ? error.message : '清理用户失败' })
    }
    finally {
      setCleaningHidden(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1450px] p-4 pb-10 sm:p-6 sm:pb-12">
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

      <PageCard className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold">隐藏账号清理</div>
            <p className="mt-1 text-xs leading-5 text-black/45">
              后台列表会隐藏 test/demo/guest/deleted 等账号；可一键清理这些测试残留，或输入列表外账户名单独注销。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={cleaningHidden}
              onClick={() => void cleanupUsers({ mode: 'hidden-test-users' })}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-600 disabled:opacity-50"
            >
              {cleaningHidden ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <TrashIcon className="h-4 w-4" />}
              清理隐藏测试账号
            </button>
            <div className="flex min-w-0 gap-2">
              <input
                value={hiddenCleanupName}
                onChange={event => setHiddenCleanupName(event.target.value)}
                placeholder="输入列表外账户名，如 test"
                className="h-10 min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none sm:w-56"
              />
              <button
                type="button"
                disabled={cleaningHidden || !hiddenCleanupName.trim()}
                onClick={() => void cleanupUsers({ mode: 'username', username: hiddenCleanupName.trim() })}
                className="h-10 rounded-xl bg-[var(--studio-deep)] px-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                按账户名注销
              </button>
            </div>
          </div>
        </div>
      </PageCard>

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
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(user)
                    setDeleteConfirmText('')
                  }}
                  disabled={deletingId === user.id}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600 disabled:opacity-50"
                  title="注销/删除用户"
                >
                  {deletingId === user.id ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <TrashIcon className="h-4 w-4" />}
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
      {deleteTarget && (
        <div
          role="presentation"
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 px-3 pb-[calc(14px+env(safe-area-inset-bottom))] pt-[calc(14px+env(safe-area-inset-top))] backdrop-blur-[2px] sm:items-center"
          onClick={() => deletingId ? undefined : setDeleteTarget(undefined)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-delete-user-title"
            className="w-full max-w-[520px] rounded-[28px] border border-red-200 bg-[var(--studio-surface)] p-5 shadow-[0_30px_90px_rgba(0,0,0,.28)]"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
                <TrashIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="admin-delete-user-title" className="text-base font-semibold text-red-700">确认注销用户</h3>
                <p className="mt-2 text-xs leading-6 text-black/55">
                  将注销 @{deleteTarget.username}。账号、QQ 绑定、头像、会话、消息、引用、画像、图谱、分析报告、上传解析与分享记录会从数据库同步删除，且不可恢复。
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteTarget(undefined)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.04] text-black/45 transition hover:bg-black/[0.08] disabled:opacity-50"
                aria-label="关闭"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/50 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="admin-delete-user-confirm" className="text-xs font-semibold text-red-800">
                  请输入账户名 @{deleteTarget.username}
                </label>
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => setDeleteConfirmText(deleteTarget.username)}
                  className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-red-600 shadow-sm transition hover:bg-red-100 disabled:opacity-50"
                >
                  一键输入账户名
                </button>
              </div>
              <input
                id="admin-delete-user-confirm"
                value={deleteConfirmText}
                onChange={event => setDeleteConfirmText(event.target.value)}
                disabled={Boolean(deletingId)}
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-red-100 bg-white px-3 text-sm outline-none focus:border-red-300"
                placeholder={deleteTarget.username}
              />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteTarget(undefined)}
                className="h-11 rounded-xl border border-black/10 px-5 text-xs font-semibold disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId) || deleteConfirmText !== deleteTarget.username}
                onClick={() => void deleteUser(deleteTarget)}
                className="h-11 rounded-xl bg-red-600 px-5 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(220,38,38,.18)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId === deleteTarget.id ? '正在注销…' : '确认注销并清除数据'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
