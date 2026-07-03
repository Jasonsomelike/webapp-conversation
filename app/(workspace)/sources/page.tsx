import { redirect } from 'next/navigation'
import SourcesView from '@/app/components/sources/sources-view'
import { findKnowledgeDocumentByName, getKnowledgeDocumentPageImages } from '@/lib/dify-dataset'
import type { KnowledgeReference } from '@/lib/learning-types'
import { getSession } from '@/lib/session'
import { getUserReferences } from '@/lib/user-data'

const inferReferencePage = (reference: KnowledgeReference) =>
  Number(String(reference.pageImageUrl || '').match(/\/page_(\d+)\./i)?.[1] || 0)
  || reference.pageNumber
  || reference.originalPageNumber
  || 1

const hydrateReferencePageImages = async (references: KnowledgeReference[]) => {
  const pdfReferences = references.filter(reference => /\.pdf$/i.test(reference.documentName || ''))
  const documentKeys = new Map<string, { documentId?: string, documentName: string }>()
  pdfReferences.forEach((reference) => {
    const key = reference.documentId || reference.documentName
    if (key && !documentKeys.has(key))
    { documentKeys.set(key, { documentId: reference.documentId, documentName: reference.documentName }) }
  })

  const imageMaps = new Map<string, Map<number, string>>()
  const queue = [...documentKeys.entries()].slice(0, 80)
  const hydrateOne = async ([key, item]: [string, { documentId?: string, documentName: string }]) => {
    const document = await findKnowledgeDocumentByName(item.documentName, item.documentId).catch(() => null)
    const documentId = document?.id || item.documentId
    if (!documentId)
    { return }
    const images = await getKnowledgeDocumentPageImages(documentId).catch(() => [])
    if (!images.length)
    { return }
    const pageMap = new Map(images.map(image => [image.page, image.url]))
    imageMaps.set(key, pageMap)
    if (item.documentId)
    { imageMaps.set(item.documentId, pageMap) }
    imageMaps.set(item.documentName, pageMap)
  }
  for (let index = 0; index < queue.length; index += 6)
  { await Promise.all(queue.slice(index, index + 6).map(hydrateOne)) }

  return references.map((reference) => {
    const key = reference.documentId || reference.documentName
    const pageImages = imageMaps.get(key) || imageMaps.get(reference.documentName)
    const page = inferReferencePage(reference)
    const freshUrl = pageImages?.get(page)
    return freshUrl ? { ...reference, pageImageUrl: freshUrl, pageNumber: page } : reference
  })
}

export default async function SourcesPage() {
  const session = await getSession()
  if (!session)
  { redirect('/login') }

  try {
    const references = await hydrateReferencePageImages(await getUserReferences(session.id))
    return <SourcesView initialReferences={references} />
  }
  catch (error) {
    console.error('[sources-page] failed to load user references', {
      appUserId: session.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return (
      <SourcesView
        initialReferences={[]}
        loadError="数据连接短暂波动，当前先展示空状态；请稍后刷新，不会影响账号数据。"
      />
    )
  }
}
