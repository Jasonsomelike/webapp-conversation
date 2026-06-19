import { redirect } from 'next/navigation'
import {
  ArrowTrendingUpIcon,
  BookOpenIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  FireIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import { getSession } from '@/lib/session'
import { getUserAnalysis } from '@/lib/user-data'

export default async function AnalysisPage() {
  const session = await getSession()
  if (!session)
  { redirect('/login') }
  const analysis = await getUserAnalysis(session.id)
  const maxTrend = Math.max(1, ...analysis.trend)
  const statCards = [
    { label: '学习动量', value: `${analysis.momentum}%`, description: '按当前账号近 7 天活动计算', icon: FireIcon, tone: 'bg-orange-50 text-orange-700' },
    { label: '有效会话', value: analysis.conversations, description: '仅统计你的 Dify 会话', icon: ChatBubbleBottomCenterTextIcon, tone: 'bg-blue-50 text-blue-700' },
    { label: '教材引用', value: analysis.references, description: `覆盖 ${analysis.documents} 份文档`, icon: BookOpenIcon, tone: 'bg-emerald-50 text-emerald-700' },
    { label: '估算学习时长', value: `${analysis.studyMinutes}m`, description: '根据提问与会话活跃度估算', icon: ClockIcon, tone: 'bg-violet-50 text-violet-700' },
  ]

  return (
    <div className="mx-auto max-w-[1450px] p-4 sm:p-6">
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[var(--studio-accent-strong)]/15 bg-[var(--studio-accent)]/20 px-5 py-4">
        <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--studio-accent-strong)]" />
        <div>
          <div className="text-sm font-semibold">当前账号专属分析</div>
          <p className="mt-1 text-xs leading-5 text-black/50">所有指标仅查询用户 {session.username} 的会话、消息、引用与学习画像，不会合并其他账号数据。</p>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, description, icon: Icon, tone }) => (
          <PageCard key={label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-black/45">{label}</div>
                <div className="mt-2 text-2xl font-semibold">{value}</div>
                <div className="mt-1 text-[10px] text-black/35">{description}</div>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></div>
            </div>
          </PageCard>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-5">
          <PageCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/[0.07] px-6 py-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">Personal summary</div>
                <h2 className="mt-1.5 text-base font-semibold">当前学习状态</h2>
              </div>
              <span className="rounded-full bg-[var(--studio-accent)]/35 px-3 py-1.5 text-[10px] font-semibold text-[var(--studio-accent-strong)]">{analysis.currentStage}</span>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-[1fr_170px]">
              <p className="text-sm leading-7 text-black/60">{analysis.summary}</p>
              <div className="relative mx-auto grid h-[150px] w-[150px] place-items-center rounded-full" style={{ background: `conic-gradient(var(--studio-accent-strong) ${analysis.momentum}%, #e8ebe7 0)` }}>
                <div className="grid h-[118px] w-[118px] place-items-center rounded-full bg-[var(--studio-surface)] text-center">
                  <div>
                    <div className="text-3xl font-semibold">{analysis.momentum}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-black/40">Learning pulse</div>
                  </div>
                </div>
              </div>
            </div>
          </PageCard>

          <PageCard className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">7 day activity</div>
                <h2 className="mt-1.5 text-base font-semibold">最近提问趋势</h2>
              </div>
              <ArrowTrendingUpIcon className="h-5 w-5 text-[var(--studio-accent-strong)]" />
            </div>
            <div className="flex h-[210px] items-end gap-3 border-b border-black/10 px-2">
              {analysis.trend.map((value, index) => (
                <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex w-full flex-1 items-end justify-center">
                    <div
                      className={`w-full max-w-[48px] rounded-t-xl ${index === 6 ? 'bg-[var(--studio-deep)]' : 'bg-[var(--studio-accent)]'}`}
                      style={{ height: `${Math.max(value ? 12 : 3, value / maxTrend * 100)}%` }}
                    />
                  </div>
                  <span className="pb-2 text-[10px] text-black/40">{['六天前', '五', '四', '三', '二', '昨天', '今天'][index]}</span>
                </div>
              ))}
            </div>
          </PageCard>

          <PageCard className="p-6">
            <div className="mb-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">Focus areas</div>
              <h2 className="mt-1.5 text-base font-semibold">建议优先复盘</h2>
            </div>
            {analysis.weakTopics.length
              ? (
                <div className="space-y-4">
                  {analysis.weakTopics.map((item, index) => (
                    <div key={item.topic} className="grid items-center gap-4 rounded-2xl border border-black/[0.07] p-4 sm:grid-cols-[36px_1fr_150px]">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-xs font-bold text-orange-700">0{index + 1}</div>
                      <div>
                        <div className="text-sm font-semibold">{item.topic}</div>
                        <div className="mt-1 text-[11px] text-black/45">{item.reason}</div>
                      </div>
                      <div>
                        <div className="mb-1.5 flex justify-between text-[9px] text-black/40"><span>关注度</span><span>{item.confidence}%</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"><div className="h-full rounded-full bg-orange-400" style={{ width: `${item.confidence}%` }} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )
              : <p className="rounded-2xl bg-black/[0.025] p-5 text-sm text-black/45">产生更多知识库问答后，这里会按你的引用频率识别重点复盘方向。</p>}
          </PageCard>
        </div>

        <div className="space-y-5">
          <PageCard className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--studio-accent)]/35 text-[var(--studio-accent-strong)]"><SparklesIcon className="h-5 w-5" /></div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">Next actions</div>
                <h2 className="mt-1 text-base font-semibold">推荐下一步</h2>
              </div>
            </div>
            <div className="space-y-3">
              {analysis.recommendations.map((item, index) => {
                const tone = item.tone === 'primary'
                  ? 'bg-[var(--studio-deep)] text-white'
                  : item.tone === 'mint'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-orange-50 text-orange-800'
                return (
                  <a href="/chat" key={`${item.title}-${index}`} className={`block rounded-2xl p-4 ${tone}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold opacity-60">任务 0{index + 1}</span>
                      <span className="rounded-full bg-white/20 px-2 py-1 text-[9px] font-semibold">{item.priority}</span>
                    </div>
                    <div className="mt-3 text-sm font-semibold">{item.title}</div>
                    <div className="mt-1.5 text-[11px] leading-5 opacity-65">{item.reason}</div>
                  </a>
                )
              })}
            </div>
          </PageCard>

          <PageCard className="p-6">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">Frequently referenced</div>
            {analysis.strongTopics.length
              ? analysis.strongTopics.map((topic, index) => (
                <div key={topic} className="mb-3 flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--studio-accent)]/30 text-[10px] font-bold text-[var(--studio-accent-strong)]">{index + 1}</div>
                  <div className="min-w-0 flex-1 truncate text-xs font-medium">{topic}</div>
                </div>
              ))
              : <p className="text-xs leading-6 text-black/45">暂无高频引用文档。</p>}
          </PageCard>

          <div className="rounded-[22px] bg-blue-50 p-6 text-blue-900">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]">Analysis note</div>
            <p className="mt-3 text-xs leading-6">分析基于当前账号服务端记录生成，不读取浏览器本地缓存，也不会使用其他用户的对话或引用。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
