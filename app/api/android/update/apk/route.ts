import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const owner = 'Jasonsomelike'
const repo = 'network-study-android'

const sanitizeFilename = (value?: string | null) => {
  const filename = String(value || '').trim()
  const safe = filename.replace(/[\\/:*?"<>|\r\n]+/g, '_')
  return safe && /\.apk$/i.test(safe) ? safe : 'network-study-android-latest.apk'
}

const findLatestApk = async (requestedName?: string | null) => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'network-study-update-downloader',
    },
    cache: 'no-store',
  })
  if (!response.ok)
  { throw new Error(`GITHUB_RELEASE_LOOKUP_FAILED:${response.status}`) }

  const release = await response.json() as {
    assets?: Array<{ name?: string, browser_download_url?: string, size?: number }>
  }
  const apkAssets = release.assets?.filter(asset => /\.apk$/i.test(asset.name || '') && asset.browser_download_url) || []
  const requested = sanitizeFilename(requestedName)
  const apk = apkAssets.find(asset => asset.name === requested)
    || apkAssets.find(asset => /^network-study-android/i.test(asset.name || ''))
    || apkAssets.find(asset => /知行网络学堂/i.test(asset.name || ''))
    || apkAssets[0]

  if (!apk?.browser_download_url)
  { throw new Error('APK_ASSET_NOT_FOUND') }

  return {
    name: sanitizeFilename(apk.name),
    url: apk.browser_download_url,
    size: apk.size || 0,
  }
}

export async function GET(request: Request) {
  try {
    const requestedName = new URL(request.url).searchParams.get('name')
    const apk = await findLatestApk(requestedName)
    const upstream = await fetch(apk.url, {
      headers: {
        'Accept': 'application/vnd.android.package-archive, application/octet-stream;q=0.9, */*;q=0.8',
        'User-Agent': 'network-study-update-downloader',
      },
      cache: 'no-store',
      redirect: 'follow',
    })
    if (!upstream.ok || !upstream.body)
    { throw new Error(`APK_DOWNLOAD_FAILED:${upstream.status}`) }

    const headers = new Headers()
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/vnd.android.package-archive')
    headers.set('Content-Disposition', `attachment; filename="${apk.name}"; filename*=UTF-8''${encodeURIComponent(apk.name)}`)
    headers.set('Cache-Control', 'private, no-store')
    const contentLength = upstream.headers.get('Content-Length') || (apk.size ? String(apk.size) : '')
    if (contentLength)
    { headers.set('Content-Length', contentLength) }

    return new Response(upstream.body, { headers })
  }
  catch (error) {
    console.error('[android-update-apk] failed', error)
    return NextResponse.json({ error: 'APK 下载代理失败，请稍后重试' }, { status: 502 })
  }
}
