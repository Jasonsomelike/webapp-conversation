import {
  ArrowTrendingUpIcon,
  BookOpenIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  FireIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import { analysisData } from '@/lib/demo-data'

export default function AnalysisPage() {
  const maxTrend = Math.max(...analysisData.trend)
  const statCards = [
    { label: '学习动量', value: `${analysisData.momentum}%`, description: '较上周 +14%', icon: FireIcon, tone: 'bg-[#fff0df] text-[#aa6638]' },
    { label: '有效会话', value: analysisData.conversations, description: '本周新增 6 次', icon: ChatBubbleBottomCenterTextIcon, tone: 'bg-[#e9f2ff] text-[#42688f]' },
    { label: '教材引用', value: analysisData.references, description: '覆盖 8 份文档', icon: BookOpenIcon, tone: 'bg-[#e8f4ec] text-[#47735b]' },
    { label: '专注时长', value: `${analysisData.studyMinutes}m`, description: '日均 21 分钟', icon: ClockIcon, tone: 'bg-[#f1eafa] text-[#785a92]' },
  ]

  return (
    <div className="mx-auto max-w-[1450px] p-4 sm:p-6">
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, description, icon: Icon, tone }) => (
          <PageCard key={label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-[#748179]">{label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{value}</div>
                <div className="mt-1 text-[10px] text-[#8d9792]">{description}</div>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </PageCard>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-5">
          <PageCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#183129]/[0.07] px-6 py-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#708078]">AI Summary</div>
                <h2 className="mt-1.5 text-base font-semibold">当前学习状态</h2>
              </div>
              <span className="rounded-full bg-[#e8f4ec] px-3 py-1.5 text-[10px] font-semibold text-[#48715c]">{analysisData.currentStage}</span>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-[1fr_170px]">
              <p className="text-sm leading-7 text-[#526159]">{analysisData.summary}</p>
              <div className="relative mx-auto grid h-[150px] w-[150px] place-items-center rounded-full" style={{ background: `conic-gradient(#6d917d ${analysisData.momentum}%, #e8ebe7 0)` }}>
                <div className="grid h-[118px] w-[118px] place-items-center rounded-full bg-[#fffefa] text-center">
                  <div>
                    <div className="text-3xl font-semibold tracking-[-0.05em]">{analysisData.momentum}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-[#839089]">Learning pulse</div>
                  </div>
                </div>
              </div>
            </div>
          </PageCard>

          <PageCard className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#708078]">7 Day Activity</div>
                <h2 className="mt-1.5 text-base font-semibold">最近学习趋势</h2>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#48715c]">
                <ArrowTrendingUpIcon className="h-4 w-4" />
                活跃度提升 23%
              </div>
            </div>
            <div className="flex h-[210px] items-end gap-3 border-b border-[#183129]/10 px-2">
              {analysisData.trend.map((value, index) => (
                <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex w-full flex-1 items-end justify-center">
                    <div
                      className={`w-full max-w-[48px] rounded-t-xl transition-all ${index === 6 ? 'bg-[#17342b]' : 'bg-[#b9cdbf]'}`}
                      style={{ height: `${Math.max(12, value / maxTrend * 100)}%` }}
                    >
                      {index === 6 && <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-lg bg-[#17342b] px-2 py-1 text-[9px] text-white">{value}</div>}
                    </div>
                  </div>
                  <span className="pb-2 text-[10px] text-[#89958f]">{['五', '六', '日', '一', '二', '三', '今'][index]}</span>
                </div>
              ))}
            </div>
          </PageCard>

          <PageCard className="p-6">
            <div className="mb-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#708078]">Weak spots</div>
              <h2 className="mt-1.5 text-base font-semibold">需要优先强化</h2>
            </div>
            <div className="space-y-4">
              {analysisData.weakTopics.map((item, index) => (
                <div key={item.topic} className="grid items-center gap-4 rounded-2xl border border-[#183129]/[0.07] p-4 sm:grid-cols-[36px_1fr_170px]">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0df] text-xs font-bold text-[#a36338]">0{index + 1}</div>
                  <div>
                    <div className="text-sm font-semibold">{item.topic}</div>
                    <div className="mt-1 text-[11px] text-[#7d8983]">{item.reason}</div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-[9px] text-[#829088]">
                      <span>AI 置信度</span>
                      <span>{item.confidence}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#eceeea]">
                      <div className="h-full rounded-full bg-[#dc8a5f]" style={{ width: `${item.confidence}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PageCard>
        </div>

        <div className="space-y-5">
          <PageCard className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eaf5bc] text-[#566d29]">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#708078]">Next actions</div>
                <h2 className="mt-1 text-base font-semibold">推荐下一步</h2>
              </div>
            </div>
            <div className="space-y-3">
              {analysisData.recommendations.map((item, index) => {
                const tone = item.tone === 'primary'
                  ? 'bg-[#17342b] text-white'
                  : item.tone === 'mint'
                    ? 'bg-[#e8f4ec] text-[#315f4b]'
                    : 'bg-[#fff0df] text-[#995d35]'
                return (
                  <button key={item.title} className={`w-full rounded-2xl p-4 text-left ${tone}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold opacity-65">任务 0{index + 1}</span>
                      <span className="rounded-full bg-white/20 px-2 py-1 text-[9px] font-semibold">{item.priority}</span>
                    </div>
                    <div className="mt-3 text-sm font-semibold">{item.title}</div>
                    <div className="mt-1.5 text-[11px] leading-5 opacity-65">{item.reason}</div>
                  </button>
                )
              })}
            </div>
          </PageCard>

          <PageCard className="p-6">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#708078]">Strong topics</div>
            <div className="space-y-3">
              {analysisData.strongTopics.map((topic, index) => (
                <div key={topic} className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#e8f4ec] text-[10px] font-bold text-[#47715c]">{index + 1}</div>
                  <div className="flex-1 text-xs font-medium">{topic}</div>
                  <div className="text-[10px] font-semibold text-[#5f856f]">{[86, 81, 74][index]}%</div>
                </div>
              ))}
            </div>
          </PageCard>

          <div className="rounded-[22px] bg-[#e9f2ff] p-6 text-[#345b80]">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]">Analysis note</div>
            <p className="mt-3 text-xs leading-6">
              分析报告由规则统计与 AI 总结共同生成。每一项薄弱点都可以追溯到历史对话或教材引用，不会写入主聊天 conversation。
            </p>
            <button className="mt-4 rounded-xl bg-white px-4 py-2 text-[11px] font-semibold shadow-sm">重新生成分析</button>
          </div>
        </div>
      </div>
    </div>
  )
}
