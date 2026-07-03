const difyPublicOrigin = (
  process.env.NEXT_PUBLIC_DIFY_PUBLIC_ORIGIN
  || 'https://dify.jasonsome.cn:22380'
).replace(/\/$/, '')

const difyAssetHosts = new Set(['dify.jasonsome.cn', 'www.jasonsome.cn', 'jasonsome.cn'])
const imageExtension = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i
const downloadableExtension = /\.(?:csv|docx?|md|pdf|pptx?|rtf|txt|xlsx?|zip)(?:[?#].*)?$/i
const exactDifyAssetUrl = /^(?:(?:https?:\/\/(?:dify\.jasonsome\.cn(?::22380)?|www\.jasonsome\.cn|jasonsome\.cn))?\/(?:files|page-images)\/[^\s<>"')\]]+)$/i
const generatedToolFilePattern = /\/files\/tools\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\.([a-z0-9]+))?$/i

export const toAbsoluteDifyAssetUrl = (value: string) => {
  const url = value.trim()
  if (!url)
  { return '' }
  if (url.startsWith('/files/') || url.startsWith('/page-images/'))
  { return `${difyPublicOrigin}${url}` }
  return url
}

const generatedFileRoute = (value: string, download: boolean, filename: string) => {
  try {
    const target = new URL(toAbsoluteDifyAssetUrl(value))
    const matched = target.pathname.match(generatedToolFilePattern)
    if (!matched)
    { return '' }
    const fallbackFilename = matched[2] ? `${matched[1]}.${matched[2]}` : matched[1]
    const params = new URLSearchParams({
      disposition: download ? 'attachment' : 'inline',
      filename: filename || fallbackFilename,
    })
    return `/api/generated-files/${matched[1]}?${params}`
  }
  catch {
    return ''
  }
}

export const toDifyAssetProxyUrl = (value: string, download = false, filename = '') => {
  const url = toAbsoluteDifyAssetUrl(value)
  if (!url)
  { return '' }
  const durableGeneratedFileUrl = generatedFileRoute(url, download, filename)
  if (durableGeneratedFileUrl)
  { return durableGeneratedFileUrl }

  try {
    const target = new URL(url)
    if (
      !['http:', 'https:'].includes(target.protocol)
      || !difyAssetHosts.has(target.hostname)
      || (target.hostname === 'dify.jasonsome.cn' && target.port && target.port !== '22380')
      || (!target.pathname.startsWith('/files/') && !target.pathname.startsWith('/page-images/'))
    )
    { return url }

    // Page images are public static assets served by the Dify nginx layer. Let
    // the browser load them directly instead of routing through a Vercel
    // function; server-side fetches to the custom Dify port can intermittently
    // fail from Vercel, while direct browser requests are fast and stable.
    if (!download && (target.pathname.startsWith('/page-images/') || imageExtension.test(target.pathname))) {
      target.protocol = 'https:'
      return target.toString()
    }

    const params = new URLSearchParams({ url: target.toString() })
    if (download)
    { params.set('download', '1') }
    if (filename)
    { params.set('filename', filename) }
    return `/api/dify/file-proxy?${params}`
  }
  catch {
    return url
  }
}

const unwrapDifyAssetProxyUrl = (value: string) => {
  try {
    const parsed = new URL(value, 'https://www.jasonsome.cn')
    if (parsed.pathname === '/api/dify/file-proxy')
    { return parsed.searchParams.get('url') || value }
  }
  catch {
    // Keep the already usable value.
  }
  return value
}

export const toBrowserImageFallbackUrl = (value: string) => {
  const url = toAbsoluteDifyAssetUrl(unwrapDifyAssetProxyUrl(value))
  if (!url || !imageExtension.test(url))
  { return '' }

  try {
    const target = new URL(url)
    if (
      !['http:', 'https:'].includes(target.protocol)
      || !difyAssetHosts.has(target.hostname)
      || (target.hostname === 'dify.jasonsome.cn' && target.port && target.port !== '22380')
      || (!target.pathname.startsWith('/files/') && !target.pathname.startsWith('/page-images/'))
    )
    { return '' }

    target.protocol = 'https:'
    return target.toString()
  }
  catch {
    return ''
  }
}

export const toDirectDifyAssetUrl = (value: string) => {
  const url = toAbsoluteDifyAssetUrl(unwrapDifyAssetProxyUrl(value))
  if (!url)
  { return '' }

  try {
    const target = new URL(url)
    if (
      !['http:', 'https:'].includes(target.protocol)
      || !difyAssetHosts.has(target.hostname)
      || (target.hostname === 'dify.jasonsome.cn' && target.port && target.port !== '22380')
      || (!target.pathname.startsWith('/files/') && !target.pathname.startsWith('/page-images/'))
    )
    { return '' }

    target.protocol = 'https:'
    return target.toString()
  }
  catch {
    return ''
  }
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

  const seenImages = new Set<string>()
  const deduplicatedImages = normalizedSignature.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (full, _alt: string, rawUrl: string) => {
      const key = toAbsoluteDifyAssetUrl(rawUrl).replace(/[?#].*$/, '')
      if (!key || !isImageAsset(rawUrl))
      { return full }
      if (seenImages.has(key))
      { return '' }
      seenImages.add(key)
      return full
    },
  )

  return deduplicatedImages
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
  downloadableExtension.test(value) || /(?:^|\/)files\//i.test(value)
