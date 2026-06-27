import { NextResponse } from 'next/server'
import { listKnowledgeDocuments, refreshKnowledgeDocuments } from '@/lib/dify-dataset'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const params = new URL(request.url).searchParams
  try {
    const loadDocuments = params.get('refresh') === '1'
      ? refreshKnowledgeDocuments
      : listKnowledgeDocuments
    const data = await loadDocuments({
      page: Number(params.get('page') || 1),
      limit: Number(params.get('limit') || 20),
      keyword: params.get('keyword') || '',
      status: params.get('status') || '',
    })
    return NextResponse.json(data, {
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
    return NextResponse.json({ error: message, detail }, { status: 503 })
  }
}
