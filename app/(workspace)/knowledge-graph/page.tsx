import { redirect } from 'next/navigation'
import KnowledgeGraphView from '@/app/components/graph/knowledge-graph-view'
import { getSession } from '@/lib/session'
import { getUserKnowledgeGraph } from '@/lib/user-graph'
import { sliceGraphAround } from '@/lib/hierarchical-graph'

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
  const rootNodeId = graph.nodes.find(node => node.type === 'user')?.id || graph.nodes[0]?.id || 'user'
  const slice = graph.nodes.length
    ? sliceGraphAround({
      graph,
      rootNodeId,
      requestedCenterNodeId: params.node || rootNodeId,
      depth: 2,
      excludeParentFromSlice: true,
    })
    : { graph, centerNodeId: rootNodeId, parentNodeId: undefined, leafNodeIds: [] }

  return (
    <KnowledgeGraphView
      nodes={slice.graph.nodes}
      edges={slice.graph.edges}
      rootNodeId={slice.centerNodeId}
      nodeNavigationBasePath="/knowledge-graph"
      parentNodeId={slice.parentNodeId}
      leafNodeIds={slice.leafNodeIds}
    />
  )
}
