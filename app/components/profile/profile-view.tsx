'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  ArrowRightStartOnRectangleIcon,
  CalendarDaysIcon,
  CameraIcon,
  ChartBarSquareIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  FingerPrintIcon,
  InformationCircleIcon,
  KeyIcon,
  LinkIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import type { AppSession } from '@/lib/session'
import Toast from '@/app/components/base/toast'
import Link from 'next/link'
import { isNetworkStudyApp, type NativeQqLoginResult, type NativeQqResultEnvelope } from '@/lib/native-app'
import { resetChatRuntime } from '@/app/components/chat/runtime-store'
import { passwordPolicyHint } from '@/lib/password-policy'

const stages = ['入门', '系统学习', '复习', '刷题', '备考']
const styles = ['图示讲解', '公式推导', '例题驱动', '简洁回答']
const targets = ['期末考试', '课程作业', '竞赛', '自学提升']

interface QqIdentitySummary {
  bound: boolean
  displayId?: string
  openIdTail?: string
  unionId?: string
  appIds: string[]
}

export default function ProfileView({
  session,
  initialProfile,
  stats,
  joinedAt,
  isAdmin,
  initialAvatarUrl,
  initialQqIdentity,
}: {
  session: AppSession
  initialProfile: { learningStage?: string | null, preferredStyle?: string | null, target?: string | null } | null
  stats: { conversations: number, references: number, messages: number }
  joinedAt: string
  isAdmin: boolean
  initialAvatarUrl: string | null
  initialQqIdentity: QqIdentitySummary
}) {
  const initialStage = initialProfile?.learningStage || '系统学习'
  const initialStyle = initialProfile?.preferredStyle || '图示讲解'
  const initialTarget = initialProfile?.target || '自学提升'
  const [stage, setStage] = useState(initialStage)
  const [style, setStyle] = useState(initialStyle)
  const [target, setTarget] = useState(initialTarget)
  const [displayName, setDisplayName] = useState(session.name)
  const [savedProfile, setSavedProfile] = useState({ stage: initialStage, style: initialStyle, target: initialTarget, displayName: session.name })
  const [nativeApp, setNativeApp] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [qqIdentity, setQqIdentity] = useState<QqIdentitySummary>(initialQqIdentity)
  const [qqBinding, setQqBinding] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [detailPanel, setDetailPanel] = useState<'learner' | 'account' | null>(null)
  const qqPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qqTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { notify } = Toast
  const dirty = stage !== savedProfile.stage || style !== savedProfile.style || target !== savedProfile.target || displayName !== savedProfile.displayName
  const qqBound = qqIdentity.bound
  const qqDisplay = qqIdentity.displayId
    ? `QQ 标识：${qqIdentity.displayId}`
    : qqIdentity.openIdTail
      ? `QQ 标识尾号：${qqIdentity.openIdTail}`
      : '可以使用 QQ 快速登录当前账号'

  useEffect(() => {
    setNativeApp(isNetworkStudyApp())
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search)
    if (params.get('qq_bound') === '1') {
      setQqIdentity(identity => ({ ...identity, bound: true }))
      notify({ type: 'success', message: 'QQ 账号已绑定' })
    }
    else if (params.get('qq_bind_error') === '1')
    { notify({ type: 'error', message: 'QQ 账号绑定失败，请重试' }) }
  }, [notify])

  useEffect(() => {
    const completeBinding = async (event: Event) => {
      const detail = (event as CustomEvent<NativeQqLoginResult>).detail
      if (detail?.purpose !== 'bind' || !detail.accessToken || !detail.openId)
      { return }
      window.NetworkStudyApp?.consumePendingQqResult?.()
      if (qqPollRef.current)
      { clearInterval(qqPollRef.current) }
      if (qqTimeoutRef.current)
      { clearTimeout(qqTimeoutRef.current) }
      try {
        const response = await fetch('/api/profile/qq/bind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(detail),
        })
        const result = await response.json()
        if (!response.ok)
        { throw new Error(result.error || '绑定 QQ 失败') }
        if (result.qq)
        { setQqIdentity(result.qq) }
        else
        { setQqIdentity(identity => ({ ...identity, bound: true })) }
        notify({ type: 'success', message: 'QQ 账号已绑定' })
      }
      catch (error) {
        notify({ type: 'error', message: error instanceof Error ? error.message : '绑定 QQ 失败' })
      }
      finally {
        setQqBinding(false)
      }
    }
    const failBinding = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string, purpose?: string }>).detail
      if (detail?.purpose !== 'bind')
      { return }
      if (qqPollRef.current)
      { clearInterval(qqPollRef.current) }
      if (qqTimeoutRef.current)
      { clearTimeout(qqTimeoutRef.current) }
      window.NetworkStudyApp?.consumePendingQqResult?.()
      setQqBinding(false)
      notify({ type: 'error', message: detail.message || 'QQ 授权已取消' })
    }
    globalThis.addEventListener('network-study-qq-login', completeBinding)
    globalThis.addEventListener('network-study-qq-login-error', failBinding)
    return () => {
      globalThis.removeEventListener('network-study-qq-login', completeBinding)
      globalThis.removeEventListener('network-study-qq-login-error', failBinding)
      if (qqPollRef.current)
      { clearInterval(qqPollRef.current) }
      if (qqTimeoutRef.current)
      { clearTimeout(qqTimeoutRef.current) }
    }
  }, [notify])

  useEffect(() => {
    if (!editing || !dirty)
    { return }

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const interceptNavigation = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href]')
      if (!anchor?.href || anchor.target === '_blank')
      { return }
      // eslint-disable-next-line no-alert
      if (!globalThis.confirm('你有未保存的画像修改，确定离开吗？')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    globalThis.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', interceptNavigation, true)
    return () => {
      globalThis.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', interceptNavigation, true)
    }
  }, [dirty, editing])

  const cancel = () => {
    setStage(savedProfile.stage)
    setStyle(savedProfile.style)
    setTarget(savedProfile.target)
    setDisplayName(savedProfile.displayName)
    setEditing(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, learningStage: stage, preferredStyle: style, target }),
      })
      if (!response.ok)
      { throw new Error(`PROFILE_SAVE_FAILED:${response.status}`) }
      setSavedProfile({ stage, style, target, displayName })
      setEditing(false)
      notify({ type: 'success', message: '画像已更新' })
      globalThis.setTimeout(() => globalThis.location.reload(), 350)
    }
    catch {
      notify({ type: 'error', message: '保存失败，请稍后重试' })
    }
    finally {
      setSaving(false)
    }
  }

  const logout = async () => {
    if (loggingOut)
    { return }
    setLoggingOut(true)
    try {
      resetChatRuntime()
      await fetch('/api/auth/logout', { method: 'POST' })
      globalThis.location.replace('/login')
    }
    catch {
      setLoggingOut(false)
      notify({ type: 'error', message: '退出失败，请稍后重试' })
    }
  }

  const deleteAccount = async () => {
    // eslint-disable-next-line no-alert
    const typed = globalThis.prompt(`注销后账号将无法再次登录，QQ 绑定会解除，但历史学习数据会被保留用于审计与数据完整性。\n\n如确认，请输入账号名：${session.username}`)
    if (typed !== session.username)
    { return }
    setDeletingAccount(true)
    try {
      resetChatRuntime()
      const response = await fetch('/api/profile/account', { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok)
      { throw new Error(result.error || '注销账号失败') }
      globalThis.location.replace('/login')
    }
    catch (error) {
      setDeletingAccount(false)
      notify({ type: 'error', message: error instanceof Error ? error.message : '注销账号失败，请稍后重试' })
    }
  }

  const unbindQq = async () => {
    if (!qqBound)
    { return }
    // eslint-disable-next-line no-alert
    if (!globalThis.confirm('解绑后将不能继续使用该 QQ 直接登录当前账号，确定解绑吗？'))
    { return }
    setQqBinding(true)
    try {
      const response = await fetch('/api/profile/qq/unbind', { method: 'POST' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok)
      { throw new Error(result.error || '解绑 QQ 失败') }
      setQqIdentity(result.qq || { bound: false, appIds: [] })
      notify({ type: 'success', message: 'QQ 账号已解绑' })
    }
    catch (error) {
      notify({ type: 'error', message: error instanceof Error ? error.message : '解绑 QQ 失败，请稍后重试' })
    }
    finally {
      setQqBinding(false)
    }
  }

  const startQqBinding = () => {
    if (!nativeApp) {
      globalThis.location.href = '/api/auth/qq/web/start?purpose=bind'
      return
    }
    const bridge = window.NetworkStudyApp
    if (!bridge?.bindQQ) {
      notify({ type: 'error', message: '当前 App 版本不支持绑定 QQ，请更新后重试' })
      return
    }
    setQqBinding(true)
    bridge.bindQQ()
    qqPollRef.current = setInterval(() => {
      try {
        bridge.getQqLoginStatus?.()
        const raw = bridge.consumePendingQqResult?.()
        if (!raw)
        { return }
        const result = JSON.parse(raw) as NativeQqResultEnvelope
        globalThis.dispatchEvent(new CustomEvent(
          result.status === 'success' ? 'network-study-qq-login' : 'network-study-qq-login-error',
          { detail: result.detail },
        ))
      }
      catch {
        // Wait for the QQ activity to fully return to the WebView.
      }
    }, 450)
    qqTimeoutRef.current = setTimeout(() => {
      if (qqPollRef.current)
      { clearInterval(qqPollRef.current) }
      setQqBinding(false)
      const nativeStatus = bridge.getQqLoginStatus?.()
      notify({ type: 'error', message: `QQ 授权响应超时${nativeStatus ? `（原生阶段：${nativeStatus}）` : ''}，请重试` })
    }, 60_000)
  }

  const uploadAvatar = async (file?: File) => {
    if (!file)
    { return }
    if (!file.type.startsWith('image/')) {
      notify({ type: 'error', message: '请选择图片文件' })
      return
    }
    setAvatarSaving(true)
    try {
      const objectUrl = URL.createObjectURL(file)
      const image = new Image()
      const avatar = await new Promise<string>((resolve, reject) => {
        image.onload = () => {
          const size = 256
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const context = canvas.getContext('2d')
          if (!context) {
            reject(new Error('无法处理头像'))
            return
          }
          const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
          const sourceX = (image.naturalWidth - sourceSize) / 2
          const sourceY = (image.naturalHeight - sourceSize) / 2
          context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size)
          resolve(canvas.toDataURL('image/jpeg', 0.84))
        }
        image.onerror = () => reject(new Error('头像读取失败'))
        image.src = objectUrl
      })
      URL.revokeObjectURL(objectUrl)
      const response = await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar }),
      })
      const result = await response.json()
      if (!response.ok)
      { throw new Error(result.error || '头像保存失败') }
      setAvatarUrl(result.avatar)
      globalThis.dispatchEvent(new CustomEvent('network-study-avatar-changed', { detail: { avatar: result.avatar } }))
      notify({ type: 'success', message: '头像已更新' })
    }
    catch (error) {
      notify({ type: 'error', message: error instanceof Error ? error.message : '头像保存失败' })
    }
    finally {
      setAvatarSaving(false)
    }
  }

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordSaving(true)
    try {
      const form = new FormData(event.currentTarget)
      if (form.get('newPassword') !== form.get('confirmPassword'))
      { throw new Error('两次输入的新密码不一致') }
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.get('currentPassword'),
          newPassword: form.get('newPassword'),
        }),
      })
      const result = await response.json()
      if (!response.ok)
      { throw new Error(result.error || '密码修改失败') }
      event.currentTarget.reset()
      setPasswordOpen(false)
      notify({ type: 'success', message: '密码已修改' })
    }
    catch (error) {
      notify({ type: 'error', message: error instanceof Error ? error.message : '密码修改失败' })
    }
    finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-4 sm:px-5 sm:py-5 xl:px-6">
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-[24px] bg-[var(--studio-deep)] p-5 text-white shadow-[0_18px_48px_rgba(23,52,43,.16)] sm:p-6">
          <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-[var(--studio-accent)]/12 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <label className="group relative block h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-[22px] bg-[var(--studio-accent)] text-[var(--studio-deep)] shadow-lg">
                {avatarUrl
                  ? <img src={avatarUrl} alt="用户头像" className="h-full w-full object-cover" />
                  : <span className="grid h-full w-full place-items-center text-2xl font-semibold">{savedProfile.displayName.slice(0, 1)}</span>}
                <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                  <CameraIcon className="h-5 w-5 text-white" />
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={avatarSaving}
                  onChange={event => void uploadAvatar(event.target.files?.[0])}
                  className="sr-only"
                />
              </label>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--studio-accent)]">Learner center</div>
                {editing
                  ? (
                    <input
                      value={displayName}
                      onChange={event => setDisplayName(event.target.value)}
                      maxLength={64}
                      className="mt-2 h-11 w-full max-w-[320px] rounded-xl border border-white/20 bg-white/10 px-3 text-lg font-semibold text-white outline-none placeholder:text-white/35"
                      placeholder="输入显示名称"
                    />
                  )
                  : <h2 className="mt-1 truncate text-2xl font-semibold tracking-[-0.03em]">{savedProfile.displayName}</h2>}
                <div className="mt-1 text-xs text-white/45">@{session.username} · {stage} · {style}</div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] lg:min-w-[520px]">
              <div className="grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/[0.06] py-3 text-center">
                {[
                  [String(stats.conversations), '会话'],
                  [String(stats.references), '引用'],
                  [String(stats.messages), '提问'],
                ].map(([value, label]) => (
                  <div key={label}>
                    <div className="text-lg font-semibold text-[var(--studio-accent)]">{value}</div>
                    <div className="mt-1 text-[9px] text-white/40">{label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:w-[270px]">
                <button
                  type="button"
                  onClick={() => {
                    if (editing)
                    { cancel() }
                    else
                    { setEditing(true) }
                  }}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 text-[10px] font-semibold transition hover:bg-white/15"
                >
                  {editing ? <XMarkIcon className="h-3.5 w-3.5" /> : <PencilSquareIcon className="h-3.5 w-3.5" />}
                  {editing ? '取消' : '编辑'}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailPanel('learner')}
                  className="h-11 rounded-xl bg-white/10 px-2 text-[10px] font-semibold transition hover:bg-white/15"
                >
                  画像详情
                </button>
                <button
                  type="button"
                  onClick={() => setDetailPanel('account')}
                  className="h-11 rounded-xl bg-white/10 px-2 text-[10px] font-semibold transition hover:bg-white/15"
                >
                  账户信息
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <PageCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8f4ec] text-[#47715c]">
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#748179]">Learning preferences</div>
                <h2 className="mt-1 text-base font-semibold">学习偏好设置</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              {[
                ['当前阶段', stages, stage, setStage],
                ['偏好风格', styles, style, setStyle],
                ['学习目标', targets, target, setTarget],
              ].map(([label, options, value, setter]) => (
                <div key={label as string}>
                  <div className="mb-2 text-xs font-semibold">{label as string}</div>
                  <div className="flex flex-wrap gap-2">
                    {(options as string[]).map(option => (
                      <button
                        key={option}
                        disabled={!editing || saving}
                        onClick={() => (setter as (value: string) => void)(option)}
                        className={`rounded-xl border px-3 py-2 text-xs transition ${
                          option === value
                            ? 'border-[#17342b] bg-[#17342b] font-semibold text-white'
                            : 'border-[#183129]/10 bg-[var(--studio-surface)] text-[var(--studio-muted)] hover:border-[var(--studio-accent-strong)]/30'
                        } ${!editing ? 'cursor-default opacity-70' : ''}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {editing && (
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={cancel}
                  disabled={saving}
                  className="h-11 rounded-xl border border-black/10 px-5 text-xs font-semibold disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={save}
                  disabled={saving || !dirty}
                  className="flex h-11 items-center gap-2 rounded-xl bg-[var(--studio-accent)] px-5 text-xs font-semibold text-[var(--studio-deep)] shadow-[0_10px_24px_rgba(132,153,58,.15)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            )}
          </PageCard>

          <div className="grid gap-4 md:grid-cols-2">
            <PageCard className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#fff0df] text-[#a4653a]">
                  <AcademicCapIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7f8b85]">Knowledge</div>
                  <div className="mt-1 text-sm font-semibold">当前学习配置</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[stage, style, target].map((topic, index) => (
                  <span key={topic} className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${index < 2 ? 'bg-[#e8f4ec] text-[#47715c]' : 'bg-[#f1f2ee] text-[#6f7b75]'}`}>{topic}</span>
                ))}
              </div>
            </PageCard>

            <PageCard className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f1eafa] text-[#765692]">
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7f8b85]">AI Persona</div>
                  <div className="mt-1 text-sm font-semibold">学习特征</div>
                </div>
              </div>
              <p className="text-xs leading-6 text-[#66736c]">
                当前处于“{stage}”阶段，偏好“{style}”，主要目标是“{target}”。后续个性化分析会结合这些设置与当前账号的真实学习记录生成。
              </p>
            </PageCard>
          </div>

          <div className="rounded-[22px] border border-[#5f866f]/15 bg-[#e8f4ec] p-5">
            <div className="flex items-start gap-3">
              <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#4e755f]" />
              <div>
                <div className="text-sm font-semibold text-[#315f4b]">隐私与数据隔离</div>
                <p className="mt-2 text-xs leading-6 text-[#5d786a]">
                  系统根据账号名生成不可逆的 Dify 用户 ID，并在会话、引用、画像和分析查询中始终绑定当前登录用户。
                </p>
              </div>
            </div>
          </div>

          <PageCard className="overflow-hidden">
            <div className="px-5 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#748179]">
              账户安全
            </div>
            <div className="border-b border-black/[0.06]">
              <button
                type="button"
                onClick={startQqBinding}
                disabled={qqBinding}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-black/[0.02] disabled:cursor-default disabled:opacity-60"
              >
                <LinkIcon className="h-5 w-5 text-[#12aee2]" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{qqBound ? 'QQ 账号已绑定' : '绑定 QQ 账号'}</span>
                  <span className="mt-1 block text-[10px] text-black/40">{qqBound ? `${qqDisplay}；如 Web/APP 登录不同步，可点右侧更新绑定` : '保留现有学习数据并增加 QQ 登录方式'}</span>
                </span>
                <span className="text-xs text-black/35">{qqBinding ? '授权中…' : qqBound ? '更新绑定' : '去绑定'}</span>
              </button>
              {qqBound && (
                <button
                  type="button"
                  onClick={() => void unbindQq()}
                  disabled={qqBinding}
                  className="flex w-full items-center gap-3 border-t border-black/[0.04] px-5 py-3 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <span className="h-5 w-5" />
                  <span className="flex-1">解绑 QQ 账号</span>
                  <span className="text-red-400">解绑</span>
                </button>
              )}
            </div>
            {!session.username.startsWith('qq_') && (
              <>
                <button
                  type="button"
                  onClick={() => setPasswordOpen(open => !open)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-black/[0.02]"
                >
                  <KeyIcon className="h-5 w-5 text-[var(--studio-accent-strong)]" />
                  <span className="flex-1 text-sm font-semibold">修改登录密码</span>
                  <ChevronRightIcon className={`h-4 w-4 text-black/30 transition ${passwordOpen ? 'rotate-90' : ''}`} />
                </button>
                {passwordOpen && (
                  <form onSubmit={changePassword} className="space-y-3 border-t border-black/[0.06] bg-black/[0.018] p-5">
                    <input name="currentPassword" type="password" required placeholder="当前密码" className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none" />
                    <input name="newPassword" type="password" required placeholder={`新密码：${passwordPolicyHint}`} className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none" />
                    <input name="confirmPassword" type="password" required placeholder="再次输入新密码" className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none" />
                    <button disabled={passwordSaving} className="h-11 w-full rounded-xl bg-[var(--studio-deep)] text-xs font-semibold text-white disabled:opacity-60">
                      {passwordSaving ? '保存中…' : '确认修改密码'}
                    </button>
                  </form>
                )}
              </>
            )}
          </PageCard>

          <PageCard className="overflow-hidden">
            <div className="px-5 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#748179]">
              更多
            </div>
            {nativeApp && (
              <Link href="/app-settings" className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4 transition hover:bg-black/[0.02]">
                <Cog6ToothIcon className="h-5 w-5 text-[var(--studio-accent-strong)]" />
                <span className="flex-1 text-sm font-semibold">App 设置</span>
                <ChevronRightIcon className="h-4 w-4 text-black/30" />
              </Link>
            )}
            <Link href="/analysis" className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4 transition hover:bg-black/[0.02]">
              <ChartBarSquareIcon className="h-5 w-5 text-[var(--studio-accent-strong)]" />
              <span className="flex-1 text-sm font-semibold">个性化学习分析</span>
              <ChevronRightIcon className="h-4 w-4 text-black/30" />
            </Link>
            {isAdmin && (
              <Link href="/admin" className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4 transition hover:bg-black/[0.02]">
                <ShieldCheckIcon className="h-5 w-5 text-[var(--studio-accent-strong)]" />
                <span className="flex-1 text-sm font-semibold">用户管理后台</span>
                <ChevronRightIcon className="h-4 w-4 text-black/30" />
              </Link>
            )}
            <Link href="/about" className="flex items-center gap-3 px-5 py-4 transition hover:bg-black/[0.02]">
              <InformationCircleIcon className="h-5 w-5 text-[var(--studio-accent-strong)]" />
              <span className="flex-1 text-sm font-semibold">关于知行网络学堂</span>
              <ChevronRightIcon className="h-4 w-4 text-black/30" />
            </Link>
            {nativeApp && (
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 border-t border-black/[0.06] px-5 py-4 text-left text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                <span className="flex-1 text-sm font-semibold">{loggingOut ? '正在退出…' : '退出登录'}</span>
              </button>
            )}
            {session.provider !== 'guest'
              ? (
                <button
                  type="button"
                  onClick={() => void deleteAccount()}
                  disabled={deletingAccount}
                  className="flex w-full items-center gap-3 border-t border-black/[0.06] px-5 py-4 text-left text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <TrashIcon className="h-5 w-5" />
                  <span className="flex-1 text-sm font-semibold">{deletingAccount ? '正在注销…' : '注销账号'}</span>
                </button>
              )
              : (
                <div className="border-t border-black/[0.06] px-5 py-4 text-[11px] text-black/35">
                  游客模式不会创建正式账号，无需注销。
                </div>
              )}
          </PageCard>
        </div>
        {detailPanel && (
          <div
            role="presentation"
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 px-3 pb-[calc(14px+env(safe-area-inset-bottom))] pt-[calc(14px+env(safe-area-inset-top))] backdrop-blur-[2px] sm:items-center"
            onClick={() => setDetailPanel(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="max-h-[min(82dvh,720px)] w-full max-w-[560px] overflow-y-auto rounded-[28px] border border-black/10 bg-[var(--studio-surface)] p-5 shadow-[0_30px_90px_rgba(0,0,0,.28)]"
              onClick={event => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#748179]">
                    {detailPanel === 'learner' ? 'Learner profile' : 'Account detail'}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold">
                    {detailPanel === 'learner' ? '学习者画像详情' : '账户信息'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailPanel(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.04] text-black/45 transition hover:bg-black/[0.08]"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              {detailPanel === 'learner'
                ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-2xl bg-[var(--studio-accent)]/20 p-4">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--studio-deep)] text-[var(--studio-accent)]">
                        <SparklesIcon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold">{savedProfile.displayName}</div>
                        <div className="mt-1 text-xs text-black/45">@{session.username}</div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        ['当前阶段', stage],
                        ['偏好风格', style],
                        ['学习目标', target],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-black/[0.06] bg-white/60 p-4">
                          <div className="text-[10px] text-black/40">{label}</div>
                          <div className="mt-1 text-sm font-semibold">{value}</div>
                        </div>
                      ))}
                    </div>
                    <p className="rounded-2xl bg-black/[0.025] p-4 text-xs leading-6 text-[#66736c]">
                      当前处于“{stage}”阶段，偏好“{style}”，主要目标是“{target}”。这些画像只用于当前账号的对话、分析与学习建议，不会混入其他用户数据。
                    </p>
                  </div>
                )
                : (
                  <div className="space-y-3">
                    {[
                      [FingerPrintIcon, 'Dify 用户 ID', session.difyUserId],
                      [CalendarDaysIcon, '加入时间', new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date(joinedAt))],
                      [ShieldCheckIcon, '身份隔离', '已启用'],
                      [LinkIcon, 'QQ 绑定', qqBound ? qqDisplay : '未绑定'],
                    ].map(([Icon, label, value]) => (
                      <div key={label as string} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] bg-white/60 p-4">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f0f2ed] text-[#63736b]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-[#89958f]">{label as string}</div>
                          <div className="mt-0.5 break-all text-xs font-medium">{value as string}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
