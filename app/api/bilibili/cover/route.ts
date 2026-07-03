import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const normalizeCoverUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed)
  { return null }
  const withProtocol = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed
  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
    { return null }
    const host = parsed.hostname.toLowerCase()
    const allowedHost = host === 'hdslb.com' || host.endsWith('.hdslb.com') || host === 'biliimg.com' || host.endsWith('.biliimg.com')
    if (!allowedHost || !parsed.pathname.startsWith('/bfs/'))
    { return null }
    parsed.protocol = 'https:'
    parsed.hash = ''
    return parsed
  }
  catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const target = normalizeCoverUrl(request.nextUrl.searchParams.get('url') || '')
  if (!target) {
    return NextResponse.json({ error: 'Invalid bilibili cover url' }, { status: 400 })
  }

  const upstream = await fetch(target, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      'Referer': 'https://www.bilibili.com/',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
    next: { revalidate: 60 * 60 * 24 * 7 },
  }).catch(() => null)

  if (!upstream?.ok || !upstream.body) {
    return NextResponse.json({ error: 'Unable to fetch bilibili cover' }, { status: 502 })
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg'
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'Bilibili cover is not an image' }, { status: 502 })
  }

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
  })
  const contentLength = upstream.headers.get('content-length')
  if (contentLength)
  { headers.set('Content-Length', contentLength) }

  return new NextResponse(upstream.body, { status: 200, headers })
}
