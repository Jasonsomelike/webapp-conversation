import { NextResponse } from 'next/server'
import { refreshKnowledgeDocuments } from '@/lib/dify-dataset'
import { pruneExpiredGuestAccounts } from '@/lib/guest-lifecycle'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const isVercelCronRequest = (request: Request) => {
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase()
  const schedule = request.headers.get('x-vercel-cron-schedule')?.trim()
  return userAgent.includes('vercel-cron') && (!schedule || schedule === '*/30 * * * *')
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const hasValidSecret = Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`)
  if (!hasValidSecret && !isVercelCronRequest(request))
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  try {
    const result = await refreshKnowledgeDocuments({ page: 1, limit: 1, recordFailure: true })
    const guestCleanup = await pruneExpiredGuestAccounts()
    const usingCachedFallback = result.refresh_error_kind === 'cached-fallback'
    const ok = !result.stale || usingCachedFallback
    return NextResponse.json({
      ok,
      refreshed: !result.stale,
      using_cached_fallback: usingCachedFallback,
      total: result.total,
      refreshed_at: result.refreshed_at,
      stale: result.stale || false,
      refresh_error: result.refresh_error,
      guest_cleanup: guestCleanup,
    }, { status: ok ? 200 : 503 })
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
