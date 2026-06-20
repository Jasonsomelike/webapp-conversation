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

export const fallbackGraph: UserKnowledgeGraph = {
  nodes: [
    { id: 'user', label: '我的学习', type: 'user', x: 50, y: 47, weight: 10, description: '你的个人计算机网络学习中心。', confidence: 70 },
    { id: 'network-layer', label: '网络层', type: 'topic', x: 30, y: 27, weight: 7, description: 'IP 编址、子网划分与路由选择。', confidence: 68 },
    { id: 'transport-layer', label: '运输层', type: 'topic', x: 72, y: 28, weight: 6, description: 'TCP、UDP、可靠传输与拥塞控制。', confidence: 65 },
    { id: 'cidr', label: 'CIDR', type: 'concept', x: 18, y: 52, weight: 6, description: '无分类编址与路由聚合。', confidence: 62 },
    { id: 'subnetting', label: '子网划分', type: 'weakness', x: 42, y: 18, weight: 7, description: '根据前缀长度计算地址块边界和主机范围。', confidence: 55 },
    { id: 'tcp', label: 'TCP 可靠传输', type: 'concept', x: 83, y: 52, weight: 6, description: '序号、确认、重传、流量与拥塞控制。', confidence: 64 },
    { id: 'practice', label: '专项练习', type: 'next', x: 50, y: 78, weight: 5, description: '从薄弱概念进入针对性练习。', confidence: 50 },
  ],
  edges: [
    { source: 'user', target: 'network-layer', type: '学习领域' },
    { source: 'user', target: 'transport-layer', type: '学习领域' },
    { source: 'network-layer', target: 'cidr', type: '包含概念' },
    { source: 'network-layer', target: 'subnetting', type: '包含概念' },
    { source: 'transport-layer', target: 'tcp', type: '包含概念' },
    { source: 'subnetting', target: 'practice', type: '推荐强化' },
  ],
}

export const graphNodes = fallbackGraph.nodes
export const graphEdges = fallbackGraph.edges
