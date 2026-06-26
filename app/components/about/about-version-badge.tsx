'use client'

import { useEffect, useState } from 'react'
import { isNetworkStudyApp, readNativeDownloadSettings } from '@/lib/native-app'

const parseVersionFromBridge = (value?: string) => {
  if (!value)
  { return '' }
  try {
    const parsed = JSON.parse(value) as { appVersion?: string, version?: string }
    return parsed.appVersion || parsed.version || ''
  }
  catch {
    return value.replace(/^NetworkStudyAndroid\//i, '').trim()
  }
}

const parseVersionFromUserAgent = () => {
  if (typeof navigator === 'undefined')
  { return '' }
  return navigator.userAgent.match(/NetworkStudyAndroid\/([\w.-]+)/i)?.[1] || ''
}

export default function AboutVersionBadge() {
  const [label, setLabel] = useState('Web · 版本读取中…')

  useEffect(() => {
    let cancelled = false
    const loadVersion = async () => {
      if (isNetworkStudyApp()) {
        const bridgeVersion = parseVersionFromBridge(window.NetworkStudyApp?.getBridgeVersion?.())
        const settingsVersion = readNativeDownloadSettings()?.appVersion || ''
        const uaVersion = parseVersionFromUserAgent()
        const version = bridgeVersion || settingsVersion || uaVersion || '未知'
        if (!cancelled)
        { setLabel(`Android · 版本 ${version}`) }
        return
      }

      const response = await fetch('/api/version', { cache: 'no-store' }).catch(() => null)
      const result = response?.ok ? await response.json().catch(() => null) : null
      const version = typeof result?.webVersion === 'string'
        ? result.webVersion
        : typeof result?.version === 'string'
          ? result.version
          : '未知'
      if (!cancelled)
      { setLabel(`Web · 最新版本 ${version}`) }
    }

    void loadVersion()
    return () => {
      cancelled = true
    }
  }, [])

  return <div className="mt-3 text-xs text-white/35">{label}</div>
}
