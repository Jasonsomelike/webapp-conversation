import { createHash } from 'node:crypto'

export interface ExtractedReference {
  content?: string
  dataset_name?: string
  document_name?: string
  document_id?: string
  segment_id?: string
  segment_position?: number
  score?: number
  page?: number
  page_number?: number
  original_page_number?: number
  page_image_url?: string
  url?: string
  [key: string]: unknown
}

const documentExtension = /\.(?:docx?|md|pdf|pptx?|txt|xlsx?)$/i
const imageUrlPattern = /(?:https?:\/\/dify\.jasonsome\.cn:22380)?\/(?:files|page-images)\/[^\s<>"')\]]+\.(?:avif|gif|jpe?g|png|webp)(?:\?[^\s<>"')\]]*)?/gi

const stableSegmentId = (value: string) =>
  `derived_${createHash('sha256').update(value).digest('hex').slice(0, 28)}`

export const cleanReferenceDocumentName = (value: unknown) => {
  let name = String(value || '').trim()
  const quotedParts = name.split(/["“”'‘’`|]/).map(part => part.trim()).filter(Boolean)
  const quotedFilename = [...quotedParts].reverse().find(part => documentExtension.test(part))
  if (quotedFilename)
  { name = quotedFilename }
  const afterMarker = name.match(/(?:即|来源(?:文件|文档)?|文件名)\s*[:：]?\s*(.+\.(?:docx?|md|pdf|pptx?|txt|xlsx?))/i)
  if (afterMarker?.[1])
  { name = afterMarker[1] }
  return name
    .replace(/^[\s\-–—*#>|![\]()"'“”‘’]+/, '')
    .replace(/[\s)"'“”‘’]+$/, '')
    .trim()
}

const asNumber = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

const referenceFromObject = (value: Record<string, any>): ExtractedReference | null => {
  const metadata = value.metadata && typeof value.metadata === 'object' ? value.metadata : {}
  const rawDocumentName = value.document_name
    || value.documentName
    || metadata.document_name
    || metadata.documentName
    || value.title
  const content = value.content || value.text || value.quote || value.page_content
  const segmentId = value.segment_id || value.segmentId || metadata.segment_id
  const pageImageUrl = value.page_image_url || value.pageImageUrl || metadata.page_image_url
  const sourceUrl = value.url || value.source_url || metadata.url
  const documentName = rawDocumentName ? cleanReferenceDocumentName(rawDocumentName) : ''
  const pageFromImage = String(pageImageUrl || sourceUrl || '').match(/\/page_(\d+)\.(?:jpe?g|png|webp)/i)?.[1]

  if (!documentName && !segmentId && !pageImageUrl)
  { return null }
  if (documentName && !documentExtension.test(String(documentName)) && !segmentId && !pageImageUrl)
  { return null }

  const identity = [
    documentName,
    segmentId,
    value.page_number || value.page || value.segment_position,
    String(content || '').slice(0, 160),
    pageImageUrl,
  ].join('|')
  return {
    document_name: documentName ? String(documentName) : '知识库文档',
    dataset_name: value.dataset_name || value.datasetName || metadata.dataset_name,
    document_id: value.document_id || value.documentId || metadata.document_id,
    segment_id: segmentId ? String(segmentId) : stableSegmentId(identity),
    content: content ? String(content) : undefined,
    score: asNumber(value.score || metadata.score),
    segment_position: asNumber(value.segment_position || metadata.segment_position),
    page: asNumber(value.page || metadata.page),
    page_number: asNumber(value.page_number || metadata.page_number || pageFromImage),
    original_page_number: asNumber(value.original_page_number || metadata.original_page_number),
    page_image_url: pageImageUrl ? String(pageImageUrl) : undefined,
    url: sourceUrl ? String(sourceUrl) : undefined,
  }
}

const collectFromUnknown = (
  value: unknown,
  output: ExtractedReference[],
  seen: WeakSet<object>,
  depth = 0,
) => {
  if (depth > 9 || value === null || value === undefined)
  { return }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length < 1_500_000) {
      try {
        collectFromUnknown(JSON.parse(trimmed), output, seen, depth + 1)
      }
      catch {
        // Tool output may be prose rather than JSON.
      }
    }
    return
  }

  if (typeof value !== 'object')
  { return }
  if (seen.has(value))
  { return }
  seen.add(value)

  if (Array.isArray(value)) {
    value.forEach(item => collectFromUnknown(item, output, seen, depth + 1))
    return
  }

  const record = value as Record<string, unknown>
  const reference = referenceFromObject(record)
  if (reference)
  { output.push(reference) }
  Object.values(record).forEach(item => collectFromUnknown(item, output, seen, depth + 1))
}

const referencesFromAnswer = (answer: string): ExtractedReference[] => {
  const references: ExtractedReference[] = []
  const documentMatches = [...answer.matchAll(/(?:来源文件|来源文档|教材来源|文件名)\s*[:：]?\s*[`*_]*([^\n`*]+?\.(?:docx?|md|pdf|pptx?|txt|xlsx?))/gi)]
  const imageMatches = [...answer.matchAll(imageUrlPattern)]

  documentMatches.forEach((match, index) => {
    const documentName = cleanReferenceDocumentName(match[1])
    const window = answer.slice(match.index || 0, (match.index || 0) + 600)
    const originalPage = window.match(/原\s*PDF\s*第\s*(\d+)\s*页/i)
    const page = window.match(/(?:分卷内|来源页码|第)\s*第?\s*(\d+)\s*页/i)
    const nearestImage = imageMatches.find(image => (image.index || 0) >= (match.index || 0) && (image.index || 0) < (match.index || 0) + 900)
    const identity = `${documentName}|${originalPage?.[1] || page?.[1] || index}|`
    references.push({
      document_name: documentName,
      segment_id: stableSegmentId(identity),
      content: window.split('\n').slice(0, 3).join(' ').slice(0, 800),
      page_number: asNumber(page?.[1]),
      original_page_number: asNumber(originalPage?.[1]),
      page_image_url: nearestImage?.[0],
      url: nearestImage?.[0],
    })
  })

  imageMatches.forEach((match, index) => {
    if (references.some(reference => reference.page_image_url === match[0]))
    { return }
    const before = answer.slice(Math.max(0, (match.index || 0) - 500), match.index || 0)
    const rawDocumentName = [...before.matchAll(/([^\n`*]+?\.(?:docx?|md|pdf|pptx?|txt|xlsx?))/gi)].pop()?.[1]
    const documentName = cleanReferenceDocumentName(rawDocumentName)
    if (!documentName)
    { return }
    references.push({
      document_name: documentName,
      segment_id: stableSegmentId(`${documentName}|${match[0]}|${index}`),
      page_number: asNumber(match[0].match(/\/page_(\d+)\./i)?.[1]),
      page_image_url: match[0],
      url: match[0],
    })
  })

  return references
}

export const extractKnowledgeReferences = ({
  metadata,
  agentLogs,
  answer,
}: {
  metadata?: Record<string, any>
  agentLogs: unknown[]
  answer: string
}) => {
  const references: ExtractedReference[] = [
    ...((metadata?.retriever_resources || []) as ExtractedReference[]),
  ]
  const seenObjects = new WeakSet<object>()
  agentLogs.forEach(log => collectFromUnknown(log, references, seenObjects))
  references.push(...referencesFromAnswer(answer))

  const unique = new Map<string, ExtractedReference>()
  references.forEach((reference) => {
    const key = reference.segment_id
      || `${reference.document_name}|${reference.page_number || reference.original_page_number || ''}|${reference.page_image_url || ''}`
    if (!key)
    { return }
    const existing = unique.get(key)
    unique.set(key, {
      ...existing,
      ...reference,
      content: reference.content || existing?.content,
      page_image_url: reference.page_image_url || existing?.page_image_url,
      url: reference.url || existing?.url,
    })
  })
  return [...unique.values()]
}
