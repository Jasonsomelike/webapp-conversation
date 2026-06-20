import { redirect } from 'next/navigation'
import KnowledgeGraphView from '@/app/components/graph/knowledge-graph-view'
import { getSession } from '@/lib/session'
import { getUserKnowledgeGraph } from '@/lib/user-graph'

export default async function KnowledgeGraphPage() {
  const session = await getSession()
  if (!session)
  { redirect('/login') }
  const graph = await getUserKnowledgeGraph(session.id)
  return <KnowledgeGraphView nodes={graph.nodes} edges={graph.edges} />
}
