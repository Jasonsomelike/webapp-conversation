import {
  buildHierarchyGraph,
  sliceGraphAround,
  type HierarchyGraphSlice,
} from '@/lib/hierarchical-graph'
import {
  textbookReviewGraphEdges,
  textbookReviewGraphNodes,
  textbookReviewGraphRootNodeId,
} from '@/lib/textbook-review-graph-data'

export const textbookReviewGraphDefaultDepth = 2
export const textbookReviewGraphSourceNotice = '总复习 Freeplane .mm 转译图谱'
export { textbookReviewGraphRootNodeId }

export const textbookReviewKnowledgeGraph = buildHierarchyGraph({
  nodes: textbookReviewGraphNodes,
  edges: textbookReviewGraphEdges,
  rootNodeId: textbookReviewGraphRootNodeId,
  sourceName: '《计算机网络》总复习思维导图',
})

export const getTextbookReviewGraphAround = (
  requestedCenterNodeId = textbookReviewGraphRootNodeId,
  depth = textbookReviewGraphDefaultDepth,
): HierarchyGraphSlice => sliceGraphAround({
  graph: textbookReviewKnowledgeGraph,
  rootNodeId: textbookReviewGraphRootNodeId,
  requestedCenterNodeId,
  depth,
  excludeParentFromSlice: true,
})
