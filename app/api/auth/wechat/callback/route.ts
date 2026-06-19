import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  deriveDifyUserId,
  setSessionCookie,
  WECHAT_STATE_COOKIE,
} from '@/lib/session'

interface WechatTokenResponse {
  access_token?: string
  openid?: string
  unionid?: string
  errcode?: number
}

interface WechatProfile {
  nickname?: string
  headimgurl?: string
  openid?: string
  unionid?: string
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.AUTH_URL || request.nextUrl.origin
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const expectedState = request.cookies.get(WECHAT_STATE_COOKIE)?.value
  const appId = process.env.WECHAT_APP_ID
  const appSecret = process.env.WECHAT_APP_SECRET

  if (!code || !state || state !== expectedState || !appId || !appSecret)
  { return NextResponse.redirect(new URL('/login?error=wechat_callback', baseUrl)) }

  const tokenUrl = new URL('https://api.weixin.qq.com/sns/oauth2/access_token')
  tokenUrl.searchParams.set('appid', appId)
  tokenUrl.searchParams.set('secret', appSecret)
  tokenUrl.searchParams.set('code', code)
  tokenUrl.searchParams.set('grant_type', 'authorization_code')
  const tokenResponse = await fetch(tokenUrl, { cache: 'no-store' })
  const token = await tokenResponse.json() as WechatTokenResponse

  if (!token.access_token || !token.openid)
  { return NextResponse.redirect(new URL('/login?error=wechat_token', baseUrl)) }

  const profileUrl = new URL('https://api.weixin.qq.com/sns/userinfo')
  profileUrl.searchParams.set('access_token', token.access_token)
  profileUrl.searchParams.set('openid', token.openid)
  profileUrl.searchParams.set('lang', 'zh_CN')
  const profileResponse = await fetch(profileUrl, { cache: 'no-store' })
  const profile = await profileResponse.json() as WechatProfile
  const sourceId = token.unionid || profile.unionid || token.openid

  const response = NextResponse.redirect(new URL('/chat', baseUrl))
  response.cookies.delete(WECHAT_STATE_COOKIE)
  setSessionCookie(response, {
    id: deriveDifyUserId(sourceId),
    difyUserId: deriveDifyUserId(sourceId),
    name: profile.nickname || '微信学习者',
    avatar: profile.headimgurl,
    provider: 'wechat',
    createdAt: Date.now(),
  })
  return response
}
