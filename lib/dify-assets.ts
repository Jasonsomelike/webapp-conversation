const difyPublicOrigin = (
  process.env.NEXT_PUBLIC_DIFY_PUBLIC_ORIGIN
  || 'https://dify.jasonsome.cn:22380'
).replace(/\/$/, '')

const imageExtension = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i
const downloadableExtension = /\.(?:csv|docx?|md|pdf|pptx?|rtf|txt|xlsx?|zip)(?:[?#].*)?$/i

export const toAbsoluteDifyAssetUrl = (value: string) => {
  const url = value.trim()
  if (!url)
  { return '' }
  if (url.startsWith('/files/'))
  { return `${difyPublicOrigin}${url}` }
  return url
}

export const toDifyAssetProxyUrl = (value: string, download = false, filename = '') => {
  const url = toAbsoluteDifyAssetUrl(value)
  if (!url)
  { return '' }
  try {
    const target = new URL(url)
    if (target.hostname !== 'dify.jasonsome.cn')
    { return url }
  }
  catch {
    return url
  }

  const params = new URLSearchParams({ url })
  if (download)
  { params.set('download', '1') }
  if (filename)
  { params.set('filename', filename) }
  return `/api/dify/file-proxy?${params}`
}

const currentChinaDate = () => new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date())

export const normalizeAssistantMarkdown = (content: string) => {
  const normalizedSignature = content
    .replaceAll('计算机网络学习小组', '计网Agent')
    .replace(
      /(日期\s*[:：]\s*)(?:\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?)/g,
      `$1${currentChinaDate()}`,
    )

  const withImages = normalizedSignature.replace(
    /(?<!\]\()(?<!\()((?:https?:\/\/dify\.jasonsome\.cn:22380)?\/files\/[^\s<>"')\]]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?[^\s<>"')\]]*)?)/gi,
    '\n\n![AI 生成图片]($1)\n\n',
  )

  return withImages.replace(
    /(?<!\]\()(?<!\()((?:https?:\/\/dify\.jasonsome\.cn:22380)?\/files\/[^\s<>"')\]]+\.(?:csv|docx?|md|pdf|pptx?|rtf|txt|xlsx?|zip)(?:\?[^\s<>"')\]]*)?)/gi,
    '\n\n[下载生成文件]($1)\n\n',
  )
}

export const isImageAsset = (value: string) => imageExtension.test(value)
export const isDownloadableAsset = (value: string) =>
  downloadableExtension.test(value) || value.includes('/files/')
