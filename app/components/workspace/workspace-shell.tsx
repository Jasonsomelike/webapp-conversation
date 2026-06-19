'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
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
  MagnifyingGlassIcon,
  ShareIcon,
  SparklesIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { AppSession } from '@/lib/session'

const navItems = [
  { href: '/chat', label: 'AI 学习助手', shortLabel: '对话', icon: ChatBubbleLeftRightIcon },
  { href: '/sources', label: '文档引用', shortLabel: '引用', icon: BookOpenIcon },
  { href: '/knowledge-graph', label: '知识图谱', shortLabel: '图谱', icon: ShareIcon },
  { href: '/analysis', label: '个性化分析', shortLabel: '分析', icon: ChartBarSquareIcon },
  { href: '/profile', label: '我的画像', shortLabel: '我的', icon: UserCircleIcon },
]

const routeMeta: Record<string, { eyebrow: string, title: string, description: string }> = {
  '/chat': {
    eyebrow: '智能学习空间',
    title: 'AI 学习助手',
    description: '基于课程知识库、学习记忆与技能工具的个性化辅导',
  },
  '/sources': {
    eyebrow: '可追溯学习',
    title: '知识库文档引用',
    description: '回到原始教材，核对每一条回答背后的文档、页码与上下文',
  },
  '/knowledge-graph': {
    eyebrow: '学习关系网络',
    title: '个人知识图谱',
    description: '把知识点、文档、问题和薄弱环节连成一张可探索的地图',
  },
  '/analysis': {
    eyebrow: 'AI 学情洞察',
    title: '个性化学习分析',
    description: '从近期学习行为中识别进展、卡点与下一步行动',
  },
  '/profile': {
    eyebrow: '学习者档案',
    title: '我的学习画像',
    description: '管理学习阶段、回答偏好和长期目标',
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
  const current = routeMeta[pathname] || routeMeta['/chat']

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[#12221e] text-white">
      <div className="flex h-[84px] items-center gap-3 border-b border-white/10 px-6">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dff67a] text-[#12221e] shadow-[0_8px_24px_rgba(223,246,122,0.18)]">
          <AcademicCapIcon className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-wide">知行网络学堂</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-white/45">Network Studio</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6">
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">学习空间</div>
        <div className="space-y-1.5">
          {navItems.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                href={item.href}
                key={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-all ${
                  active
                    ? 'bg-[#dff67a] font-semibold text-[#12221e] shadow-[0_10px_30px_rgba(0,0,0,0.16)]'
                    : 'text-white/68 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-[#12221e]' : 'text-white/48 group-hover:text-white'}`} />
                <span>{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#12221e]" />}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#ffb86b] text-[#12221e]">
            <SparklesIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold">本周学习连续 5 天</div>
            <div className="mt-1 text-[11px] leading-4 text-white/45">再完成 2 次练习，点亮网络层徽章</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[72%] rounded-full bg-[#dff67a]" />
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
        >
          {session.avatar
            ? <img src={session.avatar} alt="" className="h-9 w-9 rounded-xl object-cover" />
            : (
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eff5e9] font-semibold text-[#17342b]">
                {session.name.slice(0, 1)}
              </div>
            )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">{session.name}</div>
            <div className="mt-0.5 truncate text-[10px] text-white/38">{session.provider === 'wechat' ? '微信已连接' : '演示账户'}</div>
          </div>
          <ArrowRightStartOnRectangleIcon className="h-4 w-4 text-white/35" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen min-h-[620px] overflow-hidden bg-[#f3f1eb] text-[#18231f]">
      <aside className="hidden w-[252px] shrink-0 lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-[#07110e]/55 backdrop-blur-sm" aria-label="关闭菜单" onClick={() => setMobileOpen(false)} />
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
        <header className="flex h-[84px] shrink-0 items-center gap-4 border-b border-[#1b2d26]/[0.07] bg-[#faf9f5]/90 px-4 backdrop-blur-xl sm:px-7">
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#183129]/10 bg-white lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="打开菜单"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#668074]">{current.eyebrow}</div>
            <div className="mt-1 flex min-w-0 items-baseline gap-3">
              <h1 className="truncate text-xl font-semibold tracking-[-0.025em] text-[#15241f]">{current.title}</h1>
              <p className="hidden truncate text-xs text-[#728078] xl:block">{current.description}</p>
            </div>
          </div>
          <div className="hidden h-10 w-[240px] items-center gap-2 rounded-xl border border-[#183129]/10 bg-white px-3 xl:flex">
            <MagnifyingGlassIcon className="h-4 w-4 text-[#839089]" />
            <span className="text-xs text-[#9aa39e]">搜索知识点、文档或会话</span>
            <kbd className="ml-auto rounded-md bg-[#f0f1ed] px-1.5 py-0.5 text-[10px] text-[#89918d]">⌘ K</kbd>
          </div>
          <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#183129]/10 bg-white text-[#4e6158]">
            <BellIcon className="h-[18px] w-[18px]" />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#f17b50] ring-2 ring-white" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-auto pb-[72px] lg:pb-0">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] items-center justify-around border-t border-[#17342b]/10 bg-[#faf9f5]/95 px-2 backdrop-blur-xl lg:hidden">
          {navItems.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-[54px] flex-col items-center gap-1 text-[10px] font-medium ${active ? 'text-[#17342b]' : 'text-[#7b8982]'}`}
              >
                <span className={`grid h-8 w-11 place-items-center rounded-xl ${active ? 'bg-[#dff67a]' : ''}`}>
                  <Icon className="h-[19px] w-[19px]" />
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
