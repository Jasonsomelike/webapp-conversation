import { redirect } from 'next/navigation'
import KnowledgeGraphView from '@/app/components/graph/knowledge-graph-view'
import { getKnowledgeGraphAround, graphSliceDefaultDepth } from '@/lib/graph-slice'
import { getSession } from '@/lib/session'
import { getUserKnowledgeGraph } from '@/lib/user-graph'

export default async function KnowledgeGraphPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string }>
}) {
  const session = await getSession()
  if (!session)
  { redirect('/login') }
  const params = await searchParams
  const graph = await getUserKnowledgeGraph(session.id)
  const rootNodeId = graph.nodes.find(node => node.type === 'user')?.id || graph.nodes[0]?.id
  const slice = getKnowledgeGraphAround({
    graph,
    requestedCenterNodeId: params.node,
    rootNodeId,
    depth: graphSliceDefaultDepth,
    hideParentWhenDrilled: true,
  })

  return (
    <KnowledgeGraphView
      nodes={slice.graph.nodes}
      edges={slice.graph.edges}
      rootNodeId={slice.centerNodeId}
      nodeNavigationBasePath="/knowledge-graph"
      parentNodeId={slice.parentNodeId}
      leafNodeIds={slice.leafNodeIds}
      staticNotice={graph.nodes.length ? `个人知识图谱 · 当前仅展示中心节点向外 ${graphSliceDefaultDepth} 级关系` : undefined}
    />
  )
}
