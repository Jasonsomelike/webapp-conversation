import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authenticateUser, credentialsSchema } from '@/lib/auth'
import { setSessionCookie } from '@/lib/session'
import { PENDING_QQ_COOKIE, bindQqIdentityToUser, verifyPendingQqToken } from '@/lib/qq-auth'

export async function POST(request: NextRequest) {
  const parsed = credentialsSchema.safeParse(await request.json())
  if (!parsed.success)
  { return NextResponse.json({ error: parsed.error.issues[0]?.message || '请输入有效的账号和密码' }, { status: 400 }) }

  try {
    const user = await authenticateUser(parsed.data.username, parsed.data.password)
    if (!user)
    { return NextResponse.json({ error: '账号或密码不正确' }, { status: 401 }) }

    const response = NextResponse.json({ ok: true })
    const pendingQq = verifyPendingQqToken(request.cookies.get(PENDING_QQ_COOKIE)?.value)
    if (pendingQq) {
      try {
        await bindQqIdentityToUser({
          appUserId: user.id,
          appId: pendingQq.appId,
          openId: pendingQq.openId,
          unionId: pendingQq.unionId,
        })
        response.cookies.set(PENDING_QQ_COOKIE, '', { path: '/', maxAge: 0 })
      }
      catch (bindError) {
        console.warn('[auth-login] pending QQ auto-bind failed', {
          appUserId: user.id,
          error: bindError instanceof Error ? bindError.message : String(bindError),
        })
        response.cookies.set(PENDING_QQ_COOKIE, '', { path: '/', maxAge: 0 })
      }
    }
    setSessionCookie(response, {
      id: user.id,
      difyUserId: user.difyUserId,
      username: user.username,
      name: user.displayName,
      theme: user.theme,
      provider: 'account',
      createdAt: Date.now(),
    })
    return response
  }
  catch (error) {
    if (error instanceof Error && error.message === 'ACCOUNT_LOCKED')
    { return NextResponse.json({ error: '登录失败次数过多，请 15 分钟后再试' }, { status: 423 }) }
    if (error instanceof Error && error.message === 'DATABASE_NOT_CONFIGURED')
    { return NextResponse.json({ error: '账号服务尚未完成数据库配置' }, { status: 503 }) }
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 })
  }
}
