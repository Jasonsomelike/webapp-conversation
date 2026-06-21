import { NextResponse } from 'next/server'
import { refreshKnowledgeDocuments } from '@/lib/dify-dataset'

export const maxDuration = 60

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
