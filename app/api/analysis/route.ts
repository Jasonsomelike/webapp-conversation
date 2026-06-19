import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserAnalysis } from '@/lib/user-data'

export async function GET() {
  const session = await getSession()
  if (!session)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return NextResponse.json(await getUserAnalysis(session.id))
}
