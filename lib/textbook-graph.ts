import type { KnowledgeGraphNodeType, UserKnowledgeGraph } from '@/lib/graph-data'
import { layoutGraphSlice } from '@/lib/hierarchical-graph'

interface RawTextbookNode { id: number, label: string }
interface RawTextbookEdge { source: number, target: number, relation: string }

export interface TextbookKnowledgeGraphSlice {
  graph: UserKnowledgeGraph
  centerNodeId: string
  parentNodeId?: string
  leafNodeIds: string[]
}

const textbookNodes = [
  { id: 0, label: '数据链路层' },
  { id: 1, label: '运输层' },
  { id: 2, label: '网络层' },
  { id: 3, label: '应用层' },
  { id: 4, label: 'TCP/IP' },
  { id: 5, label: '网际层' },
  { id: 6, label: '网络接口层' },
  { id: 7, label: 'OSI' },
  { id: 8, label: '会话层' },
  { id: 9, label: '表示层' },
  { id: 10, label: 'TCP' },
  { id: 11, label: 'UDP' },
  { id: 12, label: 'IP' },
  { id: 13, label: 'HTTP' },
  { id: 14, label: 'SMTP' },
  { id: 15, label: 'FTP' },
  { id: 16, label: 'DNS' },
  { id: 17, label: 'RTP' },
  { id: 18, label: 'H.323' },
  { id: 19, label: 'SIP' },
  { id: 20, label: 'SCTP' },
  { id: 21, label: '计算机网络' },
  { id: 22, label: '物理层' },
  { id: 23, label: '可靠传输' },
  { id: 24, label: '流量控制' },
  { id: 25, label: '拥塞控制' },
  { id: 26, label: '三次握手' },
  { id: 27, label: '滑动窗口' },
  { id: 28, label: 'PPP' },
  { id: 29, label: 'CSMA/CD' },
  { id: 30, label: 'ARP' },
  { id: 31, label: 'ICMP' },
  { id: 32, label: 'IGMP' },
  { id: 33, label: 'RIP' },
  { id: 34, label: 'OSPF' },
  { id: 35, label: 'BGP' },
  { id: 36, label: 'VPN' },
  { id: 37, label: 'NAT' },
  { id: 38, label: 'DHCP' },
  { id: 39, label: 'SNMP' },
  { id: 40, label: 'TELNET' },
  { id: 41, label: 'TFTP' },
  { id: 42, label: 'POP3' },
  { id: 43, label: 'IMAP' },
  { id: 44, label: 'MIME' },
  { id: 45, label: 'RTSP' },
  { id: 46, label: 'RTCP' },
  { id: 47, label: 'IPv6' },
  { id: 48, label: 'MPLS' },
  { id: 49, label: 'ICMPv6' },
  { id: 50, label: 'xDSL' },
  { id: 51, label: 'HFC' },
  { id: 52, label: 'FTTx' },
  { id: 53, label: '以太网' },
  { id: 54, label: 'MAC' },
  { id: 55, label: '100BASE-T' },
  { id: 56, label: '吉比特以太网' },
  { id: 57, label: '10吉比特以太网' },
  { id: 58, label: '无线网络' },
  { id: 59, label: 'WLAN' },
  { id: 60, label: 'WPAN' },
  { id: 61, label: 'WMAN' },
  { id: 62, label: '802.11' },
  { id: 63, label: '网络安全' },
  { id: 64, label: '防火墙' },
  { id: 65, label: '数字签名' },
  { id: 66, label: '鉴别' },
  { id: 67, label: '密钥分配' },
  { id: 68, label: '对称密钥密码体制' },
  { id: 69, label: '公钥密码体制' },
  { id: 70, label: '因特网' },
  { id: 71, label: '边缘部分' },
  { id: 72, label: '路由器' },
  { id: 73, label: '核心部分' },
  { id: 74, label: '端系统' },
  { id: 75, label: '客户服务器方式' },
  { id: 76, label: '对等连接方式' },
  { id: 77, label: 'ISP' },
  { id: 78, label: 'NAP' },
  { id: 79, label: 'IAB' },
  { id: 80, label: 'IETF' },
  { id: 81, label: 'IRTF' },
  { id: 82, label: 'ISOC' },
  { id: 83, label: 'RFC' },
  { id: 84, label: '分组交换' },
  { id: 85, label: '存储转发' },
  { id: 86, label: '电路交换' },
  { id: 87, label: '电信网络' },
  { id: 88, label: '集线器' },
  { id: 89, label: '交换机' },
  { id: 90, label: 'ARPANET' },
  { id: 91, label: 'NSFNET' },
  { id: 92, label: 'CHINANET' },
  { id: 93, label: '中国公用计算机互联网' },
  { id: 94, label: 'CERNET' },
  { id: 95, label: '中国教育和科研计算机网' },
  { id: 96, label: 'CSTNET' },
  { id: 97, label: '中国科学技术网' },
  { id: 98, label: 'NGI' },
  { id: 99, label: '下一代因特网' },
  { id: 100, label: 'CNGI' },
  { id: 101, label: 'CERNET2' },
  { id: 102, label: 'P2P' },
  { id: 103, label: '停止等待协议' },
  { id: 104, label: '连续ARQ协议' },
  { id: 105, label: '随机早期检测RED' },
  { id: 106, label: '综合服务IntServ' },
  { id: 107, label: '服务质量' },
  { id: 108, label: '区分服务DiffServ' },
  { id: 109, label: '资源预留协议RSVP' },
  { id: 110, label: 'IP电话' },
  { id: 111, label: '交互式音频/视频' },
  { id: 112, label: '流式存储音频/视频' },
  { id: 113, label: '媒体服务器' },
  { id: 114, label: 'IEEE' },
  { id: 115, label: 'ISO' },
  { id: 116, label: 'ITU' },
  { id: 117, label: '电信标准' },
] satisfies RawTextbookNode[]

const textbookEdges = [
  { source: 0, target: 22, relation: 'DEPENDS_ON' },
  { source: 0, target: 28, relation: 'CONTAINS' },
  { source: 0, target: 29, relation: 'CONTAINS' },
  { source: 0, target: 53, relation: 'CONTAINS' },
  { source: 1, target: 2, relation: 'DEPENDS_ON' },
  { source: 1, target: 10, relation: 'CONTAINS' },
  { source: 1, target: 11, relation: 'CONTAINS' },
  { source: 1, target: 20, relation: 'CONTAINS' },
  { source: 2, target: 12, relation: 'CONTAINS' },
  { source: 2, target: 30, relation: 'CONTAINS' },
  { source: 2, target: 31, relation: 'CONTAINS' },
  { source: 2, target: 32, relation: 'CONTAINS' },
  { source: 2, target: 33, relation: 'CONTAINS' },
  { source: 2, target: 34, relation: 'CONTAINS' },
  { source: 2, target: 35, relation: 'CONTAINS' },
  { source: 2, target: 36, relation: 'CONTAINS' },
  { source: 2, target: 37, relation: 'CONTAINS' },
  { source: 2, target: 47, relation: 'CONTAINS' },
  { source: 2, target: 48, relation: 'CONTAINS' },
  { source: 2, target: 49, relation: 'CONTAINS' },
  { source: 3, target: 1, relation: 'DEPENDS_ON' },
  { source: 3, target: 13, relation: 'CONTAINS' },
  { source: 3, target: 14, relation: 'CONTAINS' },
  { source: 3, target: 15, relation: 'CONTAINS' },
  { source: 3, target: 16, relation: 'CONTAINS' },
  { source: 3, target: 17, relation: 'CONTAINS' },
  { source: 3, target: 18, relation: 'CONTAINS' },
  { source: 3, target: 19, relation: 'CONTAINS' },
  { source: 3, target: 38, relation: 'CONTAINS' },
  { source: 3, target: 39, relation: 'CONTAINS' },
  { source: 3, target: 40, relation: 'CONTAINS' },
  { source: 3, target: 41, relation: 'CONTAINS' },
  { source: 3, target: 42, relation: 'CONTAINS' },
  { source: 3, target: 43, relation: 'CONTAINS' },
  { source: 3, target: 44, relation: 'CONTAINS' },
  { source: 3, target: 45, relation: 'CONTAINS' },
  { source: 3, target: 46, relation: 'CONTAINS' },
  { source: 4, target: 1, relation: 'CONTAINS' },
  { source: 4, target: 3, relation: 'CONTAINS' },
  { source: 4, target: 5, relation: 'CONTAINS' },
  { source: 4, target: 6, relation: 'CONTAINS' },
  { source: 4, target: 12, relation: 'DEPENDS_ON' },
  { source: 7, target: 0, relation: 'CONTAINS' },
  { source: 7, target: 1, relation: 'CONTAINS' },
  { source: 7, target: 2, relation: 'CONTAINS' },
  { source: 7, target: 3, relation: 'CONTAINS' },
  { source: 7, target: 8, relation: 'CONTAINS' },
  { source: 7, target: 9, relation: 'CONTAINS' },
  { source: 7, target: 22, relation: 'CONTAINS' },
  { source: 10, target: 12, relation: 'DEPENDS_ON' },
  { source: 10, target: 23, relation: 'IMPLEMENTS' },
  { source: 10, target: 24, relation: 'IMPLEMENTS' },
  { source: 10, target: 25, relation: 'IMPLEMENTS' },
  { source: 10, target: 26, relation: 'IMPLEMENTS' },
  { source: 10, target: 27, relation: 'IMPLEMENTS' },
  { source: 11, target: 12, relation: 'DEPENDS_ON' },
  { source: 12, target: 0, relation: 'DEPENDS_ON' },
  { source: 13, target: 10, relation: 'DEPENDS_ON' },
  { source: 14, target: 10, relation: 'DEPENDS_ON' },
  { source: 15, target: 10, relation: 'DEPENDS_ON' },
  { source: 16, target: 11, relation: 'DEPENDS_ON' },
  { source: 17, target: 11, relation: 'DEPENDS_ON' },
  { source: 18, target: 17, relation: 'DEPENDS_ON' },
  { source: 19, target: 17, relation: 'DEPENDS_ON' },
  { source: 21, target: 0, relation: 'CONTAINS' },
  { source: 21, target: 1, relation: 'CONTAINS' },
  { source: 21, target: 2, relation: 'CONTAINS' },
  { source: 21, target: 3, relation: 'CONTAINS' },
  { source: 21, target: 22, relation: 'CONTAINS' },
  { source: 22, target: 50, relation: 'CONTAINS' },
  { source: 22, target: 51, relation: 'CONTAINS' },
  { source: 22, target: 52, relation: 'CONTAINS' },
  { source: 25, target: 10, relation: 'BELONGS_TO' },
  { source: 26, target: 10, relation: 'BELONGS_TO' },
  { source: 27, target: 10, relation: 'BELONGS_TO' },
  { source: 46, target: 11, relation: 'DEPENDS_ON' },
  { source: 53, target: 54, relation: 'CONTAINS' },
  { source: 53, target: 55, relation: 'CONTAINS' },
  { source: 53, target: 56, relation: 'CONTAINS' },
  { source: 53, target: 57, relation: 'CONTAINS' },
  { source: 58, target: 59, relation: 'CONTAINS' },
  { source: 58, target: 60, relation: 'CONTAINS' },
  { source: 58, target: 61, relation: 'CONTAINS' },
  { source: 59, target: 62, relation: 'CONTAINS' },
  { source: 63, target: 64, relation: 'CONTAINS' },
  { source: 63, target: 65, relation: 'CONTAINS' },
  { source: 63, target: 66, relation: 'CONTAINS' },
  { source: 63, target: 67, relation: 'CONTAINS' },
  { source: 63, target: 68, relation: 'CONTAINS' },
  { source: 63, target: 69, relation: 'CONTAINS' },
  { source: 70, target: 71, relation: 'CONTAINS' },
  { source: 70, target: 73, relation: 'CONTAINS' },
  { source: 70, target: 77, relation: 'CONTAINS' },
  { source: 70, target: 78, relation: 'CONTAINS' },
  { source: 70, target: 79, relation: 'CONTAINS' },
  { source: 70, target: 80, relation: 'CONTAINS' },
  { source: 70, target: 81, relation: 'CONTAINS' },
  { source: 70, target: 82, relation: 'CONTAINS' },
  { source: 70, target: 83, relation: 'CONTAINS' },
  { source: 71, target: 74, relation: 'CONTAINS' },
  { source: 72, target: 2, relation: 'BELONGS_TO' },
  { source: 72, target: 84, relation: 'IMPLEMENTS' },
  { source: 73, target: 72, relation: 'CONTAINS' },
  { source: 74, target: 75, relation: 'IMPLEMENTS' },
  { source: 74, target: 76, relation: 'IMPLEMENTS' },
  { source: 80, target: 83, relation: 'RELATED_TO' },
  { source: 84, target: 21, relation: 'BELONGS_TO' },
  { source: 84, target: 85, relation: 'IMPLEMENTS' },
  { source: 86, target: 87, relation: 'BELONGS_TO' },
  { source: 88, target: 22, relation: 'BELONGS_TO' },
  { source: 89, target: 0, relation: 'BELONGS_TO' },
  { source: 90, target: 70, relation: 'RELATED_TO' },
  { source: 91, target: 70, relation: 'RELATED_TO' },
  { source: 92, target: 93, relation: 'BELONGS_TO' },
  { source: 94, target: 95, relation: 'BELONGS_TO' },
  { source: 96, target: 97, relation: 'BELONGS_TO' },
  { source: 98, target: 99, relation: 'RELATED_TO' },
  { source: 99, target: 47, relation: '包含' },
  { source: 99, target: 48, relation: '包含' },
  { source: 100, target: 99, relation: 'RELATED_TO' },
  { source: 101, target: 100, relation: 'RELATED_TO' },
  { source: 102, target: 76, relation: 'IMPLEMENTS' },
  { source: 103, target: 23, relation: 'BELONGS_TO' },
  { source: 104, target: 23, relation: 'BELONGS_TO' },
  { source: 105, target: 25, relation: 'BELONGS_TO' },
  { source: 106, target: 107, relation: 'BELONGS_TO' },
  { source: 108, target: 107, relation: 'BELONGS_TO' },
  { source: 109, target: 106, relation: 'BELONGS_TO' },
  { source: 110, target: 111, relation: 'RELATED_TO' },
  { source: 112, target: 45, relation: 'CONTAINS' },
  { source: 112, target: 113, relation: 'CONTAINS' },
  { source: 114, target: 53, relation: 'RELATED_TO' },
  { source: 114, target: 62, relation: 'RELATED_TO' },
  { source: 115, target: 7, relation: 'RELATED_TO' },
  { source: 116, target: 117, relation: 'RELATED_TO' },
] satisfies RawTextbookEdge[]

export const textbookGraphRootNodeId = 'textbook-21'
export const textbookGraphSourceNotice = '教材知识图谱 · 由 Neo4j JSON 转译生成，含 118 个概念节点与 135 条原始关系'
export const textbookGraphDefaultDepth = 2

const topicLabels = new Set([
  '计算机网络',
  'OSI',
  'TCP/IP',
  '物理层',
  '数据链路层',
  '网络层',
  '运输层',
  '应用层',
  '因特网',
  '网络安全',
  '无线网络',
  '服务质量',
  '下一代因特网',
])

const relationTypeMap: Record<string, string> = {
  CONTAINS: 'contains',
  包含: 'contains',
  BELONGS_TO: 'belongs_to',
  DEPENDS_ON: 'depends_on',
  IMPLEMENTS: 'implements',
  RELATED_TO: 'related_to',
}

const relationLabelMap: Record<string, string> = {
  CONTAINS: '包含',
  包含: '包含',
  BELONGS_TO: '归属',
  DEPENDS_ON: '依赖',
  IMPLEMENTS: '实现',
  RELATED_TO: '相关',
}

const idForNode = (id: number) => `textbook-${id}`

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const computeDegrees = () => {
  const degree = new Map<number, number>()
  textbookNodes.forEach(node => degree.set(node.id, 0))
  textbookEdges.forEach((edge) => {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1)
  })
  return degree
}

const nodeTypeFor = (node: RawTextbookNode, degree: number): KnowledgeGraphNodeType => {
  if (topicLabels.has(node.label) || degree >= 5)
  { return 'topic' }
  if (/协议|控制|服务|交换|路由|安全|网络/.test(node.label))
  { return 'concept' }
  return 'skill'
}

const buildInitialPositions = (degree: Map<number, number>) => {
  const positions = new Map<number, { x: number, y: number }>()
  const rootId = 21
  const sorted = [...textbookNodes].sort((left, right) => {
    if (left.id === rootId)
    { return -1 }
    if (right.id === rootId)
    { return 1 }
    return (degree.get(right.id) || 0) - (degree.get(left.id) || 0)
  })
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  sorted.forEach((node, index) => {
    if (node.id === rootId) {
      positions.set(node.id, { x: 50, y: 50 })
      return
    }
    const angle = index * goldenAngle
    const radius = 7 + Math.sqrt(index) * 4.2
    positions.set(node.id, {
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius * 0.78,
    })
  })
  return positions
}

const relaxPositions = (degree: Map<number, number>) => {
  const positions = buildInitialPositions(degree)
  const rootId = 21
  const area = 100 * 100
  const idealDistance = Math.sqrt(area / textbookNodes.length) * 1.65
  const nodeIds = textbookNodes.map(node => node.id)

  for (let tick = 0; tick < 180; tick += 1) {
    const temperature = 2.8 * (1 - tick / 180)
    const displacement = new Map<number, { x: number, y: number }>()
    nodeIds.forEach(id => displacement.set(id, { x: 0, y: 0 }))

    for (let i = 0; i < nodeIds.length; i += 1) {
      for (let j = i + 1; j < nodeIds.length; j += 1) {
        const leftId = nodeIds[i]
        const rightId = nodeIds[j]
        const left = positions.get(leftId)!
        const right = positions.get(rightId)!
        const dx = left.x - right.x
        const dy = left.y - right.y
        const distance = Math.max(0.01, Math.hypot(dx, dy))
        const force = idealDistance * idealDistance / distance
        const x = dx / distance * force
        const y = dy / distance * force
        const leftDisplacement = displacement.get(leftId)!
        const rightDisplacement = displacement.get(rightId)!
        leftDisplacement.x += x
        leftDisplacement.y += y
        rightDisplacement.x -= x
        rightDisplacement.y -= y
      }
    }

    textbookEdges.forEach((edge) => {
      const source = positions.get(edge.source)!
      const target = positions.get(edge.target)!
      const dx = source.x - target.x
      const dy = source.y - target.y
      const distance = Math.max(0.01, Math.hypot(dx, dy))
      const relationFactor = edge.relation === 'CONTAINS' || edge.relation === '包含' ? 0.82 : 1.08
      const force = distance * distance / (idealDistance * relationFactor)
      const x = dx / distance * force
      const y = dy / distance * force
      const sourceDisplacement = displacement.get(edge.source)!
      const targetDisplacement = displacement.get(edge.target)!
      sourceDisplacement.x -= x
      sourceDisplacement.y -= y
      targetDisplacement.x += x
      targetDisplacement.y += y
    })

    nodeIds.forEach((id) => {
      if (id === rootId) {
        positions.set(id, { x: 50, y: 50 })
        return
      }
      const position = positions.get(id)!
      const delta = displacement.get(id)!
      const length = Math.max(0.01, Math.hypot(delta.x, delta.y))
      positions.set(id, {
        x: clamp(position.x + delta.x / length * Math.min(length, temperature), 4, 96),
        y: clamp(position.y + delta.y / length * Math.min(length, temperature), 4, 96),
      })
    })
  }

  return positions
}

const buildTextbookKnowledgeGraph = (): UserKnowledgeGraph => {
  const degree = computeDegrees()
  const positions = relaxPositions(degree)

  const nodes = textbookNodes.map((node) => {
    const nodeDegree = degree.get(node.id) || 0
    const position = positions.get(node.id) || { x: 50, y: 50 }
    const relationText = `${nodeDegree} 条教材关系`
    return {
      id: idForNode(node.id),
      label: node.label,
      type: nodeTypeFor(node, nodeDegree),
      x: Number(position.x.toFixed(2)),
      y: Number(position.y.toFixed(2)),
      weight: Math.min(14, 6 + Math.sqrt(Math.max(1, nodeDegree)) * 2),
      confidence: Math.min(96, 62 + nodeDegree * 3),
      evidence: nodeDegree,
      description: `${node.label} 来自 Neo4j 导出的教材知识图谱，当前节点关联 ${relationText}。`,
    }
  })

  const edges = textbookEdges.map(edge => ({
    source: idForNode(edge.source),
    target: idForNode(edge.target),
    type: relationTypeMap[edge.relation] || edge.relation.toLowerCase(),
    weight: edge.relation === 'CONTAINS' || edge.relation === '包含' ? 0.9 : 0.72,
    description: relationLabelMap[edge.relation] || edge.relation,
  }))

  return { nodes, edges }
}

export const textbookKnowledgeGraph = buildTextbookKnowledgeGraph()

const fullNodeMap = new Map(textbookKnowledgeGraph.nodes.map(node => [node.id, node]))

const buildTextbookAdjacency = () => {
  const adjacency = new Map<string, Set<string>>()
  textbookKnowledgeGraph.nodes.forEach(node => adjacency.set(node.id, new Set()))
  textbookKnowledgeGraph.edges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target)
    adjacency.get(edge.target)?.add(edge.source)
  })
  return adjacency
}

const textbookAdjacency = buildTextbookAdjacency()

export const isTextbookLeafNode = (nodeId: string) => (textbookAdjacency.get(nodeId)?.size || 0) <= 1

const findParentTowardRoot = (centerNodeId: string) => {
  if (centerNodeId === textbookGraphRootNodeId)
  { return undefined }

  const queue = [textbookGraphRootNodeId]
  const visited = new Set<string>([textbookGraphRootNodeId])
  const previous = new Map<string, string>()

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    if (current === centerNodeId)
    { break }
    textbookAdjacency.get(current)?.forEach((nextId) => {
      if (visited.has(nextId))
      { return }
      visited.add(nextId)
      previous.set(nextId, current)
      queue.push(nextId)
    })
  }

  return previous.get(centerNodeId)
}

export const getTextbookKnowledgeGraphAround = (
  requestedCenterNodeId = textbookGraphRootNodeId,
  depth = textbookGraphDefaultDepth,
): TextbookKnowledgeGraphSlice => {
  const centerNodeId = fullNodeMap.has(requestedCenterNodeId) ? requestedCenterNodeId : textbookGraphRootNodeId
  const parentNodeId = findParentTowardRoot(centerNodeId)
  const visited = new Set<string>([centerNodeId])
  const queue: Array<{ id: string, distance: number }> = [{ id: centerNodeId, distance: 0 }]

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    if (current.distance >= depth)
    { continue }
    textbookAdjacency.get(current.id)?.forEach((nextId) => {
      if (visited.has(nextId) || (parentNodeId && nextId === parentNodeId))
      { return }
      visited.add(nextId)
      queue.push({ id: nextId, distance: current.distance + 1 })
    })
  }

  const nodes = textbookKnowledgeGraph.nodes
    .filter(node => visited.has(node.id))
    .sort((left, right) => {
      if (left.id === centerNodeId)
      { return -1 }
      if (right.id === centerNodeId)
      { return 1 }
      return (right.evidence || 0) - (left.evidence || 0)
    })
  const edges = textbookKnowledgeGraph.edges.filter(edge => visited.has(edge.source) && visited.has(edge.target))

  return {
    graph: layoutGraphSlice({ nodes, edges }, centerNodeId),
    centerNodeId,
    parentNodeId,
    leafNodeIds: nodes.filter(node => isTextbookLeafNode(node.id)).map(node => node.id),
  }
}
