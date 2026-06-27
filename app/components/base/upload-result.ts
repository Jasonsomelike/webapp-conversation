'use client'

export interface UploadedFileResult {
  id: string
  url?: string
  preview_url?: string
  display_url?: string
  source_url?: string
  data?: Record<string, any>
}

export const isDataUrl = (value?: string) => Boolean(value && /^data:/i.test(value))

export const getStableUploadUrl = (res?: UploadedFileResult | null) => {
  if (!res)
  { return '' }
  const data = res.data || {}
  const candidates = [
    res.source_url,
    res.preview_url,
    res.display_url,
    res.url,
    data.source_url,
    data.preview_url,
    data.display_url,
    data.url,
    data.file_url,
  ]
  return String(candidates.find(value => typeof value === 'string' && value && !isDataUrl(value)) || '')
}

export const getDurableUploadedFilePreviewUrl = (fileId?: string) =>
  fileId
    ? `/api/dify/file-proxy?url=${encodeURIComponent(`https://dify.jasonsome.cn:22380/files/${fileId}/preview`)}`
    : ''

export const normalizeUploadedFileResult = (res: UploadedFileResult): UploadedFileResult => {
  const durableUrl = getDurableUploadedFilePreviewUrl(res.id)
  const stableUrl = durableUrl || getStableUploadUrl(res)
  return {
    ...res,
    url: stableUrl || res.url,
    preview_url: stableUrl || res.preview_url,
    display_url: stableUrl || res.display_url,
    source_url: stableUrl || res.source_url,
  }
}
