import { NextResponse } from 'next/server'
import { listKnowledgeDocuments } from '@/lib/dify-dataset'
import { getSession } from '@/lib/session'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const params = new URL(request.url).searchParams
  try {
    const data = await listKnowledgeDocuments({
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
    const message = error instanceof Error && error.message === 'DIFY_DATASET_NOT_CONFIGURED'
      ? 'Knowledge base API is not configured'
      : 'Unable to load knowledge base documents'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
