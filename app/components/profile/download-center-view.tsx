'use client'

import Link from 'next/link'
import {
  ArrowPathIcon,
  Cog6ToothIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline'
import DownloadCenterCard from '@/app/components/profile/download-center-card'
import PageCard from '@/app/components/workspace/page-card'
import { readNativeDownloadSettings } from '@/lib/native-app'

export default function DownloadCenterView() {
  const settings = readNativeDownloadSettings()

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-7">
      <DownloadCenterCard />
      <PageCard className="mt-5 p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--studio-accent)]/30 text-[var(--studio-accent-strong)]">
            <FolderOpenIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">下载位置</h2>
            <p className="mt-1 break-words text-xs leading-6 text-[var(--studio-muted)]">
              {settings?.customDirectory
                ? `当前保存到：${settings.directoryName}`
                : '当前保存到系统 Download 文件夹'}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!settings}
            onClick={() => window.NetworkStudyApp?.chooseDownloadDirectory()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--studio-deep)] text-sm font-semibold text-white disabled:opacity-40"
          >
            <FolderOpenIcon className="h-5 w-5" />
            选择保存文件夹
          </button>
          <button
            type="button"
            disabled={!settings?.customDirectory}
            onClick={() => window.NetworkStudyApp?.resetDownloadDirectory()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-black/10 text-sm font-semibold disabled:opacity-40"
          >
            <ArrowPathIcon className="h-5 w-5" />
            恢复默认
          </button>
        </div>
      </PageCard>
      <Link
        href="/app-settings"
        className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-[var(--studio-surface)] px-5 text-sm font-semibold"
      >
        <Cog6ToothIcon className="h-5 w-5" />
        进入 App 设置
      </Link>
    </div>
  )
}
