import 'server-only'

import type { KnowledgeGraphEdge, KnowledgeGraphNode, UserKnowledgeGraph } from '@/lib/graph-data'
import { fallbackGraph } from '@/lib/graph-data'
import { db, isDatabaseConfigured, withDatabaseRetry } from '@/lib/db'

const taxonomy = [
  { key: 'architecture', label: '网络体系结构', group: '基础与体系', terms: ['OSI', 'TCP/IP', '体系结构', '分层', '协议栈'] },
  { key: 'physical', label: '物理层与信道', group: '物理层', terms: ['物理层', '信道', '带宽', '香农', '奈奎斯特', '编码', '调制'] },
  { key: 'ethernet', label: '以太网', group: '数据链路层', terms: ['以太网', 'Ethernet', 'MAC帧', 'MAC 地址'] },
  { key: 'csma-cd', label: 'CSMA/CD', group: '数据链路层', terms: ['CSMA/CD', '碰撞检测', '退避算法'] },
  { key: 'vlan', label: 'VLAN 与交换', group: '数据链路层', terms: ['VLAN', '交换机', '生成树', 'STP', 'Trunk'] },
  { key: 'ppp', label: 'PPP 与 HDLC', group: '数据链路层', terms: ['PPP', 'HDLC', '透明传输', '字节填充', '零比特填充'] },
  { key: 'arp', label: 'ARP 地址解析', group: '网络层', terms: ['ARP', '地址解析'] },
  { key: 'ipv4', label: 'IPv4 编址', group: '网络层', terms: ['IPv4', 'IP地址', 'IP 地址', '点分十进制'] },
  { key: 'ipv6', label: 'IPv6', group: '网络层', terms: ['IPv6', '冒号十六进制'] },
  { key: 'subnetting', label: '子网划分', group: '网络层', terms: ['子网划分', '子网掩码', '可用主机', '网络地址', '广播地址', 'VLSM'] },
  { key: 'cidr', label: 'CIDR 与路由聚合', group: '网络层', terms: ['CIDR', '路由聚合', '超网', '地址块'] },
  { key: 'lpm', label: '最长前缀匹配', group: '网络层', terms: ['最长前缀', '前缀匹配', 'LPM', '路由表匹配'] },
  { key: 'icmp', label: 'ICMP', group: '网络层', terms: ['ICMP', 'ping', 'traceroute'] },
  { key: 'nat', label: 'NAT', group: '网络层', terms: ['NAT', '网络地址转换', '端口映射'] },
  { key: 'dhcp', label: 'DHCP', group: '网络层', terms: ['DHCP', '动态主机配置'] },
  { key: 'routing', label: '路由选择基础', group: '路由协议', terms: ['路由选择', '路由算法', '路由表', '静态路由', '默认路由'] },
  { key: 'rip', label: 'RIP 距离向量', group: '路由协议', terms: ['RIP', '距离向量', '跳数'] },
  { key: 'ospf', label: 'OSPF 链路状态', group: '路由协议', terms: ['OSPF', '链路状态', 'Dijkstra', '最短路径'] },
  { key: 'bgp', label: 'BGP 域间路由', group: '路由协议', terms: ['BGP', '自治系统', 'AS号', '域间路由'] },
  { key: 'udp', label: 'UDP', group: '运输层', terms: ['UDP', '用户数据报'] },
  { key: 'tcp', label: 'TCP 可靠传输', group: '运输层', terms: ['TCP', '三次握手', '四次挥手', '序号', '确认号', '重传'] },
  { key: 'flow-control', label: '流量控制', group: '运输层', terms: ['流量控制', '滑动窗口', '接收窗口'] },
  { key: 'congestion', label: '拥塞控制', group: '运输层', terms: ['拥塞控制', '慢开始', '拥塞避免', '快重传', '快恢复'] },
  { key: 'dns', label: 'DNS', group: '应用层', terms: ['DNS', '域名解析'] },
  { key: 'http', label: 'HTTP/HTTPS', group: '应用层', terms: ['HTTP', 'HTTPS', 'Web', '状态码'] },
  { key: 'email', label: '电子邮件协议', group: '应用层', terms: ['SMTP', 'POP3', 'IMAP', '电子邮件'] },
  { key: 'socket', label: 'Socket 编程', group: '应用层', terms: ['Socket', '套接字', '客户端服务器'] },
  { key: 'tls', label: 'TLS 与网络安全', group: '网络安全', terms: ['TLS', 'SSL', '加密', '证书', '网络安全', '防火墙'] },
  { key: 'wireless', label: '无线局域网', group: '无线网络', terms: ['无线局域网', 'Wi-Fi', '802.11', 'CSMA/CA'] },
]

const recommendedNext: Record<string, { key: string, label: string }> = {
  'subnetting': { key: 'lpm', label: '最长前缀匹配练习' },
  'cidr': { key: 'routing', label: '路由表与聚合练习' },
  'lpm': { key: 'ospf', label: '进入 OSPF 路由选择' },
  'tcp': { key: 'congestion', label: 'TCP 拥塞控制专项' },
  'ethernet': { key: 'vlan', label: '交换与 VLAN 专项' },
  'csma-cd': { key: 'wireless', label: '对比 CSMA/CA' },
}

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '')
const termMatches = (text: string, terms: string[]) => {
  const normalized = normalize(text)
  return terms.reduce((count, term) => count + (normalized.includes(normalize(term)) ? 1 : 0), 0)
}

const polar = (index: number, total: number, radiusX: number, radiusY: number, offset = -Math.PI / 2) => ({
  x: 50 + Math.cos(offset + index / Math.max(total, 1) * Math.PI * 2) * radiusX,
  y: 47 + Math.sin(offset + index / Math.max(total, 1) * Math.PI * 2) * radiusY,
})

const shortLabel = (value: string, length = 18) => {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned.length > length ? `${cleaned.slice(0, length)}…` : cleaned
}

const addEdge = (edges: KnowledgeGraphEdge[], source: string, target: string, type: string, weight = 1) => {
  if (!edges.some(edge => edge.source === source && edge.target === target && edge.type === type))
  { edges.push({ source, target, type, weight }) }
}

const buildGraph = async (appUserId: string): Promise<UserKnowledgeGraph> => {
  const activeIds = (await db.chatConversation.findMany({
    where: { appUserId, deletedAt: null },
    select: { difyConversationId: true },
  })).map(item => item.difyConversationId)
  if (!activeIds.length)
  { return fallbackGraph }

  const [messages, references] = await Promise.all([
    db.chatMessage.findMany({
      where: { appUserId, role: 'user', difyConversationId: { in: activeIds } },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: { id: true, content: true, createdAt: true },
    }),
    db.messageReference.findMany({
      where: { appUserId, difyConversationId: { in: activeIds } },
      orderBy: { createdAt: 'desc' },
      take: 120,
      select: { id: true, documentName: true, quote: true, pageNumber: true, score: true },
    }),
  ])

  const messageCorpus = messages.map(message => message.content).join('\n')
  const referenceCorpus = references.map(reference => `${reference.documentName || ''} ${reference.quote || ''}`).join('\n')
  const ranked = taxonomy
    .map(item => ({
      ...item,
      questionScore: termMatches(messageCorpus, item.terms),
      referenceScore: termMatches(referenceCorpus, item.terms),
    }))
    .map(item => ({ ...item, score: item.questionScore * 2 + item.referenceScore }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 20)

  if (!ranked.length)
  { return fallbackGraph }

  const nodes: KnowledgeGraphNode[] = [{
    id: 'user',
    label: '我的学习',
    type: 'user',
    x: 50,
    y: 47,
    weight: 10,
    description: `基于当前账号最近 ${messages.length} 个问题和 ${references.length} 条知识库引用生成。`,
    confidence: Math.min(95, 55 + messages.length + Math.round(references.length / 3)),
    evidence: messages.length + references.length,
  }]
  const edges: KnowledgeGraphEdge[] = []
  const groups = [...new Set(ranked.map(item => item.group))]
  groups.forEach((group, index) => {
    const position = polar(index, groups.length, 22, 18)
    const groupItems = ranked.filter(item => item.group === group)
    nodes.push({
      id: `group-${group}`,
      label: group,
      type: 'topic',
      ...position,
      weight: Math.min(9, 4 + groupItems.length),
      description: `当前账号在“${group}”下关联了 ${groupItems.length} 个细分知识点。`,
      confidence: Math.min(95, 55 + groupItems.reduce((sum, item) => sum + item.score, 0) * 2),
      evidence: groupItems.reduce((sum, item) => sum + item.score, 0),
    })
    addEdge(edges, 'user', `group-${group}`, '学习领域', groupItems.length)
  })

  ranked.forEach((item, index) => {
    const position = polar(index, ranked.length, 38, 33, -Math.PI / 2 + 0.12)
    const isWeakness = item.questionScore >= 2 && index < 5
    nodes.push({
      id: `concept-${item.key}`,
      label: item.label,
      type: isWeakness ? 'weakness' : 'concept',
      ...position,
      weight: Math.min(9, 3 + item.score),
      description: isWeakness
        ? `你近期多次围绕“${item.label}”提问，建议结合引用页和专项题继续巩固。`
        : `该知识点在你的问题或知识库引用中出现了 ${item.score} 次有效证据。`,
      confidence: Math.min(96, 48 + item.score * 7),
      evidence: item.score,
    })
    addEdge(edges, `group-${item.group}`, `concept-${item.key}`, '包含知识点', item.score)
  })

  const documents = [...new Map(references
    .filter(reference => reference.documentName)
    .map(reference => [reference.documentName!, reference])).values()].slice(0, 6)
  const questions = messages.slice(0, 5)
  const outerItems = [
    ...documents.map(item => ({ kind: 'document' as const, item })),
    ...questions.map(item => ({ kind: 'question' as const, item })),
  ]
  outerItems.forEach((entry, index) => {
    const position = polar(index, outerItems.length, 47, 41, -Math.PI / 2 + 0.25)
    if (entry.kind === 'document') {
      const document = entry.item
      const id = `document-${document.id}`
      nodes.push({
        id,
        label: shortLabel(document.documentName || '知识库文档', 16),
        type: 'document',
        ...position,
        weight: 4,
        description: `${document.documentName || '知识库文档'}${document.pageNumber ? ` · 命中第 ${document.pageNumber} 页` : ''}`,
        confidence: document.score ? Math.round(Number(document.score) * 100) : 60,
        evidence: 1,
      })
      const text = `${document.documentName || ''} ${document.quote || ''}`
      const related = ranked.filter(item => termMatches(text, item.terms) > 0).slice(0, 2)
      if (related.length)
      { related.forEach(item => addEdge(edges, `concept-${item.key}`, id, '引用文档')) }
      else
      { addEdge(edges, 'user', id, '引用文档') }
    }
    else {
      const question = entry.item
      const id = `question-${question.id}`
      nodes.push({
        id,
        label: shortLabel(question.content),
        type: 'question',
        ...position,
        weight: 3,
        description: question.content,
        confidence: 100,
        evidence: 1,
      })
      const related = ranked.filter(item => termMatches(question.content, item.terms) > 0).slice(0, 3)
      if (related.length)
      { related.forEach(item => addEdge(edges, id, `concept-${item.key}`, '提问涉及')) }
      else
      { addEdge(edges, 'user', id, '提出问题') }
    }
  })

  ranked.filter(item => item.questionScore >= 2).slice(0, 2).forEach((item, index) => {
    const recommendation = recommendedNext[item.key]
    if (!recommendation)
    { return }
    const position = polar(index, 2, 15, 13, Math.PI / 2 - 0.4)
    const id = `next-${recommendation.key}`
    if (!nodes.some(node => node.id === id)) {
      nodes.push({
        id,
        label: recommendation.label,
        type: 'next',
        ...position,
        weight: 5,
        description: `根据“${item.label}”的近期提问频率推荐的下一步学习路径。`,
        confidence: 72,
        evidence: item.questionScore,
      })
    }
    addEdge(edges, `concept-${item.key}`, id, '推荐强化', item.questionScore)
  })

  return { nodes, edges }
}

export const getUserKnowledgeGraph = async (appUserId: string): Promise<UserKnowledgeGraph> => {
  if (!isDatabaseConfigured())
  { return fallbackGraph }
  try {
    return await withDatabaseRetry(() => buildGraph(appUserId))
  }
  catch (error) {
    console.error('[user-knowledge-graph] database unavailable', { appUserId, error })
    return fallbackGraph
  }
}
