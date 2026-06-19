import type { NextRequest } from 'next/server'
import { getInfo, isDifyConfigured, requireDifyClient } from '@/app/api/utils/common'

export async function POST(request: NextRequest) {
  try {
    if (!isDifyConfigured)
    { return new Response('演示模式暂不支持上传文件', { status: 503 }) }

    const formData = await request.formData()
    const { user } = getInfo(request)
    if (!user)
    { return new Response('Unauthorized', { status: 401 }) }
    formData.append('user', user)
    const res = await requireDifyClient().fileUpload(formData)
    return new Response(res.data.id as any)
  }
  catch (e: any) {
    return new Response(e.message)
  }
}
