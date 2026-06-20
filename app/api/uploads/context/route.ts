import type { NextRequest } from 'next/server'
import { getParsedUploadContext } from '@/lib/parsed-uploads'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  const body = await request.json().catch(() => ({})) as { uploadIds?: unknown }
  const uploadIds = Array.isArray(body.uploadIds)
    ? body.uploadIds.map(value => String(value)).slice(0, 5)
    : []
  try {
    const context = await getParsedUploadContext(session.id, uploadIds)
    return Response.json({ context })
  }
  catch (error) {
    console.error('[parsed-upload-context] failed', { appUserId: session.id, error })
    return Response.json({ error: 'Unable to read uploaded documents' }, { status: 500 })
  }
}
