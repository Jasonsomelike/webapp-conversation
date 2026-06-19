import { NextResponse } from 'next/server'
import { getSecurityQuestion } from '@/lib/auth'

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get('username')?.trim()
  if (!username)
  { return NextResponse.json({ error: '请输入账号' }, { status: 400 }) }

  try {
    const user = await getSecurityQuestion(username)
    if (!user)
    { return NextResponse.json({ error: '未找到该账号' }, { status: 404 }) }
    return NextResponse.json({ securityQuestion: user.securityQuestion })
  }
  catch (error) {
    if (error instanceof Error && error.message === 'DATABASE_NOT_CONFIGURED')
    { return NextResponse.json({ error: '账号服务尚未完成数据库配置' }, { status: 503 }) }
    return NextResponse.json({ error: '暂时无法读取安全问题' }, { status: 500 })
  }
}
