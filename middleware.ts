import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const legacyHosts = new Set([
  'bestijason.cn',
  'www.bestijason.cn',
  'jasonsome.cn',
])

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase()
  if (!legacyHosts.has(hostname))
  { return NextResponse.next() }

  const url = request.nextUrl.clone()
  url.protocol = 'https:'
  url.hostname = 'www.jasonsome.cn'
  url.port = ''
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: '/:path*',
}
