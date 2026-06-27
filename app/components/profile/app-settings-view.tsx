'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  FolderOpenIcon,
  InformationCircleIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import DownloadCenterCard from '@/app/components/profile/download-center-card'
import { isNetworkStudyApp, readNativeDownloadSettings, type NativeDownloadSettings } from '@/lib/native-app'
import { isThemeId, themes, type ThemeId } from '@/lib/themes'

interface AndroidUpdateInfo {
  latest: {
    tagName: string
    versionName: string
    versionCode: number | null
    name: string
    notes: string
    htmlUrl: string
    apkUrl: string
    apkName: string
    apkSize: number
    publishedAt: string
    mandatory: boolean
  }
  checkedAt: string
}

const compareVersions = (left = '', right = '') => {
  const a = left.split(/[.-]/).map(value => Number(value) || 0)
  const b = right.split(/[.-]/).map(value => Number(value) || 0)
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0)
    if (diff !== 0)
    { return diff }
  }
  return 0
}

const formatBytes = (bytes: number) => {
  if (!bytes)
  { return '' }
  if (bytes < 1024 * 1024)
  { return `${Math.max(1, Math.round(bytes / 1024))} KB` }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function AppSettingsView({ initialTheme }: { initialTheme: string }) {
  const [settings, setSettings] = useState<NativeDownloadSettings | null>(null)
  const [isApp, setIsApp] = useState(true)
  const [theme, setTheme] = useState<ThemeId>(isThemeId(initialTheme) ? initialTheme : 'forest')
  const [themeSaving, setThemeSaving] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<AndroidUpdateInfo | null>(null)
  const [updateError, setUpdateError] = useState('')
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  const refresh = useCallback(() => {
    setIsApp(isNetworkStudyApp())
    setSettings(readNativeDownloadSettings())
  }, [])

  useEffect(() => {
    refresh()
    globalThis.addEventListener('network-study-download-directory-changed', refresh)
    return () => {
      globalThis.removeEventListener('network-study-download-directory-changed', refresh)
    }
  }, [refresh])

  const checkUpdate = useCallback(async () => {
    setCheckingUpdate(true)
    setUpdateError('')
    try {
      const response = await fetch('/api/android/update', { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data)
      { throw new Error(data?.error || '检查更新失败') }
      setUpdateInfo(data as AndroidUpdateInfo)
    }
    catch (error) {
      setUpdateError(error instanceof Error ? error.message : '检查更新失败')
    }
    finally {
      setCheckingUpdate(false)
    }
  }, [])

  useEffect(() => {
    if (isNetworkStudyApp())
    { void checkUpdate() }
  }, [checkUpdate])

  const changeTheme = async (nextTheme: ThemeId) => {
    const previous = theme
    setTheme(nextTheme)
    setThemeSaving(true)
    document.documentElement.dataset.theme = nextTheme
    globalThis.dispatchEvent(new CustomEvent('network-study-theme-changed', { detail: { theme: nextTheme } }))
    try {
      const response = await fetch('/api/profile/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: nextTheme }),
      })
      if (!response.ok)
      { throw new Error('主题保存失败') }
    }
    catch {
      setTheme(previous)
      document.documentElement.dataset.theme = previous
      globalThis.dispatchEvent(new CustomEvent('network-study-theme-changed', { detail: { theme: previous } }))
    }
    finally {
      setThemeSaving(false)
    }
  }

  const latest = updateInfo?.latest
  const hasNewVersion = Boolean(latest && settings && (
    latest.versionCode && settings.appVersionCode
      ? latest.versionCode > settings.appVersionCode
      : compareVersions(latest.versionName, settings.appVersion) > 0
  ))
  const openExternal = (url: string) => {
    if (!url)
    { return }
    if (window.NetworkStudyApp?.openExternalUrl)
    { window.NetworkStudyApp.openExternalUrl(url) }
    else
    { globalThis.open(url, '_blank', 'noopener,noreferrer') }
  }
  const downloadUpdate = () => {
    if (!latest?.apkUrl)
    { return }
    if (window.NetworkStudyApp?.downloadUrl)
    {
      window.NetworkStudyApp.downloadUrl(latest.apkUrl, latest.apkName || `知行网络学堂-${latest.tagName}.apk`)
      globalThis.setTimeout(refresh, 250)
    }
    else
    { openExternal(latest.apkUrl) }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-7">
      <PageCard className="p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--studio-accent)]/30 text-[var(--studio-accent-strong)]">
            <PaintBrushIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">App 配色</h2>
            <p className="mt-1 text-xs leading-6 text-[var(--studio-muted)]">选择后立即应用，并同步到当前账号的网页端。</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {themes.map(item => (
            <button
              key={item.id}
              type="button"
              disabled={themeSaving}
              onClick={() => void changeTheme(item.id)}
              className={`rounded-2xl border p-2.5 text-left transition active:scale-[0.97] ${
                theme === item.id
                  ? 'border-[var(--studio-accent-strong)] bg-[var(--studio-accent)]/15 shadow-sm'
                  : 'border-black/[0.08] bg-[var(--studio-surface)]'
              }`}
            >
              <span className="block h-9 rounded-xl border border-black/10" style={{ background: item.swatch }} />
              <span className="mt-2 block truncate text-[10px] font-semibold">{item.name}</span>
            </button>
          ))}
        </div>
      </PageCard>

      <PageCard className="mt-5 p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--studio-accent)]/30 text-[var(--studio-accent-strong)]">
            <ArrowPathIcon className={`h-6 w-6 ${checkingUpdate ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">版本更新</h2>
            <p className="mt-1 text-xs leading-6 text-[var(--studio-muted)]">
              当前版本 {settings?.appVersion || '未知'}{settings?.appVersionCode ? `（${settings.appVersionCode}）` : ''}
            </p>
          </div>
          <button
            type="button"
            disabled={checkingUpdate}
            onClick={() => void checkUpdate()}
            className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            检查更新
          </button>
        </div>
        <div className="mt-5 rounded-2xl border border-black/[0.07] bg-black/[0.02] p-4 text-sm">
          {checkingUpdate && <div className="text-[var(--studio-muted)]">正在检查最新版本…</div>}
          {!checkingUpdate && updateError && <div className="text-red-600">{updateError}</div>}
          {!checkingUpdate && !updateError && latest && (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">最新版本 {latest.versionName || latest.tagName}</span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${hasNewVersion ? 'bg-emerald-100 text-emerald-700' : 'bg-black/[0.06] text-black/45'}`}>
                  {hasNewVersion ? '发现新版本' : '已是最新'}
                </span>
                {latest.apkSize > 0 && <span className="text-xs text-[var(--studio-muted)]">{formatBytes(latest.apkSize)}</span>}
              </div>
              {latest.publishedAt && (
                <div className="mt-2 text-xs text-[var(--studio-muted)]">
                  发布时间 {new Date(latest.publishedAt).toLocaleString('zh-CN')}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!latest.apkUrl}
                  onClick={downloadUpdate}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--studio-deep)] px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  下载更新
                </button>
                <button
                  type="button"
                  onClick={() => openExternal(latest.htmlUrl)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/10 px-4 text-sm font-semibold"
                >
                  <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                  查看发布说明
                </button>
              </div>
            </div>
          )}
          {!checkingUpdate && !updateError && !latest && <div className="text-[var(--studio-muted)]">点击“检查更新”获取最新版本。</div>}
        </div>
      </PageCard>

      {isApp && <DownloadCenterCard className="mt-5" />}

      <PageCard className="mt-5 p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--studio-accent)]/30 text-[var(--studio-accent-strong)]">
            <FolderOpenIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">文件下载位置</h2>
            <p className="mt-1 text-xs leading-6 text-[var(--studio-muted)]">
              {settings?.customDirectory
                ? `当前保存到：${settings.directoryName}`
                : '当前保存到系统 Download 文件夹'}
            </p>
          </div>
        </div>

        {!isApp && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
            下载目录由 Android App 管理，请在知行网络学堂 App 中打开本页。
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!settings}
            onClick={() => window.NetworkStudyApp?.chooseDownloadDirectory()}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--studio-deep)] text-sm font-semibold text-white disabled:opacity-40"
          >
            <FolderOpenIcon className="h-5 w-5" />
            选择保存文件夹
          </button>
          <button
            type="button"
            disabled={!settings?.customDirectory}
            onClick={() => {
              window.NetworkStudyApp?.resetDownloadDirectory()
              globalThis.setTimeout(refresh, 100)
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-black/10 text-sm font-semibold disabled:opacity-40"
          >
            <ArrowPathIcon className="h-5 w-5" />
            恢复默认位置
          </button>
        </div>
      </PageCard>

      <PageCard className="mt-5 p-6">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
          <div className="text-sm font-semibold">App 专属能力</div>
        </div>
        <ul className="mt-4 space-y-3 text-xs leading-6 text-[var(--studio-muted)]">
          <li>• 文件下载支持自定义 Android 文件夹。</li>
          <li>• PDF 使用站内查看器精确定位引用页，不会误触发下载。</li>
          <li>• 登录状态、文件上传和系统返回键均适配原生 WebView。</li>
          <li>• 多套配色在 App 与网页之间随账号同步。</li>
        </ul>
        <div className="mt-5 flex items-center gap-2 text-[11px] text-black/40">
          <InformationCircleIcon className="h-4 w-4" />
          App 版本 {settings?.appVersion || '1.1'}
        </div>
      </PageCard>
    </div>
  )
}
