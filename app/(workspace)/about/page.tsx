import Link from 'next/link'
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-7">
      <PageCard className="overflow-hidden">
        <div className="bg-[var(--studio-deep)] px-6 py-10 text-center text-white">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[var(--studio-accent)] text-[var(--studio-deep)]">
            <AcademicCapIcon className="h-10 w-10" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">知行网络学堂</h2>
          <p className="mt-2 text-sm text-white/55">计算机网络个性化 AI 学习空间</p>
          <div className="mt-3 text-xs text-white/35">Web / Android · 版本 1.1</div>
        </div>
        <div className="space-y-5 p-6">
          <p className="text-sm leading-7 text-[var(--studio-muted)]">
            基于 Dify Chatflow、课程知识库和账号隔离学习数据构建。每位用户的对话、文档引用、学习画像与知识图谱相互独立。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[var(--studio-accent)]/20 p-4">
              <SparklesIcon className="h-5 w-5 text-[var(--studio-accent-strong)]" />
              <div className="mt-3 text-sm font-semibold">计网Agent</div>
              <p className="mt-1 text-xs leading-6 text-[var(--studio-muted)]">概念讲解、习题生成、文档分析和学习路径建议。</p>
            </div>
            <div className="rounded-2xl bg-[#e9effa] p-4">
              <ShieldCheckIcon className="h-5 w-5 text-[#496789]" />
              <div className="mt-3 text-sm font-semibold">专属数据空间</div>
              <p className="mt-1 text-xs leading-6 text-[var(--studio-muted)]">按账号隔离会话、引用、记忆和分析结果。</p>
            </div>
          </div>
          <Link href="https://www.jasonsome.cn" className="flex items-center justify-between rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold">
            www.jasonsome.cn
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </Link>
          <div className="text-center text-[11px] text-black/35">© 2026 知行网络学堂</div>
        </div>
      </PageCard>
    </div>
  )
}
