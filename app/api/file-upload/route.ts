import type { NextRequest } from 'next/server'
import { getInfo, isDifyConfigured } from '@/app/api/utils/common'
import { fetchDify } from '@/lib/dify-server'
import { isParsedUploadSupported, saveParsedUpload } from '@/lib/parsed-uploads'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session)
    { return new Response('Unauthorized', { status: 401 }) }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File))
    { return new Response('请选择有效文件', { status: 400 }) }

    const isImageUpload = file.type.startsWith('image/') || /\.(?:png|jpe?g|webp|gif)$/i.test(file.name)
    if (!isImageUpload) {
      if (!isParsedUploadSupported(file.name)) {
        return new Response('目前支持解析 PDF、DOCX、TXT、MD 和 CSV 文件', { status: 415 })
      }
      if (file.size > 30 * 1024 * 1024)
      { return new Response('文档不能超过 30 MB', { status: 413 }) }
      try {
        return new Response(await saveParsedUpload({ appUserId: session.id, file }))
      }
      catch (error) {
        const code = error instanceof Error ? error.message : String(error)
        console.error('[document-upload] parse failed', {
          appUserId: session.id,
          filename: file.name,
          size: file.size,
          code,
          stack: error instanceof Error ? error.stack : undefined,
        })
        const message = code === 'DOCUMENT_TEXT_EMPTY'
          ? '文件中没有提取到可解析的文本；扫描版 PDF 请先进行 OCR'
          : code === 'UNSUPPORTED_DOCUMENT_TYPE'
            ? '目前支持解析 PDF、DOCX、TXT、MD 和 CSV 文件'
            : '文档解析失败，请检查文件是否损坏或加密'
        return new Response(message, { status: code === 'UNSUPPORTED_DOCUMENT_TYPE' ? 415 : 422 })
      }
    }

    if (!isDifyConfigured)
    { return new Response('演示模式暂不支持上传图片', { status: 503 }) }
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
  catch (error) {
    return new Response(error instanceof Error ? error.message : 'Upload failed', { status: 500 })
  }
}
