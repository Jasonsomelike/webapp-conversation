import Link from 'next/link'
import KnowledgeGraphView from '@/app/components/graph/knowledge-graph-view'
import {
  getTextbookKnowledgeGraphAround,
  textbookGraphDefaultDepth,
  textbookGraphRootNodeId,
  textbookGraphSourceNotice,
} from '@/lib/textbook-graph'
import {
  getTextbookReviewGraphAround,
  textbookReviewGraphDefaultDepth,
  textbookReviewGraphRootNodeId,
  textbookReviewGraphSourceNotice,
} from '@/lib/textbook-review-graph'

export default async function TextbookKnowledgeGraphPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string, graph?: string }>
}) {
  const params = await searchParams
  const graphMode = params.graph === 'review' ? 'review' : 'textbook'
  const centerNodeId = params.node || (graphMode === 'review' ? textbookReviewGraphRootNodeId : textbookGraphRootNodeId)
  const slice = graphMode === 'review'
    ? getTextbookReviewGraphAround(centerNodeId, textbookReviewGraphDefaultDepth)
    : getTextbookKnowledgeGraphAround(centerNodeId, textbookGraphDefaultDepth)
  const navigationBasePath = graphMode === 'review'
    ? '/textbook-knowledge-graph?graph=review'
    : '/textbook-knowledge-graph'
  const depth = graphMode === 'review' ? textbookReviewGraphDefaultDepth : textbookGraphDefaultDepth
  const notice = graphMode === 'review' ? textbookReviewGraphSourceNotice : textbookGraphSourceNotice

  return (
    <div className="mx-auto max-w-[1500px] px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="mb-1 flex flex-wrap gap-2 rounded-[22px] border border-black/[0.06] bg-white/70 p-2 shadow-[0_12px_34px_rgba(28,45,38,.06)] backdrop-blur">
        {[
          { key: 'textbook', label: '教材概念网络', href: '/textbook-knowledge-graph' },
          { key: 'review', label: '总复习导图', href: '/textbook-knowledge-graph?graph=review' },
        ].map(item => (
          <Link
            key={item.key}
            href={item.href}
            className={`rounded-2xl px-4 py-2 text-xs font-semibold transition ${
              graphMode === item.key
                ? 'bg-[var(--studio-deep)] text-white shadow-[0_10px_28px_rgba(23,52,43,.16)]'
                : 'text-[var(--studio-muted)] hover:bg-black/[0.04] hover:text-[var(--studio-ink)]'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <KnowledgeGraphView
        nodes={slice.graph.nodes}
        edges={slice.graph.edges}
        rootNodeId={slice.centerNodeId}
        nodeNavigationBasePath={navigationBasePath}
        parentNodeId={slice.parentNodeId}
        leafNodeIds={slice.leafNodeIds}
        colorByDepth
        staticNotice={`${notice} · 当前仅展示中心节点向外 ${depth} 级关系`}
        emptyTitle="教材知识图谱暂无数据"
        emptyDescription="请检查图谱数据是否已经随项目发布。"
        compactOuterPadding
      />
    </div>
  )
}
