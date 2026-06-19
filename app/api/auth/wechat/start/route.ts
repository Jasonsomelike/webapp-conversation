import { NextResponse } from 'next/server'
import { createWechatState, WECHAT_STATE_COOKIE } from '@/lib/session'

export async function GET(request: Request) {
  const appId = process.env.WECHAT_APP_ID
  const baseUrl = process.env.AUTH_URL || new URL(request.url).origin
  if (!appId)
  { return NextResponse.redirect(new URL('/login?error=wechat_not_configured', baseUrl)) }

  const state = createWechatState()
  const callback = encodeURIComponent(`${baseUrl}/api/auth/wechat/callback`)
  const authorizeUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${callback}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`
  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set(WECHAT_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(process.env.VERCEL) || baseUrl.startsWith('https://'),
    path: '/',
    maxAge: 600,
  })
  return response
}
