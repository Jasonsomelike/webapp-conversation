import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { setAccountAvatar } from '@/lib/account-extension'

const avatarSchema = z.object({
  avatar: z.string()
    .max(700_000, '头像文件过大')
    .regex(/^data:image\/(?:png|jpe?g|webp);base64,/i, '头像格式无效'),
})

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: '请先登录' }, { status: 401 }) }
  const parsed = avatarSchema.safeParse(await request.json())
  if (!parsed.success)
  { return NextResponse.json({ error: parsed.error.issues[0]?.message || '头像无效' }, { status: 400 }) }
  await setAccountAvatar(session.id, parsed.data.avatar)
  return NextResponse.json({ ok: true, avatar: parsed.data.avatar })
}
