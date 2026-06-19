import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, isDifyConfigured, requireDifyClient } from '@/app/api/utils/common'

export async function POST(request: NextRequest, { params }: {
  params: Promise<{ messageId: string }>
}) {
  const body = await request.json()
  const {
    rating,
  } = body
  const { messageId } = await params
  const { user } = getInfo(request)
  if (!isDifyConfigured)
  { return NextResponse.json({ result: 'success' }) }
  const { data } = await requireDifyClient().messageFeedback(messageId, rating, user)
  return NextResponse.json(data)
}
