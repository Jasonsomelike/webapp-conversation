'use client'

import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  KeyIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import { securityQuestions } from '@/lib/account-policy'
import { isNetworkStudyApp, type NativeQqLoginResult, type NativeQqResultEnvelope } from '@/lib/native-app'

type Mode = 'login' | 'register' | 'forgot'

const passwordHint = '至少 8 位，同时包含字母和数字'

export default function LoginPanel() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [resetUsername, setResetUsername] = useState('')
  const [nativeApp, setNativeApp] = useState(false)
  const [qqLoading, setQqLoading] = useState(false)
  const qqTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const qqPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qqCompletingRef = useRef(false)

  useEffect(() => {
    router.prefetch('/chat')
    setNativeApp(isNetworkStudyApp())
    const error = new URLSearchParams(globalThis.location.search).get('qq_error')
    if (error)
    { setError(error === 'config' ? 'QQ 登录服务尚未完成配置' : 'QQ 登录失败，请重试') }
  }, [router])

  useEffect(() => {
    const completeNativeQqLogin = async (event: Event) => {
      const detail = (event as CustomEvent<NativeQqLoginResult>).detail
      if (!detail?.accessToken || !detail.openId || detail.purpose === 'bind' || qqCompletingRef.current)
      { return }
      qqCompletingRef.current = true
      window.NetworkStudyApp?.consumePendingQqResult?.()
      if (qqTimeoutRef.current)
      { clearTimeout(qqTimeoutRef.current) }
      if (qqPollRef.current)
      { clearInterval(qqPollRef.current) }
      setQqLoading(true)
      setError('')
      try {
        const response = await fetch('/api/auth/qq/native', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(detail),
        })
        const result = await response.json()
        if (!response.ok)
        { throw new Error(result.error || 'QQ 登录失败') }
        router.replace('/chat')
        router.refresh()
      }
      catch (loginError) {
        setError(loginError instanceof Error ? loginError.message : 'QQ 登录失败，请重试')
      }
      finally {
        setQqLoading(false)
        qqCompletingRef.current = false
      }
    }
    const failNativeQqLogin = (event: Event) => {
      if (qqTimeoutRef.current)
      { clearTimeout(qqTimeoutRef.current) }
      if (qqPollRef.current)
      { clearInterval(qqPollRef.current) }
      window.NetworkStudyApp?.consumePendingQqResult?.()
      const message = (event as CustomEvent<{ message?: string }>).detail?.message
      setError(message || 'QQ 登录已取消或失败')
      setQqLoading(false)
    }
    globalThis.addEventListener('network-study-qq-login', completeNativeQqLogin)
    globalThis.addEventListener('network-study-qq-login-error', failNativeQqLogin)
    return () => {
      if (qqTimeoutRef.current)
      { clearTimeout(qqTimeoutRef.current) }
      if (qqPollRef.current)
      { clearInterval(qqPollRef.current) }
      globalThis.removeEventListener('network-study-qq-login', completeNativeQqLogin)
      globalThis.removeEventListener('network-study-qq-login-error', failNativeQqLogin)
    }
  }, [router])

  const startNativeQqLogin = () => {
    setError('')
    const bridge = window.NetworkStudyApp
    if (!bridge?.loginWithQQ) {
      setError('QQ 原生登录组件尚未就绪，请完全退出 App 后重新打开')
      return
    }
    try {
      setQqLoading(true)
      bridge.loginWithQQ()
      qqPollRef.current = setInterval(() => {
        try {
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
          // The SDK may still be switching back to the WebView. Keep polling.
        }
      }, 450)
      qqTimeoutRef.current = setTimeout(() => {
        if (qqPollRef.current)
        { clearInterval(qqPollRef.current) }
        setQqLoading(false)
        const nativeStatus = bridge.getQqLoginStatus?.()
        setError(`QQ 登录响应超时${nativeStatus ? `（原生阶段：${nativeStatus}）` : ''}，请重试`)
      }, 60_000)
    }
    catch {
      setQqLoading(false)
      setError('无法启动 QQ 登录，请更新 App 后重试')
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())

    if (mode === 'register' && payload.password !== payload.confirmPassword) {
      setError('两次输入的密码不一致')
      setLoading(false)
      return
    }

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login'
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (response.ok) {
      router.replace('/chat')
      router.refresh()
    }
    else
    { setError(result.error || '操作失败，请稍后重试') }
    setLoading(false)
  }

  const findSecurityQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const username = String(new FormData(event.currentTarget).get('username') || '')
    const response = await fetch(`/api/auth/security-question?username=${encodeURIComponent(username)}`)
    const result = await response.json()
    if (response.ok) {
      setResetUsername(username)
      setSecurityQuestion(result.securityQuestion)
    }
    else {
      setError(result.error || '未找到该账号')
    }
    setLoading(false)
  }

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries())
    if (payload.password !== payload.confirmPassword) {
      setError('两次输入的密码不一致')
      setLoading(false)
      return
    }
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, username: resetUsername }),
    })
    const result = await response.json()
    if (response.ok) {
      setMode('login')
      setSecurityQuestion('')
      setNotice('密码已重置，请使用新密码登录')
    }
    else {
      setError(result.error || '密码重置失败')
    }
    setLoading(false)
  }

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setError('')
    setNotice('')
    setSecurityQuestion('')
  }

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden ${nativeApp ? 'bg-[var(--studio-surface)] px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(26px,env(safe-area-inset-top))] text-[var(--studio-ink)]' : 'overflow-hidden bg-[var(--studio-deep)] px-5 py-8 text-white'}`}
      data-theme="forest"
      data-native-login={nativeApp ? 'true' : 'false'}
    >
      {!nativeApp && <div className="pointer-events-none absolute -left-24 top-[-80px] h-[360px] w-[360px] rounded-full bg-[var(--studio-accent)]/10 blur-3xl" />}
      {!nativeApp && <div className="pointer-events-none absolute -bottom-44 right-[-70px] h-[480px] w-[480px] rounded-full bg-[#f69c63]/10 blur-3xl" />}

      <div className={`relative mx-auto grid ${nativeApp ? 'min-h-[calc(100dvh-50px)] max-w-[480px] bg-[var(--studio-surface)]' : 'min-h-[calc(100vh-64px)] max-w-[1180px] overflow-hidden rounded-[32px] border border-white/10 bg-[var(--studio-sidebar)] shadow-[0_30px_100px_rgba(0,0,0,.32)] lg:grid-cols-[1.04fr_.96fr]'}`}>
        <div className="relative hidden overflow-hidden border-r border-white/10 p-12 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--studio-accent)] text-[var(--studio-deep)]">
              <SparklesIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold tracking-wide">知行网络学堂</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Network Study Copilot</div>
            </div>
          </div>

          <div className="my-auto max-w-[520px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/75">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--studio-accent)]" />
              由 Dify 知识库与学习记忆驱动
            </div>
            <h1 className="text-[50px] font-semibold leading-[1.08] tracking-[-0.045em]">
              把每一次提问，
              <br />
              变成<span className="text-[var(--studio-accent)]">可积累的学习。</span>
            </h1>
            <p className="mt-6 max-w-[470px] text-[15px] leading-7 text-white/55">
              对话、教材引用、知识图谱与个性化分析汇聚在同一个空间，并严格按照当前账号隔离学习数据。
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                ['精确引用', '回到教材原页'],
                ['账号隔离', '只分析你的数据'],
                ['长期积累', '跨会话持续追踪'],
              ].map(([title, description], index) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="mb-3 text-[11px] font-semibold text-[var(--studio-accent)]">0{index + 1}</div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="mt-1.5 text-[11px] leading-4 text-white/38">{description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-white/32">
            <LockClosedIcon className="h-3.5 w-3.5" />
            Dify API Key 仅保存在服务端，不进入浏览器
          </div>
        </div>

        <div className={`flex justify-center bg-[var(--studio-surface)] text-[var(--studio-ink)] ${nativeApp ? 'items-start py-2' : 'items-center px-6 py-10 sm:px-12'}`}>
          <div className="w-full max-w-[430px]">
            <div className={`${nativeApp ? 'mb-8' : 'mb-7'} lg:hidden`}>
              <div className="inline-flex items-center gap-3">
                <div className={`${nativeApp ? 'h-12 w-12 rounded-[18px]' : 'h-10 w-10 rounded-2xl'} grid place-items-center bg-[var(--studio-deep)] text-[var(--studio-accent)]`}>
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">知行网络学堂</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#789087]">Network Studio</div>
                </div>
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className={`${nativeApp ? 'mb-5' : 'mb-7'} grid grid-cols-2 rounded-2xl bg-black/[0.045] p-1`}>
                {(['login', 'register'] as Mode[]).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => switchMode(item)}
                    className={`h-10 rounded-xl text-sm font-semibold transition ${
                      mode === item ? 'bg-white shadow-sm' : 'text-black/45'
                    }`}
                  >
                    {item === 'login' ? '账号登录' : '注册账号'}
                  </button>
                ))}
              </div>
            )}

            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--studio-muted)]">
              {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : 'Account recovery'}
            </div>
            <h2 className={`mt-3 font-semibold tracking-[-0.035em] ${nativeApp ? 'text-[30px] leading-10' : 'text-3xl'}`}>
              {mode === 'login' ? '登录你的学习空间' : mode === 'register' ? '创建独立学习账号' : '通过安全问题重置密码'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#718078]">
              {mode === 'register'
                ? '账号名将生成稳定且不可逆的 Dify 用户标识。'
                : mode === 'forgot'
                  ? '回答注册时设置的安全问题，即可设置新密码。'
                  : '登录后只会读取和分析当前账号的会话与引用。'}
            </p>

            {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
            {notice && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{notice}</div>}

            {mode === 'forgot'
              ? (
                securityQuestion
                  ? (
                    <form onSubmit={resetPassword} className={`${nativeApp ? 'mt-5 space-y-3.5' : 'mt-7 space-y-4'}`}>
                      <div className="rounded-xl bg-black/[0.04] px-4 py-3 text-sm">
                        <div className="text-[10px] text-black/45">安全问题</div>
                        <div className="mt-1 font-medium">{securityQuestion}</div>
                      </div>
                      <Field name="securityAnswer" label="安全问题答案" placeholder="请输入答案" />
                      <Field name="password" label="新密码" type="password" placeholder={passwordHint} />
                      <Field name="confirmPassword" label="确认新密码" type="password" placeholder="再次输入新密码" />
                      <SubmitButton loading={loading} label="重置密码" icon={KeyIcon} />
                    </form>
                  )
                  : (
                    <form onSubmit={findSecurityQuestion} className={`${nativeApp ? 'mt-5 space-y-3.5' : 'mt-7 space-y-4'}`}>
                      <Field name="username" label="账号名" placeholder="请输入注册账号" />
                      <SubmitButton loading={loading} label="下一步" icon={ArrowRightIcon} />
                    </form>
                  )
              )
              : (
                <form onSubmit={submit} className={`${nativeApp ? 'mt-5 space-y-3.5' : 'mt-7 space-y-4'}`}>
                  {mode === 'register' && <Field name="displayName" label="显示名称" placeholder="例如：小林" />}
                  <Field name="username" label="账号名" placeholder="以字母开头，3–32 位" autoComplete="username" />
                  <Field
                    name="password"
                    label="密码"
                    type="password"
                    placeholder={passwordHint}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  />
                  {mode === 'register' && (
                    <>
                      <Field name="confirmPassword" label="确认密码" type="password" placeholder="再次输入密码" autoComplete="new-password" />
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold">安全问题</span>
                        <select name="securityQuestion" required className="h-12 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-[var(--studio-deep)]/40">
                          {securityQuestions.map(question => <option key={question}>{question}</option>)}
                        </select>
                      </label>
                      <Field name="securityAnswer" label="安全问题答案" placeholder="请牢记该答案，用于找回密码" />
                    </>
                  )}
                  <SubmitButton loading={loading} label={mode === 'login' ? '登录' : '注册并进入'} icon={mode === 'login' ? ArrowRightIcon : UserPlusIcon} />
                </form>
              )}

            <div className="mt-5 flex items-center justify-between text-xs">
              {mode === 'forgot'
                ? (
                  <button type="button" onClick={() => switchMode('login')} className="inline-flex items-center gap-1.5 text-[#526159]">
                    <ArrowLeftIcon className="h-3.5 w-3.5" /> 返回登录
                  </button>
                )
                : (
                  <button type="button" onClick={() => switchMode('forgot')} className="text-[#526159] hover:text-black">
                    忘记密码？
                  </button>
                )}
            </div>

            {mode === 'login' && (
              <div className="mt-7">
                <div className="mb-4 flex items-center gap-3 text-[11px] text-black/35">
                  <span className="h-px flex-1 bg-black/10" />
                  其他登录方式
                  <span className="h-px flex-1 bg-black/10" />
                </div>
                {nativeApp
                  ? (
                    <button
                      type="button"
                      disabled={qqLoading}
                      onClick={startNativeQqLogin}
                      className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#12b7f5] text-sm font-semibold text-white shadow-[0_12px_30px_rgba(18,183,245,.22)] transition active:scale-[.99] disabled:opacity-55"
                    >
                      <img src="/qq-login-icon.png" alt="" className="h-6 w-6 rounded" />
                      {qqLoading ? '正在打开 QQ…' : '使用 QQ 安全登录'}
                    </button>
                  )
                  : (
                    <a
                      href="/api/auth/qq/web/start"
                      className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#12b7f5]/25 bg-[#12b7f5]/[0.08] text-sm font-semibold text-[#087ca7] transition hover:bg-[#12b7f5]/[0.13]"
                    >
                      <img src="/qq-login-icon.png" alt="" className="h-6 w-6 rounded" />
                      使用 QQ 登录
                    </a>
                  )}
              </div>
            )}

            {!nativeApp && <div className="mt-8 space-y-3">
              {[
                '密码采用加盐哈希保存，服务端不会存储明文',
                '连续登录失败会触发临时账号锁定',
                '安全问题仅用于当前账号的密码重置',
              ].map(item => (
                <div key={item} className="flex items-center gap-2.5 text-xs text-[#6d7b74]">
                  <CheckCircleIcon className="h-4 w-4 text-[var(--studio-accent-strong)]" />
                  {item}
                </div>
              ))}
            </div>}

            <div className={`${nativeApp ? 'mt-5' : 'mt-8'} flex items-center justify-center gap-2 text-[10px] text-[#9da59f]`}>
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              QQ 凭证仅用于身份校验，App Key 只保存在服务端
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  name,
  label,
  type = 'text',
  placeholder,
  autoComplete,
}: {
  name: string
  label: string
  type?: string
  placeholder: string
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold">{label}</span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-12 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition placeholder:text-black/25 focus:border-[var(--studio-deep)]/40 focus:ring-4 focus:ring-black/[0.035]"
      />
    </label>
  )
}

function SubmitButton({
  loading,
  label,
  icon: Icon,
}: {
  loading: boolean
  label: string
  icon: typeof ArrowRightIcon
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--studio-deep)] px-5 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(23,52,43,.16)] transition hover:-translate-y-0.5 disabled:opacity-60"
    >
      {loading ? '处理中…' : label}
      {!loading && <Icon className="h-4 w-4" />}
    </button>
  )
}
