import KnowledgeGraphView from '@/app/components/graph/knowledge-graph-view'
import {
  getTextbookKnowledgeGraphAround,
  textbookGraphDefaultDepth,
  textbookGraphRootNodeId,
  textbookGraphSourceNotice,
} from '@/lib/textbook-graph'

export default async function TextbookKnowledgeGraphPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string }>
}) {
  const params = await searchParams
  const centerNodeId = params.node || textbookGraphRootNodeId
  const slice = getTextbookKnowledgeGraphAround(centerNodeId, textbookGraphDefaultDepth)

  return (
    <KnowledgeGraphView
      nodes={slice.graph.nodes}
      edges={slice.graph.edges}
      rootNodeId={slice.centerNodeId}
      nodeNavigationBasePath="/textbook-knowledge-graph"
      parentNodeId={slice.parentNodeId}
      leafNodeIds={slice.leafNodeIds}
      colorByDepth
      omittedNodeCount={slice.omittedNodeCount}
      staticNotice={`${textbookGraphSourceNotice} · 当前仅展示中心节点向外 ${textbookGraphDefaultDepth} 级关系`}
      emptyTitle="教材知识图谱暂无数据"
      emptyDescription="请检查 Neo4j JSON 转译数据是否已经随项目发布。"
    />
  )
}
