import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserReferences } from '@/lib/user-data'

export async function GET() {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  try {
    return NextResponse.json({ data: await getUserReferences(session.id) })
  }
  catch (error) {
    console.error('[sources-api] failed to load user references', {
      appUserId: session.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({
      data: [],
      error_message: '数据连接短暂波动，当前先展示空状态；请稍后刷新，不会影响账号数据。',
    }, {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    })
  }
}
