export interface KnowledgeReference {
  id: string
  conversationId: string
  messageId?: string
  documentName: string
  datasetName?: string
  pageNumber?: number
  originalPageNumber?: number
  quote?: string
  score?: number
  pageImageUrl?: string
  topic: string
  createdAt: string
}

export const demoReferences: KnowledgeReference[] = [
  {
    id: 'ref-cidr-154',
    conversationId: 'demo-cidr',
    messageId: 'demo-message-1',
    documentName: '计算机网络（第8版）_谢希仁_part4_p121-160.pdf',
    datasetName: '计算机网络课程知识库',
    pageNumber: 34,
    originalPageNumber: 154,
    quote: '在使用 CIDR 时，路由表中的每一项由网络前缀和下一跳地址组成。查找路由表时，应选择网络前缀最长的匹配项。',
    score: 0.94,
    topic: '最长前缀匹配',
    createdAt: '2026-06-19T03:20:00.000Z',
  },
  {
    id: 'ref-network-layer',
    conversationId: 'demo-cidr',
    messageId: 'demo-message-1',
    documentName: '第4章 网络层-4.pdf',
    datasetName: '计算机网络课程知识库',
    pageNumber: 44,
    quote: '网络前缀越长，其地址块越小，因而路由越具体。最长前缀匹配也称为最长匹配或最佳匹配。',
    score: 0.91,
    topic: 'CIDR',
    createdAt: '2026-06-19T03:20:00.000Z',
  },
  {
    id: 'ref-exercises',
    conversationId: 'demo-practice',
    messageId: 'demo-message-2',
    documentName: '计算机网络（第8版）_谢希仁_part6_p201-240.pdf',
    datasetName: '计算机网络课程知识库',
    pageNumber: 18,
    originalPageNumber: 218,
    quote: '习题 4-49、4-50 通过多个前缀同时匹配的情形，训练路由转发表的查找过程。',
    score: 0.88,
    topic: '路由转发练习',
    createdAt: '2026-06-18T13:08:00.000Z',
  },
  {
    id: 'ref-transport',
    conversationId: 'demo-tcp',
    documentName: '计算机网络（第8版）_谢希仁_part5_p161-200.pdf',
    datasetName: '计算机网络课程知识库',
    pageNumber: 27,
    originalPageNumber: 187,
    quote: 'TCP 使用滑动窗口、确认和重传机制实现可靠传输，并通过拥塞窗口调节发送速率。',
    score: 0.83,
    topic: 'TCP 可靠传输',
    createdAt: '2026-06-17T09:30:00.000Z',
  },
]

export const graphNodes = [
  { id: 'user', label: '我的学习', type: 'user', x: 48, y: 46, weight: 10 },
  { id: 'cidr', label: 'CIDR', type: 'topic', x: 31, y: 28, weight: 8 },
  { id: 'lpm', label: '最长前缀匹配', type: 'weakness', x: 51, y: 22, weight: 9 },
  { id: 'subnet', label: '子网划分', type: 'concept', x: 70, y: 35, weight: 7 },
  { id: 'tcp', label: 'TCP', type: 'topic', x: 26, y: 63, weight: 5 },
  { id: 'ospf', label: 'OSPF', type: 'next', x: 72, y: 64, weight: 6 },
  { id: 'doc1', label: '网络层 · p154', type: 'document', x: 12, y: 31, weight: 4 },
  { id: 'doc2', label: '习题 · p218', type: 'document', x: 86, y: 20, weight: 4 },
  { id: 'skill', label: '解题 Skill', type: 'skill', x: 48, y: 76, weight: 4 },
]

export const graphEdges = [
  { source: 'user', target: 'cidr', type: 'asked' },
  { source: 'user', target: 'lpm', type: 'weak_at' },
  { source: 'user', target: 'tcp', type: 'asked' },
  { source: 'cidr', target: 'lpm', type: 'contains' },
  { source: 'lpm', target: 'subnet', type: 'related' },
  { source: 'lpm', target: 'doc1', type: 'cites' },
  { source: 'lpm', target: 'doc2', type: 'practice' },
  { source: 'subnet', target: 'ospf', type: 'recommended_next' },
  { source: 'user', target: 'skill', type: 'uses' },
  { source: 'skill', target: 'lpm', type: 'supports' },
]

export const analysisData = {
  summary: '你正在从“会算子网”向“能根据路由表做转发判断”过渡。最近的提问集中在 CIDR、最长前缀匹配与路由转发表，概念理解已较稳定，但面对多个相似前缀时仍会犹豫。',
  currentStage: '网络层 · 强化阶段',
  momentum: 82,
  conversations: 18,
  references: 37,
  studyMinutes: 146,
  weakTopics: [
    { topic: '最长前缀匹配', reason: '连续 3 次追问边界地址与默认路由', confidence: 92 },
    { topic: '路由聚合', reason: '能够计算地址块，但不稳定判断可否聚合', confidence: 76 },
    { topic: 'OSPF 区域', reason: '尚未形成与链路状态算法的整体联系', confidence: 61 },
  ],
  strongTopics: ['CIDR 斜线记法', 'IPv4 子网掩码', 'TCP 三次握手'],
  trend: [24, 38, 31, 62, 49, 78, 86],
  recommendations: [
    { title: '完成 4-49 / 4-50 变式题', reason: '用多前缀冲突题消除判断犹豫', priority: '今天', tone: 'primary' },
    { title: '复盘 CIDR 地址聚合', reason: '为进入 OSPF 路由汇总打基础', priority: '本周', tone: 'mint' },
    { title: '观看最长前缀匹配动画', reason: '你的画像显示图示讲解吸收效率更高', priority: '推荐', tone: 'orange' },
  ],
}
