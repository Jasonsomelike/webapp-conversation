import { NextResponse } from 'next/server'
import { resetPasswordSchema, resetUserPassword } from '@/lib/auth'

export async function POST(request: Request) {
  const parsed = resetPasswordSchema.safeParse(await request.json())
  if (!parsed.success)
  { return NextResponse.json({ error: parsed.error.issues[0]?.message || '重置密码信息不完整' }, { status: 400 }) }

  try {
    const reset = await resetUserPassword(parsed.data)
    if (!reset)
    { return NextResponse.json({ error: '账号或安全问题答案不正确' }, { status: 401 }) }
    return NextResponse.json({ ok: true })
  }
  catch (error) {
    if (error instanceof Error && error.message === 'DATABASE_NOT_CONFIGURED')
    { return NextResponse.json({ error: '账号服务尚未完成数据库配置' }, { status: 503 }) }
    return NextResponse.json({ error: '密码重置失败，请稍后重试' }, { status: 500 })
  }
}
