import { NextResponse } from 'next/server'
import { refreshKnowledgeDocuments } from '@/lib/dify-dataset'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const isVercelCronRequest = (request: Request) => {
  const userAgent = request.headers.get('user-agent') || ''
  const schedule = request.headers.get('x-vercel-cron-schedule') || ''
  return userAgent.includes('vercel-cron') && schedule === '*/30 * * * *'
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const hasValidSecret = Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`)
  if (!hasValidSecret && !isVercelCronRequest(request))
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  try {
    const result = await refreshKnowledgeDocuments({ page: 1, limit: 1, recordFailure: true })
    return NextResponse.json({
      ok: !result.stale,
      total: result.total,
      refreshed_at: result.refreshed_at,
      stale: result.stale || false,
      refresh_error: result.refresh_error,
    }, { status: result.stale ? 503 : 200 })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'LIBRARY_CATALOG_REFRESH_FAILED'
    console.error('[library-catalog] cron refresh failed', { error: message })
    return NextResponse.json({
      ok: false,
      stale: true,
      error: message,
    }, { status: 503 })
  }
}
