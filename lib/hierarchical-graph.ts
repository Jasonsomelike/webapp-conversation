import type { KnowledgeGraphNodeType, UserKnowledgeGraph } from '@/lib/graph-data'

export interface RawHierarchyNode {
  id: string
  label: string
  depth?: number
}

export interface RawHierarchyEdge {
  source: string
  target: string
  relation?: string
}

export interface HierarchyGraphSlice {
  graph: UserKnowledgeGraph
  centerNodeId: string
  parentNodeId?: string
  leafNodeIds: string[]
}

interface BuildHierarchyGraphOptions {
  nodes: readonly RawHierarchyNode[]
  edges: readonly RawHierarchyEdge[]
  rootNodeId: string
  sourceName: string
}

interface SliceGraphOptions {
  graph: UserKnowledgeGraph
  rootNodeId: string
  requestedCenterNodeId?: string
  depth?: number
  excludeParentFromSlice?: boolean
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const nodeTypeForDepth = (depth = 0, childCount = 0): KnowledgeGraphNodeType => {
  if (depth <= 1 || childCount >= 6)
  { return 'topic' }
  if (childCount > 0)
  { return 'concept' }
  return 'skill'
}

const relationLabel = (relation?: string) => {
  if (!relation)
  { return '包含 / 属于' }
  if (relation === 'CONTAINS' || relation === '包含')
  { return '包含 / 属于' }
  if (relation === 'BELONGS_TO' || relation === '属于')
  { return '属于' }
  return relation
}

export const buildHierarchyGraph = ({
  nodes: rawNodes,
  edges: rawEdges,
  rootNodeId,
  sourceName,
}: BuildHierarchyGraphOptions): UserKnowledgeGraph => {
  const children = new Map<string, number>()
  const degree = new Map<string, number>()
  rawNodes.forEach((node) => {
    children.set(node.id, 0)
    degree.set(node.id, 0)
  })
  rawEdges.forEach((edge) => {
    children.set(edge.source, (children.get(edge.source) || 0) + 1)
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1)
  })

  return {
    nodes: rawNodes.map((node) => {
      const childCount = children.get(node.id) || 0
      const nodeDegree = degree.get(node.id) || 0
      return {
        id: node.id,
        label: node.label,
        type: node.id === rootNodeId ? 'user' : nodeTypeForDepth(node.depth, childCount),
        x: 50,
        y: 50,
        weight: Math.min(13, 6 + Math.sqrt(Math.max(1, childCount || nodeDegree)) * 1.5),
        confidence: Math.min(96, 64 + Math.min(10, nodeDegree) * 3),
        evidence: nodeDegree,
        description: childCount
          ? `${node.label} 来自${sourceName}，直接包含 ${childCount} 个下级知识点。`
          : `${node.label} 来自${sourceName}，是当前层级下的叶子知识点。`,
      }
    }),
    edges: rawEdges.map(edge => ({
      source: edge.source,
      target: edge.target,
      type: 'contains',
      weight: 0.9,
      description: relationLabel(edge.relation),
    })),
  }
}

const buildAdjacency = (graph: UserKnowledgeGraph) => {
  const adjacency = new Map<string, Set<string>>()
  graph.nodes.forEach(node => adjacency.set(node.id, new Set()))
  graph.edges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target)
    adjacency.get(edge.target)?.add(edge.source)
  })
  return adjacency
}

const buildChildMap = (graph: UserKnowledgeGraph) => {
  const children = new Map<string, Set<string>>()
  graph.nodes.forEach(node => children.set(node.id, new Set()))
  graph.edges.forEach(edge => children.get(edge.source)?.add(edge.target))
  return children
}

const findParentTowardRoot = (
  rootNodeId: string,
  centerNodeId: string,
  adjacency: Map<string, Set<string>>,
) => {
  if (centerNodeId === rootNodeId)
  { return undefined }

  const queue = [rootNodeId]
  const visited = new Set<string>([rootNodeId])
  const previous = new Map<string, string>()

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    if (current === centerNodeId)
    { break }
    adjacency.get(current)?.forEach((nextId) => {
      if (visited.has(nextId))
      { return }
      visited.add(nextId)
      previous.set(nextId, current)
      queue.push(nextId)
    })
  }

  return previous.get(centerNodeId)
}

const distanceFromCenter = (
  graph: UserKnowledgeGraph,
  centerNodeId: string,
) => {
  const adjacency = buildAdjacency(graph)
  const distance = new Map<string, number>([[centerNodeId, 0]])
  const queue = [centerNodeId]

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    const currentDistance = distance.get(current) ?? 0
    adjacency.get(current)?.forEach((nextId) => {
      if (!graph.nodes.some(node => node.id === nextId) || distance.has(nextId))
      { return }
      distance.set(nextId, currentDistance + 1)
      queue.push(nextId)
    })
  }

  return distance
}

export const layoutGraphSlice = (graph: UserKnowledgeGraph, centerNodeId: string): UserKnowledgeGraph => {
  const center = graph.nodes.find(node => node.id === centerNodeId) || graph.nodes[0]
  if (!center)
  { return graph }

  const distances = distanceFromCenter(graph, center.id)
  const firstRing = graph.nodes.filter(node => (distances.get(node.id) ?? 99) === 1)
  const secondRing = graph.nodes.filter(node => (distances.get(node.id) ?? 99) > 1)
  const dense = graph.nodes.length > 42
  const secondRadiusX = dense ? 42 : 39
  const secondRadiusY = dense ? 34 : 30

  const nodes = graph.nodes.map((node) => {
    if (node.id === center.id) {
      return {
        ...node,
        type: 'topic' as KnowledgeGraphNodeType,
        x: 50,
        y: 50,
        weight: Math.max(node.weight, 13),
        description: `${node.label} 是当前图谱探索中心。页面展示它向外两级的知识点关系，点击可下钻的子节点继续展开。`,
      }
    }

    const depth = distances.get(node.id) ?? 99
    const isFirstRing = depth === 1
    const siblings = isFirstRing ? firstRing : secondRing
    const index = Math.max(0, siblings.findIndex(item => item.id === node.id))
    const total = Math.max(1, siblings.length)
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total
    const radiusX = isFirstRing ? 23 : secondRadiusX
    const radiusY = isFirstRing ? 17 : secondRadiusY
    return {
      ...node,
      x: Number(clamp(50 + Math.cos(angle) * radiusX, 6, 94).toFixed(2)),
      y: Number(clamp(50 + Math.sin(angle) * radiusY, 7, 93).toFixed(2)),
      weight: isFirstRing ? Math.max(node.weight, 9.2) : Math.max(6.2, node.weight - (dense ? 1.6 : 1)),
    }
  })

  return { nodes, edges: graph.edges }
}

export const sliceGraphAround = ({
  graph,
  rootNodeId,
  requestedCenterNodeId = rootNodeId,
  depth = 2,
  excludeParentFromSlice = true,
}: SliceGraphOptions): HierarchyGraphSlice => {
  const fullNodeMap = new Map(graph.nodes.map(node => [node.id, node]))
  const centerNodeId = fullNodeMap.has(requestedCenterNodeId) ? requestedCenterNodeId : rootNodeId
  const adjacency = buildAdjacency(graph)
  const childMap = buildChildMap(graph)
  const parentNodeId = findParentTowardRoot(rootNodeId, centerNodeId, adjacency)
  const visited = new Set<string>([centerNodeId])
  const queue: Array<{ id: string, distance: number }> = [{ id: centerNodeId, distance: 0 }]

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    if (current.distance >= depth)
    { continue }
    adjacency.get(current.id)?.forEach((nextId) => {
      if (visited.has(nextId) || (excludeParentFromSlice && parentNodeId && nextId === parentNodeId))
      { return }
      visited.add(nextId)
      queue.push({ id: nextId, distance: current.distance + 1 })
    })
  }

  const nodes = graph.nodes
    .filter(node => visited.has(node.id))
    .sort((left, right) => {
      if (left.id === centerNodeId)
      { return -1 }
      if (right.id === centerNodeId)
      { return 1 }
      const leftDistance = adjacency.get(centerNodeId)?.has(left.id) ? 1 : 2
      const rightDistance = adjacency.get(centerNodeId)?.has(right.id) ? 1 : 2
      if (leftDistance !== rightDistance)
      { return leftDistance - rightDistance }
      return (right.evidence || 0) - (left.evidence || 0)
    })
  const edges = graph.edges.filter(edge => visited.has(edge.source) && visited.has(edge.target))
  const leafNodeIds = graph.nodes
    .filter(node => (childMap.get(node.id)?.size || 0) === 0)
    .map(node => node.id)

  return {
    graph: layoutGraphSlice({ nodes, edges }, centerNodeId),
    centerNodeId,
    parentNodeId,
    leafNodeIds,
  }
}
