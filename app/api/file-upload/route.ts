import type { NextRequest } from 'next/server'
import { getInfo, isDifyConfigured } from '@/app/api/utils/common'
import { fetchDify } from '@/lib/dify-server'

export async function POST(request: NextRequest) {
  try {
    if (!isDifyConfigured)
    { return new Response('演示模式暂不支持上传文件', { status: 503 }) }

    const formData = await request.formData()
    const { user } = getInfo(request)
    if (!user)
    { return new Response('Unauthorized', { status: 401 }) }
    formData.append('user', user)
    const upstream = await fetchDify('/files/upload', {
      method: 'POST',
      body: formData,
    }, { connectTimeoutMs: 30_000, retries: 0 })
    if (!upstream.ok) {
      const message = await upstream.text()
      return new Response(message || 'Upload failed', { status: upstream.status })
    }
    const result = await upstream.json() as { id?: string }
    if (!result.id)
    { return new Response('Upload response did not contain a file ID', { status: 502 }) }
    return new Response(result.id)
  }
  catch (e: any) {
    return new Response(e.message || 'Upload failed', { status: 500 })
  }
}
