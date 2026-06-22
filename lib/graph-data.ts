export type KnowledgeGraphNodeType = 'user' | 'topic' | 'concept' | 'weakness' | 'document' | 'question' | 'skill' | 'next'

export interface KnowledgeGraphNode {
  id: string
  label: string
  type: KnowledgeGraphNodeType
  x: number
  y: number
  weight: number
  description?: string
  confidence?: number
  evidence?: number
}

export interface KnowledgeGraphEdge {
  source: string
  target: string
  type: string
  weight?: number
}

export interface UserKnowledgeGraph {
  nodes: KnowledgeGraphNode[]
  edges: KnowledgeGraphEdge[]
}

export const emptyGraph: UserKnowledgeGraph = {
  nodes: [],
  edges: [],
}

export const fallbackGraph = emptyGraph
export const graphNodes = emptyGraph.nodes
export const graphEdges = emptyGraph.edges
