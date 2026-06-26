import { createHmac, randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { getInfo } from '@/app/api/utils/common'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request)
  if (!session)
  { return Response.json({ error: 'Unauthorized' }, { status: 401 }) }

  const baseUrl = process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '')
  const token = process.env.LIBRARY_FILE_SERVICE_TOKEN
  const { user } = getInfo(request)
  if (!baseUrl || !token || !user)
  { return Response.json({ error: 'Upload relay is not configured' }, { status: 503 }) }

  const requestId = randomUUID()
  const expires = String(Math.floor(Date.now() / 1000) + 120)
  const canonical = `${user}\n${requestId}\n${expires}`
  const signature = createHmac('sha256', token).update(canonical).digest('base64url')
  const url = new URL(`${baseUrl}/files/upload`)
  url.searchParams.set('requestId', requestId)
  url.searchParams.set('expires', expires)
  url.searchParams.set('signature', signature)

  return Response.json({
    url: url.toString(),
    user,
    requestId,
    expires: Number(expires),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
