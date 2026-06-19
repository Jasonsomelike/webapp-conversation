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
