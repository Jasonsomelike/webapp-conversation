'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  FolderOpenIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import { isNetworkStudyApp, readNativeDownloadSettings, type NativeDownloadSettings } from '@/lib/native-app'

export default function AppSettingsView() {
  const [settings, setSettings] = useState<NativeDownloadSettings | null>(null)
  const [isApp, setIsApp] = useState(true)

  const refresh = useCallback(() => {
    setIsApp(isNetworkStudyApp())
    setSettings(readNativeDownloadSettings())
  }, [])

  useEffect(() => {
    refresh()
    globalThis.addEventListener('network-study-download-directory-changed', refresh)
    return () => globalThis.removeEventListener('network-study-download-directory-changed', refresh)
  }, [refresh])

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-7">
      <PageCard className="p-6">
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
        </ul>
        <div className="mt-5 flex items-center gap-2 text-[11px] text-black/40">
          <InformationCircleIcon className="h-4 w-4" />
          App 版本 {settings?.appVersion || '1.1'}
        </div>
      </PageCard>
    </div>
  )
}
