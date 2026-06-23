'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AcademicCapIcon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  BellIcon,
  BookOpenIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  CircleStackIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  ShareIcon,
  SparklesIcon,
  UserCircleIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { AppSession } from '@/lib/session'
import { isThemeId, themes, type ThemeId } from '@/lib/themes'
import { resetChatRuntime, useChatRuntime } from '@/app/components/chat/runtime-store'
import { isAdminSession } from '@/lib/admin'
import { isNetworkStudyApp } from '@/lib/native-app'

const navItems = [
  { href: '/chat', label: 'AI 学习助手', shortLabel: '对话', icon: ChatBubbleLeftRightIcon },
  { href: '/library', label: '知识库文档', shortLabel: '文档', icon: CircleStackIcon },
  { href: '/sources', label: '我的文档引用', shortLabel: '引用', icon: BookOpenIcon },
  { href: '/knowledge-graph', label: '知识图谱', shortLabel: '图谱', icon: ShareIcon },
  { href: '/analysis', label: '个性化分析', shortLabel: '分析', icon: ChartBarSquareIcon },
  { href: '/profile', label: '我的画像', shortLabel: '我的', icon: UserCircleIcon },
]
const adminNavItem = { href: '/admin', label: '用户管理', shortLabel: '管理', icon: UsersIcon }

const routeMeta: Record<string, { eyebrow: string, title: string, description: string }> = {
  '/chat': {
    eyebrow: '智能学习空间',
    title: 'AI 学习助手',
    description: '基于课程知识库、学习记忆与技能工具的个性化辅导',
  },
  '/library': {
    eyebrow: '课程知识目录',
    title: '知识库文档',
    description: '浏览当前课程知识库已收录的文档及其索引状态',
  },
  '/sources': {
    eyebrow: '可追溯学习',
    title: '我的文档引用',
    description: '仅展示当前账号对话中实际命中的教材片段',
  },
  '/knowledge-graph': {
    eyebrow: '学习关系网络',
    title: '个人知识图谱',
    description: '把知识点、文档、问题和薄弱环节连成一张可探索的地图',
  },
  '/analysis': {
    eyebrow: 'AI 学情洞察',
    title: '个性化学习分析',
    description: '只根据当前账号的近期学习行为识别进展、卡点与下一步行动',
  },
  '/profile': {
    eyebrow: '学习者档案',
    title: '我的学习画像',
    description: '管理学习阶段、回答偏好、长期目标和界面配色',
  },
  '/about': {
    eyebrow: '产品信息',
    title: '关于',
    description: '了解知行网络学堂的版本、能力与数据保护方式',
  },
  '/app-settings': {
    eyebrow: 'Android 专属',
    title: 'App 设置',
    description: '管理文件下载位置与原生应用行为',
  },
  '/admin': {
    eyebrow: '系统管理',
    title: '用户管理后台',
    description: '查看和维护知行网络学堂用户信息',
  },
}

interface WorkspaceShellProps {
  children: ReactNode
  session: AppSession
}

export default function WorkspaceShell({ children, session }: WorkspaceShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [nativeApp, setNativeApp] = useState(false)
  const [chatDetail, setChatDetail] = useState(false)
  const initialTheme = isThemeId(session.theme) ? session.theme : 'forest'
  const [theme, setTheme] = useState<ThemeId>(initialTheme)
  const chatResponding = useChatRuntime(state => state.isResponding)
  const current = routeMeta[pathname] || routeMeta['/chat']
  const sidebarNavItems = isAdminSession(session) ? [...navItems, adminNavItem] : navItems

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const handleThemeChanged = (event: Event) => {
      const nextTheme = (event as CustomEvent<{ theme?: string }>).detail?.theme
      if (nextTheme && isThemeId(nextTheme))
      { setTheme(nextTheme) }
    }
    globalThis.addEventListener('network-study-theme-changed', handleThemeChanged)
    return () => globalThis.removeEventListener('network-study-theme-changed', handleThemeChanged)
  }, [])

  useEffect(() => {
    const isNative = isNetworkStudyApp()
    setNativeApp(isNative)
    if (!isNative)
    { return }

    document.documentElement.dataset.nativeApp = 'true'
    const handleNativeNavigation = (event: Event) => {
      const href = (event as CustomEvent<{ href?: string }>).detail?.href
      if (!href)
      { return }
      setPendingHref(href)
      router.push(href)
    }
    globalThis.addEventListener('network-study-native-nav', handleNativeNavigation)
    return () => {
      globalThis.removeEventListener('network-study-native-nav', handleNativeNavigation)
      window.NetworkStudyApp?.hideShell()
      delete document.documentElement.dataset.nativeApp
    }
  }, [router])

  useEffect(() => {
    if (nativeApp)
    { window.NetworkStudyApp?.setShellState(pathname, current.title, current.eyebrow) }
  }, [current.eyebrow, current.title, nativeApp, pathname])

  useEffect(() => {
    setPendingHref('')
    if (pathname !== '/chat')
    { setChatDetail(false) }
  }, [pathname])

  useEffect(() => {
    const handleChatDetail = (event: Event) => {
      setChatDetail(Boolean((event as CustomEvent<{ detail?: boolean }>).detail?.detail))
    }
    globalThis.addEventListener('network-study-chat-detail', handleChatDetail)
    return () => globalThis.removeEventListener('network-study-chat-detail', handleChatDetail)
  }, [])

  const logout = async () => {
    resetChatRuntime()
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const changeTheme = async (nextTheme: ThemeId) => {
    const previous = theme
    setTheme(nextTheme)
    setThemeOpen(false)
    const response = await fetch('/api/profile/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: nextTheme }),
    })
    if (!response.ok)
    { setTheme(previous) }
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[var(--studio-sidebar)] text-white">
      <div className="flex h-[84px] items-center gap-3 border-b border-white/10 px-6">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--studio-accent)] text-[var(--studio-deep)] shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
          <AcademicCapIcon className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-wide">知行网络学堂</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-white/45">Network Studio</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">学习空间</div>
        <div className="space-y-1">
          {sidebarNavItems.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                href={item.href}
                key={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setMobileOpen(false)
                  if (pathname !== item.href)
                  { setPendingHref(item.href) }
                }}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all ${
                  active
                    ? 'bg-[var(--studio-accent)] font-semibold text-[var(--studio-deep)] shadow-[0_10px_30px_rgba(0,0,0,0.16)]'
                    : 'text-white/68 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-[var(--studio-deep)]' : 'text-white/48 group-hover:text-white'}`} />
                <span>{item.label}</span>
                {item.href === '/chat' && chatResponding && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-medium">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                    生成中
                  </span>
                )}
                {active && !(item.href === '/chat' && chatResponding) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--studio-deep)]" />}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--studio-warm)] text-[var(--studio-deep)]">
            <SparklesIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold">专属学习数据空间</div>
            <div className="mt-1 text-[11px] leading-4 text-white/45">对话、引用与分析均绑定账号 {session.username}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-t border-white/10 p-3">
        <Link
          href="/profile"
          onClick={() => {
            setMobileOpen(false)
            if (pathname !== '/profile')
            { setPendingHref('/profile') }
          }}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
          title="进入我的画像"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--studio-accent)] font-semibold text-[var(--studio-deep)]">
            {session.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">{session.name}</div>
            <div className="mt-0.5 truncate text-[10px] text-white/38">@{session.username}</div>
          </div>
        </Link>
        <button
          onClick={logout}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/40 transition hover:bg-white/[0.08] hover:text-white"
          title="退出账号"
          aria-label="退出账号"
        >
          <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen h-[100dvh] min-h-0 overflow-hidden bg-[var(--studio-paper)] text-[var(--studio-ink)] lg:min-h-[620px]">
      <aside className="hidden w-[252px] shrink-0 lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-label="关闭菜单" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-[280px] shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white"
              aria-label="关闭菜单"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {pendingHref && (
          <div className="fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden bg-black/5">
            <div className="h-full w-1/2 animate-pulse rounded-r-full bg-[var(--studio-accent-strong)]" />
          </div>
        )}
        <header className={`${nativeApp || pathname === '/chat' ? 'hidden' : 'relative z-30 flex'} h-[58px] shrink-0 items-center gap-3 border-b border-black/[0.07] bg-[var(--studio-surface)]/90 px-3 backdrop-blur-xl sm:h-[68px] sm:gap-4 sm:px-6`}>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-white lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="打开菜单"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--studio-muted)]">{current.eyebrow}</div>
            <div className="mt-1 flex min-w-0 items-baseline gap-3">
              <h1 className="truncate text-lg font-semibold tracking-[-0.025em] sm:text-xl">{current.title}</h1>
              <p className="hidden truncate text-xs text-black/45 xl:block">{current.description}</p>
            </div>
          </div>
          <div className="hidden h-10 w-[240px] items-center gap-2 rounded-xl border border-black/10 bg-white px-3 xl:flex">
            <MagnifyingGlassIcon className="h-4 w-4 text-black/40" />
            <span className="text-xs text-black/35">搜索知识点、文档或会话</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setThemeOpen(open => !open)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white text-black/60"
              aria-label="切换配色"
            >
              <PaintBrushIcon className="h-[18px] w-[18px]" />
            </button>
            {themeOpen && (
              <div className="absolute right-0 top-12 z-40 max-h-[360px] w-48 overflow-y-auto rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
                {themes.map(item => (
                  <button
                    key={item.id}
                    onClick={() => changeTheme(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs transition hover:bg-black/[0.04] ${theme === item.id ? 'font-semibold' : ''}`}
                  >
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: item.swatch }} />
                    {item.name}
                    {theme === item.id && <span className="ml-auto text-[var(--studio-accent-strong)]">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(open => !open)}
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white text-black/60"
              aria-label="通知中心"
              title="通知中心"
            >
              <BellIcon className="h-[18px] w-[18px]" />
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-black/10 bg-[var(--studio-surface)] p-4 shadow-xl">
                <div className="text-sm font-semibold">通知中心</div>
                <div className="mt-4 rounded-xl border border-dashed border-black/10 bg-black/[0.025] px-4 py-8 text-center">
                  <BellIcon className="mx-auto h-6 w-6 text-[var(--studio-muted)]" />
                  <div className="mt-2 text-xs text-[var(--studio-muted)]">暂无新消息</div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className={`min-h-0 flex-1 overflow-auto ${nativeApp || chatDetail ? 'pb-0' : 'pb-[calc(68px+env(safe-area-inset-bottom))] lg:pb-0'}`}>
          {children}
        </main>

        <nav className={`${nativeApp || chatDetail ? 'hidden' : 'fixed inset-x-0 bottom-0 z-40 flex'} h-[calc(68px+env(safe-area-inset-bottom))] items-start justify-around overflow-x-auto border-t border-black/10 bg-[var(--studio-surface)]/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-xl lg:hidden`}>
          {navItems.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (pathname !== item.href)
                  { setPendingHref(item.href) }
                }}
                className={`flex min-w-[53px] flex-col items-center gap-1 text-[10px] font-medium ${active ? 'text-[var(--studio-deep)]' : 'text-black/45'}`}
              >
                <span className={`relative grid h-8 w-10 place-items-center rounded-xl ${active ? 'bg-[var(--studio-accent)]' : ''}`}>
                  <Icon className="h-[18px] w-[18px]" />
                  {item.href === '/chat' && chatResponding && (
                    <span className="absolute ml-7 mt-[-22px] h-2 w-2 animate-pulse rounded-full bg-orange-500 ring-2 ring-[var(--studio-surface)]" />
                  )}
                </span>
                {item.shortLabel}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
