import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { refreshKnowledgeDocuments, storeKnowledgeDocumentCatalog } from '@/lib/dify-dataset'

export const maxDuration = 60

const tokenMatches = (provided: string | null, expected: string | undefined) => {
  if (!provided || !expected)
  { return false }
  const left = Buffer.from(provided)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const result = await refreshKnowledgeDocuments({ page: 1, limit: 1, recordFailure: false })
  return NextResponse.json({
    ok: !result.stale,
    total: result.total,
    refreshed_at: result.refreshed_at,
    stale: result.stale || false,
  }, { status: result.stale ? 503 : 200 })
}

export async function POST(request: Request) {
  if (!tokenMatches(
    request.headers.get('x-internal-token'),
    process.env.LIBRARY_FILE_SERVICE_TOKEN,
  ))
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const body = await request.json() as { documents?: unknown }
  const result = await storeKnowledgeDocumentCatalog(body.documents)
  return NextResponse.json({
    ok: true,
    total: result.total,
    refreshed_at: result.refreshedAt.toISOString(),
  })
}
