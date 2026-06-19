'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
  QrCodeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

export default function LoginPanel() {
  const params = useSearchParams()
  const [loading, setLoading] = useState(false)
  const error = params.get('error')

  const demoLogin = async () => {
    setLoading(true)
    const response = await fetch('/api/auth/demo', { method: 'POST' })
    if (response.ok)
    { globalThis.location.href = '/chat' }
    else
    { setLoading(false) }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#12221e] px-5 py-8 text-white">
      <div className="pointer-events-none absolute -left-24 top-[-80px] h-[360px] w-[360px] rounded-full bg-[#dff67a]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-44 right-[-70px] h-[480px] w-[480px] rounded-full bg-[#f69c63]/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-64px)] max-w-[1180px] overflow-hidden rounded-[32px] border border-white/10 bg-[#172b25] shadow-[0_30px_100px_rgba(0,0,0,.32)] lg:grid-cols-[1.08fr_.92fr]">
        <div className="relative hidden overflow-hidden border-r border-white/10 p-12 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dff67a] text-[#12221e]">
              <SparklesIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold tracking-wide">知行网络学堂</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Network Study Copilot</div>
            </div>
          </div>

          <div className="my-auto max-w-[520px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dff67a]/20 bg-[#dff67a]/10 px-3 py-1.5 text-xs text-[#e9f9a6]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#dff67a]" />
              由 Dify Agent Skill Plugin Plus 驱动
            </div>
            <h1 className="text-[52px] font-semibold leading-[1.08] tracking-[-0.045em]">
              把每一次提问，
              <br />
              变成
              <span className="text-[#dff67a]">可积累的学习。</span>
            </h1>
            <p className="mt-6 max-w-[470px] text-[15px] leading-7 text-white/55">
              对话、教材引用、知识图谱与个性化分析汇聚在同一个学习空间。你的会话与长期记忆会按照微信身份独立保存。
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                ['精确引用', '回到教材原页'],
                ['学习记忆', '跨会话持续追踪'],
                ['个性分析', '找到下一步行动'],
              ].map(([title, description], index) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="mb-3 text-[11px] font-semibold text-[#dff67a]">0{index + 1}</div>
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

        <div className="flex items-center justify-center bg-[#faf9f4] px-6 py-12 text-[#18231f] sm:px-12">
          <div className="w-full max-w-[410px]">
            <div className="mb-9 lg:hidden">
              <div className="inline-flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#17342b] text-[#dff67a]">
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">知行网络学堂</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#789087]">Network Studio</div>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6d847a]">Welcome back</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">登录你的学习空间</h2>
            <p className="mt-3 text-sm leading-6 text-[#718078]">扫码后将为你的微信身份生成独立、不可逆的 Dify 用户标识。</p>

            {error && (
              <div className="mt-5 rounded-xl border border-[#dc7a58]/20 bg-[#fff0e9] px-4 py-3 text-xs text-[#9c4c31]">
                微信登录尚未配置，请先使用演示入口，或补充微信开放平台环境变量。
              </div>
            )}

            <a
              href="/api/auth/wechat/start"
              className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#17342b] text-sm font-semibold text-white shadow-[0_14px_36px_rgba(23,52,43,.2)] transition hover:-translate-y-0.5 hover:bg-[#21473b]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#4fc566]">
                <QrCodeIcon className="h-5 w-5 text-white" />
              </span>
              微信扫码登录
              <ArrowRightIcon className="ml-1 h-4 w-4" />
            </a>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#183129]/10" />
              <span className="text-[11px] text-[#9aa39f]">开发与预览</span>
              <span className="h-px flex-1 bg-[#183129]/10" />
            </div>

            <button
              onClick={demoLogin}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#183129]/10 bg-white text-sm font-semibold transition hover:border-[#17342b]/25 hover:bg-[#fdfdf9] disabled:opacity-60"
            >
              {loading ? '正在进入…' : '使用演示账户体验'}
            </button>

            <div className="mt-8 space-y-3">
              {[
                '浏览器刷新后保持登录状态',
                '不同微信用户的会话与记忆相互隔离',
                '不会向 Dify 传输明文 openid / unionid',
              ].map(item => (
                <div key={item} className="flex items-center gap-2.5 text-xs text-[#6d7b74]">
                  <CheckCircleIcon className="h-4 w-4 text-[#5f8b75]" />
                  {item}
                </div>
              ))}
            </div>

            <p className="mt-9 text-center text-[10px] leading-4 text-[#9da59f]">
              登录即表示你同意课程助手的隐私说明与数据使用约定
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
