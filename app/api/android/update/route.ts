import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const owner = 'Jasonsomelike'
const repo = 'network-study-android'
const hostedApkBaseUrl = 'https://www.jasonsome.cn/api/android/update/apk'
const hostedApkSizes: Record<string, number> = {
  'network-study-android-v1.11.0.apk': 3752815,
  'network-study-android-v1.12.0.apk': 3752815,
  'network-study-android-v1.13.0.apk': 3753111,
  'network-study-android-v1.14.0.apk': 3753235,
}

const versionFromTag = (tag: string) =>
  tag.replace(/^v/i, '').trim()

const versionCodeFromBody = (body: string) => {
  const matched = body.match(/versionCode\s*[:：]\s*(\d+)/i)
  return matched ? Number(matched[1]) : null
}

export async function GET() {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'network-study-update-checker',
      },
      cache: 'no-store',
    })
    if (!response.ok)
    { throw new Error(`GITHUB_RELEASE_LOOKUP_FAILED:${response.status}`) }

    const release = await response.json() as {
      tag_name?: string
      name?: string
      body?: string
      html_url?: string
      published_at?: string
      assets?: Array<{ name?: string, browser_download_url?: string, size?: number }>
    }
    const apkAssets = release.assets?.filter(asset => /\.apk$/i.test(asset.name || '')) || []
    const apk = apkAssets.find(asset => /^network-study-android/i.test(asset.name || ''))
      || apkAssets.find(asset => /知行网络学堂/i.test(asset.name || ''))
      || apkAssets[0]
    const tagName = release.tag_name || ''
    const versionName = versionFromTag(tagName)
    const hostedApkName = apk?.name || (versionName
      ? `network-study-android-v${versionName}.apk`
      : 'network-study-android-latest.apk')
    const hostedApkUrl = `${hostedApkBaseUrl}?name=${encodeURIComponent(hostedApkName)}`

    return NextResponse.json({
      latest: {
        tagName,
        versionName,
        versionCode: versionCodeFromBody(release.body || ''),
        name: release.name || tagName,
        notes: release.body || '',
        htmlUrl: release.html_url || `https://github.com/${owner}/${repo}/releases`,
        apkUrl: hostedApkUrl,
        apkName: hostedApkName,
        apkSize: hostedApkSizes[hostedApkName] || apk?.size || 0,
        publishedAt: release.published_at || '',
        mandatory: false,
        downloadMirror: hostedApkBaseUrl,
      },
      checkedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    })
  }
  catch (error) {
    console.error('[android-update] latest release lookup failed', error)
    return NextResponse.json(
      { error: '无法读取 Android 最新版本信息，请稍后重试' },
      { status: 502 },
    )
  }
}
