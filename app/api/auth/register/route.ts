import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { registerSchema, registerUser } from '@/lib/auth'
import { setSessionCookie } from '@/lib/session'
import { PENDING_QQ_COOKIE, bindQqIdentityToUser, verifyPendingQqToken } from '@/lib/qq-auth'

export async function POST(request: NextRequest) {
  const parsed = registerSchema.safeParse(await request.json())
  if (!parsed.success)
  { return NextResponse.json({ error: parsed.error.issues[0]?.message || '注册信息不完整' }, { status: 400 }) }

  try {
    const user = await registerUser(parsed.data)
    const response = NextResponse.json({ ok: true }, { status: 201 })
    const pendingQq = verifyPendingQqToken(request.cookies.get(PENDING_QQ_COOKIE)?.value)
    if (pendingQq) {
      try {
        await bindQqIdentityToUser({
          appUserId: user.id,
          appId: pendingQq.appId,
          openId: pendingQq.openId,
          unionId: pendingQq.unionId,
          qqNumber: pendingQq.qqNumber,
        })
        response.cookies.set(PENDING_QQ_COOKIE, '', { path: '/', maxAge: 0 })
      }
      catch (bindError) {
        console.warn('[auth-register] pending QQ auto-bind failed', {
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
    if (error instanceof Error && error.message === 'USERNAME_EXISTS')
    { return NextResponse.json({ error: '该账号已被注册' }, { status: 409 }) }
    if (error instanceof Error && error.message === 'DATABASE_NOT_CONFIGURED')
    { return NextResponse.json({ error: '账号服务尚未完成数据库配置' }, { status: 503 }) }
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 })
  }
}
