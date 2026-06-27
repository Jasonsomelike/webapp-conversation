import { randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { getInfo, isDifyConfigured } from '@/app/api/utils/common'
import { fetchDify } from '@/lib/dify-server'
import { isParsedUploadSupported, saveParsedUpload } from '@/lib/parsed-uploads'
import { getSessionFromRequest } from '@/lib/session'

export const runtime = 'nodejs'
export const maxDuration = 60

const uploadViaLibraryFileService = async (file: File, user: string) => {
  const baseUrl = process.env.LIBRARY_FILE_SERVICE_URL?.replace(/\/$/, '')
  const token = process.env.LIBRARY_FILE_SERVICE_TOKEN
  if (!baseUrl || !token)
  { return null }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('user', user)
  const requestId = randomUUID()
  const response = await fetch(`${baseUrl}/files/upload`, {
    method: 'POST',
    headers: {
      'X-Internal-Token': token,
      'X-Request-Id': requestId,
    },
    body: formData,
    cache: 'no-store',
  })
  return { response, requestId }
}

const uploadDirectlyToDify = async (formData: FormData) => {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchDify('/files/upload', {
        method: 'POST',
        body: formData,
      }, { connectTimeoutMs: 30_000, retries: 1 })
      if (response.ok || ![408, 425, 429, 500, 502, 503, 504].includes(response.status))
      { return response }
      lastError = new Error(`DIFY_UPLOAD_RETRYABLE_STATUS:${response.status}`)
      await response.body?.cancel()
    }
    catch (error) {
      lastError = error
    }

    if (attempt < 2)
    { await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1))) }
  }
  throw lastError instanceof Error ? lastError : new Error('DIFY_UPLOAD_FAILED')
}

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
    let upstream = await uploadDirectlyToDify(formData).catch(async (error) => {
      console.warn('[file-upload] direct Dify upload failed, trying library file service', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    })
    if (!upstream?.ok) {
      const directStatus = upstream?.status
      const directMessage = upstream ? await upstream.text().catch(() => '') : ''
      const fallback = await uploadViaLibraryFileService(file, user).catch((error) => {
        console.error('[file-upload] library file service fallback failed', {
          error: error instanceof Error ? error.message : String(error),
        })
        return null
      })
      if (fallback?.response.ok)
      { upstream = fallback.response }
      else {
        const fallbackMessage = fallback ? await fallback.response.text().catch(() => '') : ''
        return new Response(
          fallbackMessage || directMessage || 'Upload failed',
          {
            status: fallback?.response.status || directStatus || 502,
            headers: fallback?.requestId ? { 'X-Request-Id': fallback.requestId } : undefined,
          },
        )
      }
    }
    const result = await upstream.json() as { id?: string }
    if (!result.id)
    { return new Response('Upload response did not contain a file ID', { status: 502 }) }
    return Response.json(result)
  }
  catch (error) {
    return new Response(error instanceof Error ? error.message : 'Upload failed', { status: 500 })
  }
}
