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

const buildDirectedChildMap = (graph: UserKnowledgeGraph) => {
  const children = new Map<string, Set<string>>()
  graph.nodes.forEach(node => children.set(node.id, new Set()))
  graph.edges.forEach(edge => children.get(edge.source)?.add(edge.target))
  return children
}

const buildNeighborMap = (graph: UserKnowledgeGraph) => {
  const neighbors = new Map<string, Set<string>>()
  graph.nodes.forEach(node => neighbors.set(node.id, new Set()))
  graph.edges.forEach((edge) => {
    neighbors.get(edge.source)?.add(edge.target)
    neighbors.get(edge.target)?.add(edge.source)
  })
  return neighbors
}

const roundPosition = (value: number) => Number(value.toFixed(2))

const nodePoint = ({
  angle,
  radiusX,
  radiusY,
  minX,
  maxX,
  minY,
  maxY,
}: {
  angle: number
  radiusX: number
  radiusY: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}) => ({
  x: roundPosition(clamp(50 + Math.cos(angle) * radiusX, minX, maxX)),
  y: roundPosition(clamp(50 + Math.sin(angle) * radiusY, minY, maxY)),
})

const graphBounds = (dense: boolean, extraDense: boolean) => {
  if (extraDense) {
    return {
      minX: -12,
      maxX: 112,
      minY: -8,
      maxY: 108,
    }
  }
  if (dense) {
    return {
      minX: -8,
      maxX: 108,
      minY: -5,
      maxY: 105,
    }
  }
  return {
    minX: 2.2,
    maxX: 97.8,
    minY: 3.6,
    maxY: 96.4,
  }
}

const distributeSecondRingByParent = ({
  graph,
  firstRing,
  secondRing,
}: {
  graph: UserKnowledgeGraph
  firstRing: UserKnowledgeGraph['nodes']
  secondRing: UserKnowledgeGraph['nodes']
}) => {
  const directedChildren = buildDirectedChildMap(graph)
  const neighbors = buildNeighborMap(graph)
  const secondRingIds = new Set(secondRing.map(node => node.id))
  const assigned = new Set<string>()
  const groups = firstRing.map(node => ({ parent: node, children: [] as UserKnowledgeGraph['nodes'] }))

  groups.forEach((group) => {
    const directChildren = [...directedChildren.get(group.parent.id) || []]
      .filter(id => secondRingIds.has(id))
    directChildren.forEach((childId) => {
      if (assigned.has(childId))
      { return }
      const child = secondRing.find(node => node.id === childId)
      if (!child)
      { return }
      group.children.push(child)
      assigned.add(childId)
    })
  })

  secondRing.forEach((node) => {
    if (assigned.has(node.id))
    { return }
    const connectedParentIndex = groups.findIndex(group => neighbors.get(node.id)?.has(group.parent.id))
    const group = groups[connectedParentIndex >= 0 ? connectedParentIndex : assigned.size % Math.max(1, groups.length)]
    if (!group)
    { return }
    group.children.push(node)
    assigned.add(node.id)
  })

  if (!groups.length && secondRing.length) {
    return [{
      parent: undefined,
      children: secondRing,
    }]
  }

  return groups
}

const visualLength = (label: string) => [...label].reduce((total, char) => {
  if (/[\u3400-\u9fff]/.test(char))
  { return total + 1.45 }
  if (/[A-Z0-9]/.test(char))
  { return total + 0.82 }
  return total + 0.68
}, 0)

const nodeFootprint = (
  node: UserKnowledgeGraph['nodes'][number],
  dense: boolean,
  extraDense: boolean,
) => {
  const labelLength = visualLength(node.label)
  const halfWidth = clamp(
    3.15 + labelLength * (extraDense ? 0.48 : dense ? 0.53 : 0.58) + node.weight * 0.09,
    extraDense ? 5.5 : dense ? 5.6 : 5.8,
    extraDense ? 10.2 : dense ? 10.8 : 11.6,
  )
  const halfHeight = clamp(
    2.85 + node.weight * 0.1,
    extraDense ? 3.4 : dense ? 3.45 : 3.55,
    extraDense ? 4.75 : dense ? 4.8 : 5,
  )
  return { halfWidth, halfHeight }
}

const relaxNodeCollisions = (
  nodes: UserKnowledgeGraph['nodes'],
  centerNodeId: string,
  dense: boolean,
  extraDense: boolean,
) => {
  if (nodes.length < 3)
  { return nodes }

  const positions = new Map(nodes.map(node => [node.id, { x: node.x, y: node.y }]))
  const anchors = new Map(nodes.map(node => [node.id, { x: node.x, y: node.y }]))
  const footprints = new Map(nodes.map(node => [node.id, nodeFootprint(node, dense, extraDense)]))
  const iterations = extraDense ? 190 : dense ? 150 : 86
  const minX = extraDense ? 4.2 : dense ? 3.9 : 3.7
  const minY = extraDense ? 2.1 : dense ? 1.8 : 1.55
  const anchorPull = extraDense ? 0.0045 : dense ? 0.008 : 0.018
  const bounds = graphBounds(dense, extraDense)

  for (let tick = 0; tick < iterations; tick += 1) {
    const cooling = 1 - tick / iterations
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const left = nodes[i]
        const right = nodes[j]
        const leftPosition = positions.get(left.id)!
        const rightPosition = positions.get(right.id)!
        const leftFootprint = footprints.get(left.id)!
        const rightFootprint = footprints.get(right.id)!
        let dx = rightPosition.x - leftPosition.x
        let dy = rightPosition.y - leftPosition.y
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
          const angle = (i * 37 + j * 19) * Math.PI / 97
          dx = Math.cos(angle) * 0.01
          dy = Math.sin(angle) * 0.01
        }
        const overlapX = leftFootprint.halfWidth + rightFootprint.halfWidth + minX - Math.abs(dx)
        const overlapY = leftFootprint.halfHeight + rightFootprint.halfHeight + minY - Math.abs(dy)
        if (overlapX <= 0 || overlapY <= 0)
        { continue }

        const pushOnX = overlapX < overlapY
        const direction = pushOnX ? Math.sign(dx || 1) : Math.sign(dy || 1)
        const push = Math.min(pushOnX ? overlapX : overlapY, extraDense ? 3.8 : dense ? 3 : 2.1) * Math.max(0.22, cooling) * 0.62
        const leftFixed = left.id === centerNodeId
        const rightFixed = right.id === centerNodeId
        const leftShare = leftFixed ? 0 : rightFixed ? 1 : 0.5
        const rightShare = rightFixed ? 0 : leftFixed ? 1 : 0.5

        if (pushOnX) {
          leftPosition.x -= direction * push * leftShare
          rightPosition.x += direction * push * rightShare
        }
        else {
          leftPosition.y -= direction * push * leftShare
          rightPosition.y += direction * push * rightShare
        }
      }
    }

    nodes.forEach((node) => {
      const position = positions.get(node.id)!
      if (node.id === centerNodeId) {
        position.x = 50
        position.y = 50
        return
      }
      const anchor = anchors.get(node.id)!
      position.x += (anchor.x - position.x) * anchorPull * cooling
      position.y += (anchor.y - position.y) * anchorPull * cooling
      position.x = clamp(position.x, bounds.minX, bounds.maxX)
      position.y = clamp(position.y, bounds.minY, bounds.maxY)
    })
  }

  return nodes.map((node) => {
    const position = positions.get(node.id)
    if (!position)
    { return node }
    return {
      ...node,
      x: roundPosition(position.x),
      y: roundPosition(position.y),
    }
  })
}

export const layoutGraphSlice = (graph: UserKnowledgeGraph, centerNodeId: string): UserKnowledgeGraph => {
  const center = graph.nodes.find(node => node.id === centerNodeId) || graph.nodes[0]
  if (!center)
  { return graph }

  const distances = distanceFromCenter(graph, center.id)
  const firstRing = graph.nodes.filter(node => (distances.get(node.id) ?? 99) === 1)
  const secondRing = graph.nodes.filter(node => (distances.get(node.id) ?? 99) > 1)
  const dense = graph.nodes.length > 42
  const extraDense = graph.nodes.length > 64
  const bounds = graphBounds(dense, extraDense)
  const parentGroups = distributeSecondRingByParent({ graph, firstRing, secondRing })
  const groupWeights = parentGroups.map(group => Math.max(1.2, group.children.length || 1))
  const totalGroupWeight = Math.max(1, groupWeights.reduce((sum, weight) => sum + weight, 0))
  const groupAngles = new Map<string, { start: number, end: number, mid: number }>()
  let angleCursor = -Math.PI / 2
  parentGroups.forEach((group, index) => {
    const span = Math.PI * 2 * groupWeights[index] / totalGroupWeight
    const start = angleCursor
    const end = angleCursor + span
    const mid = start + span / 2
    if (group.parent)
    { groupAngles.set(group.parent.id, { start, end, mid }) }
    angleCursor = end
  })
  const secondNodeLayout = new Map<string, { x: number, y: number, weight: number }>()

  parentGroups.forEach((group, groupIndex) => {
    const fallbackSpan = Math.PI * 2 / Math.max(1, parentGroups.length)
    const sector = group.parent
      ? groupAngles.get(group.parent.id)
      : {
        start: -Math.PI / 2 + fallbackSpan * groupIndex,
        end: -Math.PI / 2 + fallbackSpan * (groupIndex + 1),
        mid: -Math.PI / 2 + fallbackSpan * (groupIndex + 0.5),
      }
    if (!sector)
    { return }
    const gap = dense ? 0.1 : 0.16
    const usableStart = sector.start + gap / 2
    const usableEnd = sector.end - gap / 2
    const usableSpan = Math.max(0.16, usableEnd - usableStart)
    const maxPerTrack = extraDense ? 3 : dense ? 4 : 7
    const tracks = Math.max(1, Math.ceil(group.children.length / maxPerTrack))
    const perTrack = Math.max(1, Math.ceil(group.children.length / tracks))

    group.children.forEach((node, index) => {
      const track = Math.floor(index / perTrack)
      const trackStart = track * perTrack
      const countOnTrack = Math.max(1, Math.min(perTrack, group.children.length - trackStart))
      const indexOnTrack = index - trackStart
      const angle = usableStart + usableSpan * ((indexOnTrack + 0.5) / countOnTrack)
      const radiusX = clamp((extraDense ? 31 : 32) + track * (extraDense ? 8.2 : dense ? 7.1 : 5.4), 29, extraDense ? 62 : dense ? 58 : 49)
      const radiusY = clamp((extraDense ? 23 : 24) + track * (extraDense ? 6.2 : dense ? 5.4 : 4.4), 21, extraDense ? 52 : dense ? 48 : 42)
      const point = nodePoint({
        angle,
        radiusX,
        radiusY,
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: bounds.minY,
        maxY: bounds.maxY,
      })
      secondNodeLayout.set(node.id, {
        ...point,
        weight: Math.max(5.5, node.weight - (extraDense ? 2.2 : dense ? 1.8 : 1.1)),
      })
    })
  })

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
    const sector = groupAngles.get(node.id)
    const firstRingIndex = Math.max(0, firstRing.findIndex(item => item.id === node.id))
    const firstRingAngle = sector?.mid ?? -Math.PI / 2 + (Math.PI * 2 * firstRingIndex) / Math.max(1, firstRing.length)
    const secondLayout = secondNodeLayout.get(node.id)
    if (!isFirstRing && secondLayout) {
      return {
        ...node,
        ...secondLayout,
      }
    }
    const point = nodePoint({
      angle: firstRingAngle,
      radiusX: extraDense ? 19.5 : dense ? 21 : 23,
      radiusY: extraDense ? 14.5 : dense ? 15.5 : 17,
      minX: 14,
      maxX: 86,
      minY: 16,
      maxY: 84,
    })
    return {
      ...node,
      ...point,
      weight: isFirstRing ? Math.max(node.weight, dense ? 8.8 : 9.2) : Math.max(6.2, node.weight - (dense ? 1.6 : 1)),
    }
  })

  return { nodes: relaxNodeCollisions(nodes, center.id, dense, extraDense), edges: graph.edges }
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
