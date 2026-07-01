'use client'

import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CircleStackIcon,
  CursorArrowRaysIcon,
  DocumentTextIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

gsap.registerPlugin(useGSAP)

const forestThemeVars = {
  '--studio-ink': '#18231f',
  '--studio-deep': '#12221e',
  '--studio-sidebar': '#12221e',
  '--studio-paper': '#f3f1eb',
  '--studio-surface': '#faf9f5',
  '--studio-chat-surface': '#faf9f5',
  '--studio-accent': '#dff67a',
  '--studio-accent-strong': '#47705e',
  '--studio-muted': '#668074',
  '--studio-warm': '#ffb86b',
} as CSSProperties

const flowSteps = [
  {
    title: '登录或游客体验',
    description: '账号登录会保存长期画像、引用和知识图谱；游客模式可先体验对话与知识库文档。',
    icon: UserCircleIcon,
  },
  {
    title: '提问 / 上传资料',
    description: '输入问题，也可以上传图片、PDF、DOCX、TXT 等学习材料，让 Agent 结合上下文处理。',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    title: '验证引用证据',
    description: '回答中的来源、引用页和 PDF 预览会帮你回到教材原页，确认每一步依据。',
    icon: BookOpenIcon,
  },
  {
    title: '沉淀学习资产',
    description: '会话、引用、画像和图谱会按账号隔离，逐渐形成属于你的计网学习轨迹。',
    icon: ShareIcon,
  },
]

const featureCards = [
  {
    title: 'AI 学习助手',
    description: '讲概念、拆题、生成练习、分析上传材料，并在输出中保留更清晰的工作流与深度思考结构。',
    icon: SparklesIcon,
  },
  {
    title: '知识库文档',
    description: '查看课程知识库已收录的文档，服务端定时同步；需要时可手动刷新最新状态。',
    icon: CircleStackIcon,
  },
  {
    title: '我的文档引用',
    description: '只展示当前账号真实命中过的资料，点击片段可进入 PDF 原文定位，不混入别人的数据。',
    icon: DocumentTextIcon,
  },
  {
    title: '个人知识图谱',
    description: '把问题、知识点、文档、薄弱项与推荐路径串成可拖动缩放的图谱，适合复盘。',
    icon: Squares2X2Icon,
  },
  {
    title: '个性化分析',
    description: '根据近期学习记录总结掌握状态、卡点和下一步行动，避免只聊天不沉淀。',
    icon: MagnifyingGlassIcon,
  },
  {
    title: '分享与下载',
    description: '可选择指定消息生成只读分享链接；生成文件、知识库文档和 App 资源走受控下载链路。',
    icon: ArrowDownTrayIcon,
  },
]

const bestPractices = [
  '先描述你卡住的现象，再补充你已经尝试过的思路。',
  '需要教材依据时，明确要求“请标明引用来源并定位 PDF 页”。',
  '上传图片题目后，可以继续追问“换一种方法讲”或“生成相似练习”。',
  '学习完一个主题后，到图谱页查看薄弱节点，再开启今日任务。',
  '分享对话前只勾选必要消息，避免把无关草稿也公开出去。',
]

const faqs = [
  ['游客模式能做什么？', '游客可以体验 AI 对话和知识库文档；引用、画像、图谱、长期记忆需要登录后按账号保存。'],
  ['为什么强调引用？', '计网概念容易“听懂但不扎实”。引用能把回答拉回教材和课件证据，方便复盘与纠错。'],
  ['我的数据会和别人混在一起吗？', '不会。会话、引用、画像、图谱和分享校验都绑定当前账号或分享 token。'],
  ['Android App 和网页有什么区别？', 'App 更偏移动端：文件选择、下载中心、返回栈和图片预览会尽量贴近 Android 使用习惯。'],
]

export default function UsageGuide() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousTheme = document.documentElement.dataset.theme
    document.documentElement.dataset.theme = 'forest'
    return () => {
      document.documentElement.dataset.theme = previousTheme || 'forest'
    }
  }, [])

  const { contextSafe } = useGSAP(() => {
    const root = rootRef.current
    if (!root)
    { return }

    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const compactMotion = globalThis.matchMedia?.('(max-width: 640px)').matches
    if (reduceMotion) {
      gsap.set(root.querySelectorAll('[data-guide-animate]'), {
        autoAlpha: 1,
        clearProps: 'filter,transform,opacity,visibility',
      })
      return
    }

    const timeline = gsap.timeline({
      defaults: {
        ease: 'power3.out',
        overwrite: 'auto',
      },
    })

    gsap.set(root.querySelectorAll('[data-guide-card]'), { transformOrigin: '50% 70%' })
    gsap.set(root.querySelector('[data-guide-line]'), { transformOrigin: '0% 50%' })

    if (compactMotion) {
      timeline
        .fromTo(
          root.querySelectorAll('[data-guide-kicker], [data-guide-title], [data-guide-copy], [data-guide-cta], [data-guide-console]'),
          { y: 12, scale: 0.992, filter: 'blur(3px)' },
          {
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.38,
            stagger: 0.035,
            clearProps: 'filter,transform',
          },
        )
        .fromTo(
          root.querySelectorAll('[data-guide-orb]'),
          { autoAlpha: 0.35, scale: 0.82, rotation: -8 },
          {
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            duration: 0.52,
            stagger: 0.04,
          },
          0,
        )
    }
    else {
      timeline
        .fromTo(
          root.querySelectorAll('[data-guide-orb]'),
          { autoAlpha: 0, scale: 0.28, rotation: -18 },
          {
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            duration: 0.95,
            stagger: 0.08,
          },
        )
        .fromTo(
          root.querySelectorAll('[data-guide-kicker], [data-guide-title], [data-guide-copy], [data-guide-cta]'),
          { autoAlpha: 0, y: 24, scale: 0.98, filter: 'blur(12px)' },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.64,
            stagger: 0.08,
            clearProps: 'filter,transform,opacity,visibility',
          },
          '-=0.62',
        )
        .fromTo(
          root.querySelector('[data-guide-console]'),
          { autoAlpha: 0, y: 34, scale: 0.94, rotationY: -8, filter: 'blur(10px)' },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotationY: 0,
            filter: 'blur(0px)',
            duration: 0.72,
            ease: 'back.out(1.35)',
            clearProps: 'filter,transform,opacity,visibility',
          },
          '-=0.38',
        )
    }

    timeline
      .fromTo(
        root.querySelector('[data-guide-line]'),
        { autoAlpha: 0, scaleX: 0 },
        {
          autoAlpha: 1,
          scaleX: 1,
          duration: 0.78,
          ease: 'power2.inOut',
          clearProps: 'opacity,visibility,transform',
        },
        '-=0.22',
      )
      .fromTo(
        root.querySelectorAll('[data-guide-step]'),
        { autoAlpha: 0, y: 34, scale: 0.88, rotationX: -16 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotationX: 0,
          duration: 0.58,
          stagger: {
            amount: 0.36,
            from: 'center',
          },
          ease: 'back.out(1.45)',
          clearProps: 'filter,transform,opacity,visibility',
        },
        '-=0.34',
      )
      .fromTo(
        root.querySelectorAll('[data-guide-feature]'),
        { autoAlpha: 0, y: 26, scale: 0.94 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.45,
          stagger: {
            amount: 0.34,
            from: 'random',
          },
          clearProps: 'transform,opacity,visibility',
        },
        '-=0.18',
      )
      .fromTo(
        root.querySelectorAll('[data-guide-extra]'),
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.42,
          stagger: 0.04,
          clearProps: 'transform,opacity,visibility',
        },
        '-=0.1',
      )

    gsap.to(root.querySelectorAll('[data-guide-float]'), {
      y: index => (index % 2 === 0 ? -14 : 12),
      x: index => (index % 3 === 0 ? 10 : -8),
      rotation: index => (index % 2 === 0 ? 6 : -5),
      duration: 3.8,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      stagger: 0.2,
    })

    gsap.to(root.querySelectorAll('[data-guide-pulse]'), {
      scale: 1.08,
      autoAlpha: 0.55,
      duration: 1.25,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      stagger: 0.22,
    })
  }, { scope: rootRef })

  const handleCardMove = contextSafe((event: React.PointerEvent<HTMLElement>) => {
    const card = event.currentTarget
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    { return }
    const rect = card.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    gsap.to(card, {
      rotationY: px * 4,
      rotationX: -py * 4,
      y: -3,
      duration: 0.22,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  })

  const handleCardLeave = contextSafe((event: React.PointerEvent<HTMLElement>) => {
    gsap.to(event.currentTarget, {
      rotationY: 0,
      rotationX: 0,
      y: 0,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform',
    })
  })

  return (
    <main
      ref={rootRef}
      className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(223,246,122,.34),transparent_32%),radial-gradient(circle_at_85%_18%,rgba(255,184,107,.14),transparent_28%),linear-gradient(135deg,var(--studio-paper),var(--studio-surface)_48%,#edf3e7)] px-5 py-8 text-[var(--studio-ink)] sm:px-8 lg:px-10"
      style={forestThemeVars}
      data-theme="forest"
    >
      <div data-guide-orb data-guide-float className="pointer-events-none absolute -left-28 top-8 h-80 w-80 rounded-full bg-[var(--studio-accent)]/32 blur-3xl" />
      <div data-guide-orb data-guide-float className="pointer-events-none absolute right-[-90px] top-36 h-96 w-96 rounded-full bg-[var(--studio-warm)]/16 blur-3xl" />
      <div data-guide-orb data-guide-float className="pointer-events-none absolute bottom-[-150px] left-[25%] h-[440px] w-[440px] rounded-full bg-[#b7dfc3]/28 blur-3xl" />
      <div data-guide-pulse className="pointer-events-none absolute right-[18%] top-[18%] h-3 w-3 rounded-full bg-[var(--studio-accent-strong)]" />
      <div data-guide-pulse className="pointer-events-none absolute left-[10%] top-[58%] h-2.5 w-2.5 rounded-full bg-[var(--studio-warm)]" />

      <section data-guide-animate className="relative mx-auto max-w-6xl pt-5 sm:pt-10">
        <div data-guide-kicker className="inline-flex items-center gap-2 rounded-full border border-[var(--studio-deep)]/10 bg-white/60 px-3 py-1.5 text-xs font-semibold text-[var(--studio-accent-strong)] shadow-sm backdrop-blur">
          <SparklesIcon className="h-4 w-4" />
          使用说明 · Forest guide mode
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.06fr_.94fr] lg:items-end">
          <div>
            <h1 data-guide-title className="max-w-3xl text-[44px] font-semibold leading-[1.04] tracking-[-0.065em] sm:text-[64px]">
              从一次提问开始，
              <span className="block text-[var(--studio-accent-strong)]">把计网学习变成资产。</span>
            </h1>
            <p data-guide-copy className="mt-6 max-w-2xl text-sm leading-7 text-[var(--studio-muted)] sm:text-base">
              这里不是单纯的聊天框：它会把 Dify Chatflow、课程知识库、PDF 来源定位、长期记忆、个人画像与知识图谱串起来。你提出问题，系统负责记录证据、沉淀进展，并帮你找到下一步。
            </p>
            <div data-guide-cta className="mt-7 flex flex-wrap gap-3">
              <Link href="/chat" className="inline-flex items-center gap-2 rounded-2xl bg-[var(--studio-deep)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_color-mix(in_srgb,var(--studio-deep)_18%,transparent)] transition hover:-translate-y-0.5">
                进入学习助手
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl border border-[var(--studio-deep)]/10 bg-white/72 px-5 py-3 text-sm font-semibold text-[var(--studio-deep)] shadow-sm backdrop-blur transition hover:-translate-y-0.5">
                返回登录
              </Link>
            </div>
          </div>

          <div data-guide-console data-guide-animate className="relative rounded-[34px] border border-white/70 bg-white/58 p-5 shadow-[0_28px_90px_color-mix(in_srgb,var(--studio-deep)_12%,transparent)] backdrop-blur-xl">
            <div data-guide-float className="absolute -right-4 -top-4 grid h-16 w-16 place-items-center rounded-3xl bg-[var(--studio-accent)] text-[var(--studio-deep)] shadow-lg">
              <CursorArrowRaysIcon className="h-8 w-8" />
            </div>
            <div className="rounded-[26px] bg-[var(--studio-deep)] p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--studio-accent)]">Learning pipeline</div>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/55">live</span>
              </div>
              <div className="mt-5 space-y-3">
                {['提问 / 上传资料', 'Agent 检索知识库', '回答并标记引用', '沉淀画像和图谱'].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--studio-accent)] text-xs font-bold text-[var(--studio-deep)]">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{item}</div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[var(--studio-accent)]" style={{ width: `${36 + index * 18}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-xs leading-6 text-white/58">
                小技巧：如果你想让回答更可验证，可以在问题后面加一句“请结合知识库并标明引用来源”。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-12 max-w-6xl">
        <div data-guide-line className="pointer-events-none absolute left-[10%] right-[10%] top-[35px] hidden h-px bg-gradient-to-r from-transparent via-[var(--studio-accent-strong)]/35 to-transparent md:block" />
        <div className="grid gap-4 md:grid-cols-4">
          {flowSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <article
                key={step.title}
                data-guide-step
                data-guide-card
                data-guide-animate
                onPointerMove={handleCardMove}
                onPointerLeave={handleCardLeave}
                className="relative overflow-hidden rounded-[28px] border border-black/[0.06] bg-white/75 p-5 shadow-[0_16px_48px_color-mix(in_srgb,var(--studio-deep)_8%,transparent)] backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--studio-accent)]/70 text-[var(--studio-accent-strong)] shadow-inner">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-[var(--studio-muted)]">0{index + 1}</span>
                </div>
                <h2 className="mt-5 text-base font-semibold">{step.title}</h2>
                <p className="mt-2 text-xs leading-6 text-[var(--studio-muted)]">{step.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="relative mx-auto mt-10 max-w-6xl rounded-[34px] border border-black/[0.06] bg-[var(--studio-deep)] p-5 text-white shadow-[0_28px_80px_color-mix(in_srgb,var(--studio-deep)_16%,transparent)] sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--studio-accent)]">
              <CircleStackIcon className="h-4 w-4" />
              功能地图
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">常用入口怎么配合？</h2>
          </div>
          <p className="max-w-xl text-xs leading-6 text-white/55">
            建议顺序是：先在对话里形成问题，再去引用页验证证据，最后用分析和图谱做复盘。
          </p>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                data-guide-feature
                data-guide-card
                data-guide-animate
                onPointerMove={handleCardMove}
                onPointerLeave={handleCardLeave}
                className="rounded-2xl border border-white/10 bg-white/[0.07] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--studio-accent)] text-[var(--studio-deep)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold text-[var(--studio-accent)]">{feature.title}</div>
                </div>
                <p className="mt-3 text-xs leading-6 text-white/58">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="relative mx-auto mt-10 grid max-w-6xl gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <div data-guide-extra data-guide-animate className="rounded-[30px] border border-black/[0.06] bg-white/78 p-5 shadow-[0_18px_60px_color-mix(in_srgb,var(--studio-deep)_8%,transparent)] backdrop-blur sm:p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--studio-accent)]/35 px-3 py-1.5 text-[11px] font-semibold text-[var(--studio-accent-strong)]">
            <CheckCircleIcon className="h-4 w-4" />
            推荐用法
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-[-0.04em]">让 Agent 更懂你的 5 个姿势</h2>
          <div className="mt-5 space-y-3">
            {bestPractices.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-black/[0.025] p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[var(--studio-deep)] text-[11px] font-bold text-[var(--studio-accent)]">
                  {index + 1}
                </span>
                <p className="text-xs leading-6 text-[var(--studio-muted)]">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {faqs.map(([question, answer]) => (
            <div key={question} data-guide-extra data-guide-animate className="rounded-[26px] border border-black/[0.06] bg-white/72 p-5 shadow-[0_16px_48px_color-mix(in_srgb,var(--studio-deep)_7%,transparent)] backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ArrowPathIcon className="h-4 w-4 text-[var(--studio-accent-strong)]" />
                {question}
              </div>
              <p className="mt-3 text-xs leading-6 text-[var(--studio-muted)]">{answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section data-guide-extra data-guide-animate className="relative mx-auto mt-10 max-w-6xl overflow-hidden rounded-[34px] border border-black/[0.06] bg-white/72 p-5 shadow-[0_22px_70px_color-mix(in_srgb,var(--studio-deep)_10%,transparent)] backdrop-blur sm:p-7">
        <div className="absolute right-6 top-6 hidden h-24 w-24 rounded-full bg-[var(--studio-accent)]/28 blur-2xl sm:block" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--studio-deep)] px-3 py-1.5 text-[11px] font-semibold text-[var(--studio-accent)]">
              <LockClosedIcon className="h-4 w-4" />
              数据边界
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.045em]">只分析当前账号的数据。</h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-[var(--studio-muted)]">
              文档引用、画像、图谱、记忆和会话分享都按当前用户或分享 token 做边界。你看到的是自己的学习路径，不是全站混合样本。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/library" className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-[var(--studio-deep)]">
              看知识库
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/chat" className="inline-flex items-center gap-2 rounded-2xl bg-[var(--studio-deep)] px-4 py-2.5 text-xs font-semibold text-white">
              开始提问
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
