import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { passwordPattern, passwordPolicyHint } from '@/lib/password-policy'

const schema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码').max(72),
  newPassword: z.string().regex(passwordPattern, `新密码${passwordPolicyHint}`),
})

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: '请先登录' }, { status: 401 }) }
  if (session.username.startsWith('qq_'))
  { return NextResponse.json({ error: 'QQ 独立账号请先绑定账号密码账户' }, { status: 400 }) }
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success)
  { return NextResponse.json({ error: parsed.error.issues[0]?.message || '密码格式无效' }, { status: 400 }) }
  const user = await db.appUser.findUnique({ where: { id: session.id }, select: { passwordHash: true } })
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)))
  { return NextResponse.json({ error: '当前密码不正确' }, { status: 400 }) }
  await db.appUser.update({
    where: { id: session.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.newPassword, 12),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  })
  return NextResponse.json({ ok: true })
}
