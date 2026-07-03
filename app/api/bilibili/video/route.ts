import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const BVID_PATTERN = /^BV[0-9A-Za-z]{10,16}$/

const normalizeImageUrl = (value?: string) => {
  if (!value)
  { return '' }
  if (value.startsWith('//'))
  { return `https:${value}` }
  if (value.startsWith('http://'))
  { return `https://${value.slice('http://'.length)}` }
  return value
}

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0)
  { return '' }
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  const bvid = request.nextUrl.searchParams.get('bvid')?.trim() || ''
  if (!BVID_PATTERN.test(bvid)) {
    return NextResponse.json({ error: 'Invalid bvid' }, { status: 400 })
  }

  const upstream = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      'Referer': 'https://www.bilibili.com/',
      'Accept': 'application/json,text/plain,*/*',
    },
    next: { revalidate: 60 * 60 * 24 },
  }).catch(() => null)

  if (!upstream?.ok) {
    return NextResponse.json({ error: 'Unable to fetch bilibili video metadata' }, { status: 502 })
  }

  const payload = await upstream.json().catch(() => null)
  if (!payload || payload.code !== 0 || !payload.data) {
    return NextResponse.json({ error: payload?.message || 'Bilibili video not found' }, { status: 404 })
  }

  const data = payload.data
  return NextResponse.json({
    bvid,
    title: String(data.title || bvid),
    owner: String(data.owner?.name || 'bilibili'),
    pic: normalizeImageUrl(String(data.pic || '')),
    duration: Number(data.duration || 0),
    durationText: formatDuration(Number(data.duration || 0)),
    views: Number(data.stat?.view || 0),
    likes: Number(data.stat?.like || 0),
    url: `https://www.bilibili.com/video/${bvid}`,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
