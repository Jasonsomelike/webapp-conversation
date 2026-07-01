import type { KnowledgeGraphEdge, KnowledgeGraphNode, UserKnowledgeGraph } from '@/lib/graph-data'

export interface KnowledgeGraphSlice {
  graph: UserKnowledgeGraph
  centerNodeId: string
  parentNodeId?: string
  leafNodeIds: string[]
  omittedNodeCount: number
}

export const graphSliceDefaultDepth = 2
export const graphSliceMaxVisibleNodes = 30

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const buildAdjacency = (graph: UserKnowledgeGraph) => {
  const adjacency = new Map<string, Set<string>>()
  graph.nodes.forEach(node => adjacency.set(node.id, new Set()))
  graph.edges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target)
    adjacency.get(edge.target)?.add(edge.source)
  })
  return adjacency
}

const findParentTowardRoot = (
  rootNodeId: string,
  centerNodeId: string,
  adjacency: Map<string, Set<string>>,
) => {
  if (!rootNodeId || centerNodeId === rootNodeId)
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

const collectDistances = (
  centerNodeId: string,
  adjacency: Map<string, Set<string>>,
  depth: number,
  excludedNodeIds = new Set<string>(),
) => {
  const distances = new Map<string, number>()
  const queue: Array<{ id: string, distance: number }> = [{ id: centerNodeId, distance: 0 }]
  distances.set(centerNodeId, 0)

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    if (current.distance >= depth)
    { continue }
    adjacency.get(current.id)?.forEach((nextId) => {
      if (distances.has(nextId) || excludedNodeIds.has(nextId))
      { return }
      distances.set(nextId, current.distance + 1)
      queue.push({ id: nextId, distance: current.distance + 1 })
    })
  }

  return distances
}

const relationPriority = (edge: KnowledgeGraphEdge) => {
  if (edge.type === 'recommended_next' || edge.type.includes('推荐'))
  { return 2 }
  if (edge.type.includes('引用') || edge.type.includes('document'))
  { return 1 }
  return 0
}

const nodePriority = (node: KnowledgeGraphNode, adjacency: Map<string, Set<string>>) =>
  (node.evidence || 0) * 100 + (adjacency.get(node.id)?.size || 0) * 10 + node.weight

const circularMean = (angles: number[]) => {
  if (!angles.length)
  { return -Math.PI / 2 }
  const vector = angles.reduce(
    (acc, angle) => ({
      x: acc.x + Math.cos(angle),
      y: acc.y + Math.sin(angle),
    }),
    { x: 0, y: 0 },
  )
  if (Math.abs(vector.x) < 0.001 && Math.abs(vector.y) < 0.001)
  { return -Math.PI / 2 }
  return Math.atan2(vector.y, vector.x)
}

const nodeCollisionRadius = (node: KnowledgeGraphNode, distance: number) => {
  const labelSize = Math.min(10.8, Math.max(4.8, node.label.length * 0.72 + 4.4))
  if (distance <= 0)
  { return labelSize + 4.2 }
  if (distance === 1)
  { return labelSize + 2.4 }
  return labelSize + 1.2
}

const spreadOverlappingNodes = (
  nodes: KnowledgeGraphNode[],
  centerNodeId: string,
  distances: Map<string, number>,
) => {
  const nextNodes = nodes.map(node => ({ ...node }))

  for (let tick = 0; tick < 96; tick += 1) {
    for (let leftIndex = 0; leftIndex < nextNodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < nextNodes.length; rightIndex += 1) {
        const left = nextNodes[leftIndex]
        const right = nextNodes[rightIndex]
        const leftDistance = distances.get(left.id) ?? 2
        const rightDistance = distances.get(right.id) ?? 2
        const minDistance = nodeCollisionRadius(left, leftDistance) + nodeCollisionRadius(right, rightDistance)
        const dx = right.x - left.x
        const dy = right.y - left.y
        const distance = Math.max(0.01, Math.hypot(dx, dy))
        if (distance >= minDistance)
        { continue }

        const push = (minDistance - distance) * 0.26
        const ux = dx / distance
        const uy = dy / distance
        const leftLocked = left.id === centerNodeId
        const rightLocked = right.id === centerNodeId

        if (!leftLocked) {
          left.x = Number(clamp(left.x - ux * push, 10, 90).toFixed(2))
          left.y = Number(clamp(left.y - uy * push, 7.5, 92.5).toFixed(2))
        }
        if (!rightLocked) {
          right.x = Number(clamp(right.x + ux * push, 10, 90).toFixed(2))
          right.y = Number(clamp(right.y + uy * push, 7.5, 92.5).toFixed(2))
        }
      }
    }
  }

  return nextNodes
}

export const compactGraphLayout = (
  graph: UserKnowledgeGraph,
  centerNodeId: string,
  distances: Map<string, number>,
): UserKnowledgeGraph => {
  const center = graph.nodes.find(node => node.id === centerNodeId) || graph.nodes[0]
  if (!center)
  { return graph }

  const firstRing = graph.nodes
    .filter(node => (distances.get(node.id) ?? 99) === 1)
    .sort((left, right) => (right.evidence || 0) - (left.evidence || 0) || left.label.localeCompare(right.label))
  const secondRing = graph.nodes
    .filter(node => (distances.get(node.id) ?? 99) >= 2)
    .sort((left, right) => (right.evidence || 0) - (left.evidence || 0) || left.label.localeCompare(right.label))
  const nodeIds = new Set(graph.nodes.map(node => node.id))
  const visibleAdjacency = buildAdjacency(graph)
  const firstRingIds = new Set(firstRing.map(node => node.id))
  const firstRingAngles = new Map<string, number>()
  const secondRingGroups = new Map<string, KnowledgeGraphNode[]>()
  const orphanSecondRing: KnowledgeGraphNode[] = []

  firstRing.forEach(node => secondRingGroups.set(node.id, []))
  secondRing.forEach((node) => {
    const parentId = [...(visibleAdjacency.get(node.id) || [])]
      .filter(id => nodeIds.has(id) && firstRingIds.has(id))
      .sort((left, right) =>
        (visibleAdjacency.get(right)?.size || 0) - (visibleAdjacency.get(left)?.size || 0)
        || left.localeCompare(right),
      )[0]
    if (!parentId) {
      orphanSecondRing.push(node)
      return
    }
    secondRingGroups.get(parentId)?.push(node)
  })

  secondRingGroups.forEach(group => group.sort((left, right) =>
    (right.evidence || 0) - (left.evidence || 0) || left.label.localeCompare(right.label),
  ))

  const ringPosition = (
    index: number,
    total: number,
    radiusX: number,
    radiusY: number,
    startAngle = -Math.PI / 2,
  ) => {
    const angle = startAngle + (Math.PI * 2 * index) / Math.max(1, total)
    return {
      angle,
      x: 50 + Math.cos(angle) * radiusX,
      y: 50 + Math.sin(angle) * radiusY,
    }
  }

  const placeRing = (
    node: KnowledgeGraphNode,
    siblings: KnowledgeGraphNode[],
    radiusX: number,
    radiusY: number,
    startAngle = -Math.PI / 2,
  ) => {
    const index = Math.max(0, siblings.findIndex(item => item.id === node.id))
    const total = Math.max(1, siblings.length)
    const { angle, x, y } = ringPosition(index, total, radiusX, radiusY, startAngle)
    if (siblings === firstRing)
    { firstRingAngles.set(node.id, angle) }
    return {
      x: Number(clamp(x, 10, 90).toFixed(2)),
      y: Number(clamp(y, 8, 92).toFixed(2)),
    }
  }

  const placeSecondRingNode = (node: KnowledgeGraphNode) => {
    const parentId = [...(visibleAdjacency.get(node.id) || [])].find(id => firstRingIds.has(id))
    const group = parentId ? secondRingGroups.get(parentId) : orphanSecondRing
    const siblings = group?.length ? group : secondRing
    const index = Math.max(0, siblings.findIndex(item => item.id === node.id))
    const total = Math.max(1, siblings.length)
    const parentAngle = parentId ? firstRingAngles.get(parentId) ?? -Math.PI / 2 : circularMean([...firstRingAngles.values()])
    const fanWidth = Math.min(Math.PI * 1.02, Math.max(Math.PI * 0.34, total * 0.19))
    const angle = total === 1
      ? parentAngle
      : parentAngle - fanWidth / 2 + fanWidth * index / (total - 1)
    const radialJitter = total > 5 ? (index % 3) * 5.2 : (index % 2) * 2.6
    const radiusX = 47 + radialJitter
    const radiusY = 38 + radialJitter * 0.78

    return {
      x: Number(clamp(50 + Math.cos(angle) * radiusX, 10, 90).toFixed(2)),
      y: Number(clamp(50 + Math.sin(angle) * radiusY, 7.5, 92.5).toFixed(2)),
    }
  }

  const nodes = graph.nodes.map((node) => {
    const distance = distances.get(node.id) ?? 2
    if (node.id === center.id) {
      return {
        ...node,
        x: 50,
        y: 50,
        weight: Math.max(node.weight, 13),
      }
    }

    if (distance === 1) {
      return {
        ...node,
        ...placeRing(node, firstRing, firstRing.length > 12 ? 38 : 34, firstRing.length > 12 ? 31 : 27),
        weight: Math.max(7, Math.min(node.weight, 10.5)),
      }
    }

    return {
      ...node,
      ...placeSecondRingNode(node),
      weight: Math.max(4.8, Math.min(node.weight, 6.4)),
    }
  })

  return { nodes: spreadOverlappingNodes(nodes, center.id, distances), edges: graph.edges }
}

export const getKnowledgeGraphAround = ({
  graph,
  requestedCenterNodeId,
  rootNodeId,
  depth = graphSliceDefaultDepth,
  hideParentWhenDrilled = true,
  maxVisibleNodes = graphSliceMaxVisibleNodes,
}: {
  graph: UserKnowledgeGraph
  requestedCenterNodeId?: string
  rootNodeId?: string
  depth?: number
  hideParentWhenDrilled?: boolean
  maxVisibleNodes?: number
}): KnowledgeGraphSlice => {
  if (!graph.nodes.length) {
    return {
      graph,
      centerNodeId: '',
      leafNodeIds: [],
      omittedNodeCount: 0,
    }
  }

  const nodeMap = new Map(graph.nodes.map(node => [node.id, node]))
  const fallbackRootNodeId = rootNodeId && nodeMap.has(rootNodeId)
    ? rootNodeId
    : graph.nodes.find(node => node.type === 'user')?.id || graph.nodes[0].id
  const centerNodeId = requestedCenterNodeId && nodeMap.has(requestedCenterNodeId)
    ? requestedCenterNodeId
    : fallbackRootNodeId
  const adjacency = buildAdjacency(graph)
  const parentNodeId = findParentTowardRoot(fallbackRootNodeId, centerNodeId, adjacency)
  const excludedNodeIds = hideParentWhenDrilled && parentNodeId ? new Set([parentNodeId]) : new Set<string>()
  const distances = collectDistances(centerNodeId, adjacency, depth, excludedNodeIds)
  distances.set(centerNodeId, 0)

  const includedNodeIds = new Set(distances.keys())
  const firstRingIds = new Set(
    graph.nodes
      .filter(node => (distances.get(node.id) ?? 99) === 1)
      .map(node => node.id),
  )
  const mandatoryNodeIds = new Set(
    graph.nodes
      .filter(node => (distances.get(node.id) ?? 99) <= 1)
      .map(node => node.id),
  )
  let omittedNodeCount = 0
  if (includedNodeIds.size > maxVisibleNodes && mandatoryNodeIds.size < includedNodeIds.size) {
    const secondRingGroups = new Map<string, KnowledgeGraphNode[]>()
    firstRingIds.forEach(id => secondRingGroups.set(id, []))

    graph.nodes
      .filter(node => (distances.get(node.id) ?? 99) >= 2 && includedNodeIds.has(node.id))
      .forEach((node) => {
        const parentId = [...(adjacency.get(node.id) || [])]
          .filter(id => firstRingIds.has(id))
          .sort((left, right) =>
            (adjacency.get(right)?.size || 0) - (adjacency.get(left)?.size || 0)
            || left.localeCompare(right),
          )[0]
        if (!parentId)
        { return }
        secondRingGroups.get(parentId)?.push(node)
      })

    secondRingGroups.forEach(group => group.sort((left, right) =>
      nodePriority(right, adjacency) - nodePriority(left, adjacency)
      || left.label.localeCompare(right.label),
    ))

    const allowedNodeIds = new Set(mandatoryNodeIds)
    const slots = Math.max(0, maxVisibleNodes - allowedNodeIds.size)
    const groups = [...secondRingGroups.values()].filter(group => group.length)
    for (let round = 0; allowedNodeIds.size < mandatoryNodeIds.size + slots; round += 1) {
      let addedThisRound = false
      groups.forEach((group) => {
        if (allowedNodeIds.size >= mandatoryNodeIds.size + slots)
        { return }
        const nextNode = group[round]
        if (!nextNode)
        { return }
        allowedNodeIds.add(nextNode.id)
        addedThisRound = true
      })
      if (!addedThisRound)
      { break }
    }

    omittedNodeCount = includedNodeIds.size - allowedNodeIds.size
    includedNodeIds.clear()
    allowedNodeIds.forEach(id => includedNodeIds.add(id))
  }

  const nodes = graph.nodes
    .filter(node => includedNodeIds.has(node.id))
    .sort((left, right) => {
      if (left.id === centerNodeId)
      { return -1 }
      if (right.id === centerNodeId)
      { return 1 }
      return (distances.get(left.id) ?? 99) - (distances.get(right.id) ?? 99)
        || (right.evidence || 0) - (left.evidence || 0)
    })
  const edges = graph.edges
    .filter(edge => includedNodeIds.has(edge.source) && includedNodeIds.has(edge.target))
    .sort((left, right) => relationPriority(left) - relationPriority(right))

  const slicedGraph = { nodes, edges }
  const leafNodeIds = nodes
    .filter((node) => {
      const visibleDegree = edges.filter(edge => edge.source === node.id || edge.target === node.id).length
      const fullDegree = adjacency.get(node.id)?.size || 0
      return visibleDegree <= 1 || fullDegree <= 1
    })
    .map(node => node.id)

  return {
    graph: compactGraphLayout(slicedGraph, centerNodeId, distances),
    centerNodeId,
    parentNodeId,
    leafNodeIds,
    omittedNodeCount,
  }
}
