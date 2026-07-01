import { NextResponse } from 'next/server'
import { attachUserKnowledgeDocumentHitCounts, describeKnowledgeCatalogError, listKnowledgeDocuments, refreshKnowledgeDocuments } from '@/lib/dify-dataset'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const params = new URL(request.url).searchParams
  try {
    const wantsRefresh = params.get('refresh') === '1'
    const wantsAll = params.get('all') === '1'
    const data = await (wantsRefresh
      ? refreshKnowledgeDocuments
      : listKnowledgeDocuments)({
      page: Number(params.get('page') || 1),
      limit: Number(params.get('limit') || 20),
      keyword: params.get('keyword') || '',
      status: params.get('status') || '',
      all: wantsAll,
    })
    const enrichedData = await attachUserKnowledgeDocumentHitCounts(data, session.id)
    return NextResponse.json({
      ...enrichedData,
      refresh_pending: false,
    }, {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    })
  }
  catch (error) {
    const detail = error instanceof Error ? error.message : 'UNKNOWN_LIBRARY_DOCUMENTS_ERROR'
    const message = detail === 'DIFY_DATASET_NOT_CONFIGURED'
      ? 'Knowledge base API is not configured'
      : detail === 'LIBRARY_CATALOG_EMPTY'
        ? 'Knowledge base catalog is not initialized'
        : 'Unable to load knowledge base documents'
    console.error('[library-documents] request failed', { detail })
    return NextResponse.json({ error: message, detail, error_message: describeKnowledgeCatalogError(detail) }, { status: 503 })
  }
}
