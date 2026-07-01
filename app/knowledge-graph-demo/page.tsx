import { notFound } from 'next/navigation'
import KnowledgeGraphView from '@/app/components/graph/knowledge-graph-view'
import { demoKnowledgeGraph } from '@/lib/graph-data'

export default function KnowledgeGraphDemoPage() {
  if (process.env.NODE_ENV === 'production')
  { notFound() }

  return (
    <main className="min-h-screen bg-[var(--studio-paper)]">
      <KnowledgeGraphView
        nodes={demoKnowledgeGraph.nodes}
        edges={demoKnowledgeGraph.edges}
        isDemo
      />
    </main>
  )
}
