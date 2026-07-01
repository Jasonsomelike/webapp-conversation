import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const legacyHosts = new Set([
  'bestijason.cn',
  'jasonsome.cn',
])

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase()
  const alreadyCanonical = hostname === 'www.jasonsome.cn' && request.nextUrl.protocol === 'https:'
  if (alreadyCanonical || !legacyHosts.has(hostname))
  {
    const headers = new Headers(request.headers)
    headers.set('x-pathname', request.nextUrl.pathname)
    return NextResponse.next({ request: { headers } })
  }

  const url = request.nextUrl.clone()
  url.protocol = 'https:'
  url.hostname = 'www.jasonsome.cn'
  url.port = ''
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: '/:path*',
}
