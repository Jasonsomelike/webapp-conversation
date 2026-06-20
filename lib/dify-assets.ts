const difyPublicOrigin = (
  process.env.NEXT_PUBLIC_DIFY_PUBLIC_ORIGIN
  || 'https://dify.jasonsome.cn:22380'
).replace(/\/$/, '')

const imageExtension = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i
const downloadableExtension = /\.(?:csv|docx?|md|pdf|pptx?|rtf|txt|xlsx?|zip)(?:[?#].*)?$/i
const exactDifyAssetUrl = /^(?:(?:https?:\/\/dify\.jasonsome\.cn:22380)?\/(?:files|page-images)\/[^\s<>"')\]]+)$/i

export const toAbsoluteDifyAssetUrl = (value: string) => {
  const url = value.trim()
  if (!url)
  { return '' }
  if (url.startsWith('/files/') || url.startsWith('/page-images/'))
  { return `${difyPublicOrigin}${url}` }
  return url
}

export const toDifyAssetProxyUrl = (value: string, download = false, filename = '') => {
  const url = toAbsoluteDifyAssetUrl(value)
  if (!url)
  { return '' }
  try {
    const target = new URL(url)
    if (
      target.protocol !== 'https:'
      || target.hostname !== 'dify.jasonsome.cn'
      || (target.port && target.port !== '22380')
      || (!target.pathname.startsWith('/files/') && !target.pathname.startsWith('/page-images/'))
    )
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

  return normalizedSignature
    .split('\n')
    .map((line) => {
      const value = line.trim()
      if (!exactDifyAssetUrl.test(value))
      { return line }
      if (isImageAsset(value))
      { return `![AI 生成图片](${value})` }
      if (isDownloadableAsset(value)) {
        let filename = '下载生成文件'
        try {
          filename = decodeURIComponent(new URL(toAbsoluteDifyAssetUrl(value)).pathname.split('/').pop() || filename)
        }
        catch {
          // Keep a readable fallback label for malformed model output.
        }
        return `[${filename}](${value})`
      }
      return line
    })
    .join('\n')
}

export const isImageAsset = (value: string) => imageExtension.test(value)
export const isDownloadableAsset = (value: string) =>
  downloadableExtension.test(value) || value.includes('/files/')
