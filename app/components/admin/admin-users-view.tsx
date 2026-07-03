'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  ExclamationTriangleIcon,
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

interface BatchDeleteTarget {
  mode: 'guests' | 'username_contains'
  title: string
  description: string
  confirmText: 'DELETE_GUESTS' | 'DELETE_MATCHED_USERS'
  include?: string
  exclude?: string
  users: AdminUserRow[]
}

const isGuestUser = (user: AdminUserRow) => user.username.startsWith('guest_') || user.displayName === '游客'

export default function AdminUsersView({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState('')
  const [batchInclude, setBatchInclude] = useState('')
  const [batchExclude, setBatchExclude] = useState('')
  const [savingId, setSavingId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow>()
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [batchTarget, setBatchTarget] = useState<BatchDeleteTarget>()
  const [batchConfirmText, setBatchConfirmText] = useState('')
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [conversationUser, setConversationUser] = useState<AdminUserRow>()
  const [portalReady, setPortalReady] = useState(false)
  const { notify } = Toast
  const filtered = useMemo(() => users.filter(user =>
    `${user.username} ${user.displayName} ${user.difyUserId}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [query, users])
  const guestUsers = useMemo(() => users.filter(isGuestUser), [users])
  const usernameBatchPreview = useMemo(() => {
    const include = batchInclude.trim().toLowerCase()
    const exclude = batchExclude.trim().toLowerCase()
    if (!include)
    { return [] }
    return users.filter((user) => {
      const username = user.username.toLowerCase()
      return username.includes(include) && (!exclude || !username.includes(exclude))
    })
  }, [batchExclude, batchInclude, users])

  const patchLocal = (id: string, patch: Partial<AdminUserRow>) =>
    setUsers(current => current.map(user => user.id === id ? { ...user, ...patch } : user))

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!deleteTarget && !batchTarget)
    { return }

    const html = document.documentElement
    const body = document.body
    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousBodyPosition = body.style.position
    const previousBodyWidth = body.style.width
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'relative'
    body.style.width = '100%'

    return () => {
      html.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
      body.style.position = previousBodyPosition
      body.style.width = previousBodyWidth
    }
  }, [batchTarget, deleteTarget])

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

  const openBatchDelete = (target: BatchDeleteTarget) => {
    if (!target.users.length) {
      notify({ type: 'error', message: '没有匹配到可删除账号' })
      return
    }
    setBatchTarget(target)
    setBatchConfirmText('')
  }

  const deleteBatchUsers = async (target: BatchDeleteTarget) => {
    if (batchConfirmText !== target.confirmText) {
      notify({ type: 'error', message: '请先输入确认文本' })
      return
    }

    setBatchDeleting(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: target.mode,
          include: target.include,
          exclude: target.exclude,
          confirmText: target.confirmText,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok)
      { throw new Error(result.error || '批量删除失败') }
      const deletedIds = new Set((result.deleted || []).map((item: { id: string }) => item.id))
      setUsers(current => current.filter(user => !deletedIds.has(user.id)))
      setBatchTarget(undefined)
      setBatchConfirmText('')
      notify({
        type: result.failed?.length ? 'error' : 'success',
        message: result.failed?.length
          ? `已删除 ${result.deleted?.length || 0} 个，${result.failed.length} 个失败`
          : `已删除 ${result.deleted?.length || 0} 个账号及关联数据`,
      })
    }
    catch (error) {
      notify({ type: 'error', message: error instanceof Error ? error.message : '批量删除失败' })
    }
    finally {
      setBatchDeleting(false)
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

      <PageCard className="overflow-hidden">
        <div className="border-b border-black/[0.07] p-4">
          <div className="flex items-center gap-3">
            <UserGroupIcon className="h-5 w-5 text-[var(--studio-accent-strong)]" />
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索账号、显示名称或 Dify 用户 ID" className="h-11 w-full rounded-xl border border-black/10 bg-black/[0.02] pl-10 pr-4 text-sm outline-none" />
            </div>
          </div>
          <div className="mt-3 grid gap-3 rounded-2xl border border-black/[0.06] bg-black/[0.018] p-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <button
              type="button"
              onClick={() => openBatchDelete({
                mode: 'guests',
                title: '批量删除游客账号',
                description: `将删除当前数据库中 ${guestUsers.length} 个游客账号，以及它们的会话、消息、引用、画像、图谱、上传解析、分享记录等关联数据。`,
                confirmText: 'DELETE_GUESTS',
                users: guestUsers,
              })}
              disabled={!guestUsers.length || batchDeleting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 text-xs font-semibold text-orange-700 disabled:opacity-45"
            >
              <TrashIcon className="h-4 w-4" />
              批量删除游客（{guestUsers.length}）
            </button>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              <input
                value={batchInclude}
                onChange={event => setBatchInclude(event.target.value)}
                placeholder="用户名包含，例如 test"
                className="h-10 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none"
              />
              <input
                value={batchExclude}
                onChange={event => setBatchExclude(event.target.value)}
                placeholder="可选排除，例如 admin"
                className="h-10 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => openBatchDelete({
                mode: 'username_contains',
                title: '按用户名匹配批量删除',
                description: `将删除用户名包含“${batchInclude.trim()}”${batchExclude.trim() ? `且不包含“${batchExclude.trim()}”` : ''}的 ${usernameBatchPreview.length} 个账号，并同步清除全部关联数据。`,
                confirmText: 'DELETE_MATCHED_USERS',
                include: batchInclude.trim(),
                exclude: batchExclude.trim(),
                users: usernameBatchPreview,
              })}
              disabled={!batchInclude.trim() || !usernameBatchPreview.length || batchDeleting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white disabled:opacity-45"
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
              删除匹配账号（{usernameBatchPreview.length}）
            </button>
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
      {portalReady && conversationUser && createPortal(
        <AdminUserConversations
          userId={conversationUser.id}
          displayName={conversationUser.displayName}
          username={conversationUser.username}
          onClose={() => setConversationUser(undefined)}
        />,
        document.body,
      )}
      {portalReady && deleteTarget && createPortal(
        <div
          role="presentation"
          className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-black/50 px-3 py-[calc(16px+env(safe-area-inset-top))] backdrop-blur-[3px]"
          onClick={() => deletingId ? undefined : setDeleteTarget(undefined)}
          onWheel={event => event.preventDefault()}
          onTouchMove={event => event.preventDefault()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-delete-user-title"
            className="max-h-[min(86dvh,680px)] w-full max-w-[520px] overflow-y-auto overscroll-contain rounded-[28px] border border-red-200 bg-[var(--studio-surface)] p-5 shadow-[0_30px_90px_rgba(0,0,0,.34)]"
            onClick={event => event.stopPropagation()}
            onWheel={event => event.stopPropagation()}
            onTouchMove={event => event.stopPropagation()}
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
        </div>,
        document.body,
      )}
      {portalReady && batchTarget && createPortal(
        <div
          role="presentation"
          className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-black/55 px-3 py-[calc(16px+env(safe-area-inset-top))] backdrop-blur-[3px]"
          onClick={() => batchDeleting ? undefined : setBatchTarget(undefined)}
          onWheel={event => event.preventDefault()}
          onTouchMove={event => event.preventDefault()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-batch-delete-title"
            className="max-h-[min(88dvh,720px)] w-full max-w-[620px] overflow-y-auto overscroll-contain rounded-[28px] border border-red-200 bg-[var(--studio-surface)] p-5 shadow-[0_30px_90px_rgba(0,0,0,.34)]"
            onClick={event => event.stopPropagation()}
            onWheel={event => event.stopPropagation()}
            onTouchMove={event => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
                <ExclamationTriangleIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="admin-batch-delete-title" className="text-base font-semibold text-red-700">{batchTarget.title}</h3>
                <p className="mt-2 text-xs leading-6 text-black/55">{batchTarget.description}</p>
              </div>
              <button
                type="button"
                disabled={batchDeleting}
                onClick={() => setBatchTarget(undefined)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.04] text-black/45 transition hover:bg-black/[0.08] disabled:opacity-50"
                aria-label="关闭"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/50 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="admin-batch-delete-confirm" className="text-xs font-semibold text-red-800">
                  请输入确认文本 {batchTarget.confirmText}
                </label>
                <button
                  type="button"
                  disabled={batchDeleting}
                  onClick={() => setBatchConfirmText(batchTarget.confirmText)}
                  className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-red-600 shadow-sm transition hover:bg-red-100 disabled:opacity-50"
                >
                  一键输入确认文本
                </button>
              </div>
              <input
                id="admin-batch-delete-confirm"
                value={batchConfirmText}
                onChange={event => setBatchConfirmText(event.target.value)}
                disabled={batchDeleting}
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-red-100 bg-white px-3 text-sm outline-none focus:border-red-300"
                placeholder={batchTarget.confirmText}
              />
            </div>
            <div className="mt-4 max-h-40 overflow-y-auto rounded-2xl border border-black/[0.06] bg-black/[0.02] p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">
                将删除 {batchTarget.users.length} 个账号
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {batchTarget.users.slice(0, 60).map(user => (
                  <div key={user.id} className="truncate rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-black/55">
                    @{user.username}
                  </div>
                ))}
              </div>
              {batchTarget.users.length > 60 && (
                <div className="mt-2 text-[11px] text-black/40">另有 {batchTarget.users.length - 60} 个账号未展开显示。</div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={batchDeleting}
                onClick={() => setBatchTarget(undefined)}
                className="h-11 rounded-xl border border-black/10 px-5 text-xs font-semibold disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={batchDeleting || batchConfirmText !== batchTarget.confirmText}
                onClick={() => void deleteBatchUsers(batchTarget)}
                className="h-11 rounded-xl bg-red-600 px-5 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(220,38,38,.18)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {batchDeleting ? '正在批量删除…' : '确认批量删除并清除数据'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
