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
  description?: string
}

export interface UserKnowledgeGraph {
  nodes: KnowledgeGraphNode[]
  edges: KnowledgeGraphEdge[]
}

export const emptyGraph: UserKnowledgeGraph = {
  nodes: [],
  edges: [],
}

export const demoKnowledgeGraph: UserKnowledgeGraph = {
  nodes: [
    {
      id: 'demo-user',
      label: '验收学习者',
      type: 'user',
      x: 50,
      y: 46,
      weight: 12,
      confidence: 82,
      description: '用于本地验收 GSAP 图谱动效的临时学习者节点，不会写入真实用户数据。',
    },
    {
      id: 'demo-topic-tcp',
      label: 'TCP 可靠传输',
      type: 'topic',
      x: 35,
      y: 27,
      weight: 11,
      confidence: 76,
      description: '围绕确认、重传、滑动窗口与拥塞控制形成的核心学习主题。',
    },
    {
      id: 'demo-concept-window',
      label: '滑动窗口',
      type: 'concept',
      x: 22,
      y: 52,
      weight: 9,
      confidence: 69,
      description: '发送窗口、接收窗口与累计确认共同决定端到端吞吐与可靠性。',
    },
    {
      id: 'demo-weakness-rtt',
      label: 'RTT 与超时重传',
      type: 'weakness',
      x: 61,
      y: 24,
      weight: 10,
      confidence: 54,
      description: '最近问答中多次混淆 RTT 估算、RTO 更新与快速重传触发条件。',
    },
    {
      id: 'demo-document-xie',
      label: '谢希仁第 8 版 · 第 5 章',
      type: 'document',
      x: 77,
      y: 48,
      weight: 8,
      confidence: 88,
      description: '来自知识库引用的教材片段，可作为复习 TCP 机制的证据来源。',
    },
    {
      id: 'demo-skill-evidence',
      label: '按证据复盘',
      type: 'skill',
      x: 42,
      y: 72,
      weight: 7,
      confidence: 73,
      description: '先定位原文，再将协议状态变化画成时序图，降低记忆负担。',
    },
    {
      id: 'demo-question',
      label: '为什么会重复 ACK？',
      type: 'question',
      x: 67,
      y: 76,
      weight: 8,
      confidence: 61,
      description: '用户历史提问中出现的典型追问，适合连接快速重传与拥塞控制。',
    },
    {
      id: 'demo-next',
      label: '下一步：拥塞避免',
      type: 'next',
      x: 84,
      y: 24,
      weight: 7,
      confidence: 67,
      description: '建议继续学习慢开始、拥塞避免、快重传与快恢复之间的状态切换。',
    },
  ],
  edges: [
    { source: 'demo-user', target: 'demo-topic-tcp', type: 'studies', weight: 0.92 },
    { source: 'demo-topic-tcp', target: 'demo-concept-window', type: 'contains_concept', weight: 0.86 },
    { source: 'demo-topic-tcp', target: 'demo-weakness-rtt', type: 'has_weakness', weight: 0.79 },
    { source: 'demo-weakness-rtt', target: 'demo-document-xie', type: 'supported_by_document', weight: 0.74 },
    { source: 'demo-concept-window', target: 'demo-skill-evidence', type: 'practice_with', weight: 0.66 },
    { source: 'demo-question', target: 'demo-weakness-rtt', type: 'reveals_gap', weight: 0.82 },
    { source: 'demo-document-xie', target: 'demo-question', type: 'answers_question', weight: 0.64 },
    { source: 'demo-weakness-rtt', target: 'demo-next', type: 'recommended_next', weight: 0.71 },
    { source: 'demo-next', target: 'demo-topic-tcp', type: 'extends_topic', weight: 0.58 },
  ],
}

export const fallbackGraph = emptyGraph
export const graphNodes = emptyGraph.nodes
export const graphEdges = emptyGraph.edges
