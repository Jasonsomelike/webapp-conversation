import type { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'

const allowedHost = 'dify.jasonsome.cn'

export async function GET(request: NextRequest) {
  if (!getSessionFromRequest(request))
  { return new Response('Unauthorized', { status: 401 }) }

  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl)
  { return new Response('Missing url', { status: 400 }) }

  let target: URL
  try {
    target = new URL(rawUrl)
  }
  catch {
    return new Response('Invalid url', { status: 400 })
  }

  if (target.protocol !== 'https:' || target.hostname !== allowedHost)
  { return new Response('Forbidden', { status: 403 }) }

  const headers: HeadersInit = {}
  if (process.env.DIFY_API_KEY)
  { headers.Authorization = `Bearer ${process.env.DIFY_API_KEY}` }

  const upstream = await fetch(target, { headers, cache: 'no-store' })
  if (!upstream.ok || !upstream.body)
  { return new Response('Upstream file unavailable', { status: upstream.status }) }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
