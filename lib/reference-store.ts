'use client'

import type { CitationItem } from '@/app/components/chat/type'
import type { KnowledgeReference } from '@/lib/demo-data'

const storageKey = 'network-study:references'
const referenceKey = (reference: KnowledgeReference) =>
  `${reference.documentName}:${reference.pageNumber || ''}:${reference.quote || ''}`

const pageFromDocumentName = (name: string, segmentPosition?: number) => {
  if (!segmentPosition)
  { return undefined }

  const matched = name.match(/_p(\d+)-(\d+)\.pdf$/i)
  return matched ? Number(matched[1]) + segmentPosition - 1 : undefined
}

export const normalizeCitations = (
  citations: CitationItem[],
  conversationId: string,
  messageId?: string,
): KnowledgeReference[] => citations.map(citation => ({
  id: `${messageId || 'message'}:${citation.segment_id}`,
  conversationId,
  messageId,
  documentName: citation.document_name,
  datasetName: citation.dataset_name,
  pageNumber: citation.segment_position,
  originalPageNumber: pageFromDocumentName(citation.document_name, citation.segment_position),
  quote: citation.content,
  score: citation.score,
  topic: '知识库引用',
  createdAt: new Date().toISOString(),
}))

export const saveReferences = (references: KnowledgeReference[]) => {
  if (!references.length)
  { return }

  const current = readReferences()
  const merged = [...references, ...current]
    .filter((item, index, list) => list.findIndex(candidate => referenceKey(candidate) === referenceKey(item)) === index)
    .slice(0, 100)
  globalThis.localStorage?.setItem(storageKey, JSON.stringify(merged))
}

export const readReferences = (): KnowledgeReference[] => {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(storageKey) || '[]')
  }
  catch {
    return []
  }
}
