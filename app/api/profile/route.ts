import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return NextResponse.json({
    user: session,
    profile: {
      learningStage: '复习',
      preferredStyle: '图示讲解',
      target: '期末考试',
    },
  })
}
