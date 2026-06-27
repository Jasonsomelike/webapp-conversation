'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowDownTrayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import PageCard from '@/app/components/workspace/page-card'
import type { NativeDownloadTask } from '@/lib/native-app'

export default function DownloadCenterCard({ className = '' }: { className?: string }) {
  const [downloadTasks, setDownloadTasks] = useState<NativeDownloadTask[]>([])

  const refresh = useCallback(() => {
    try {
      const rawTasks = window.NetworkStudyApp?.getDownloadTasks?.()
      setDownloadTasks(rawTasks ? JSON.parse(rawTasks) as NativeDownloadTask[] : [])
    }
    catch {
      setDownloadTasks([])
    }
  }, [])

  useEffect(() => {
    refresh()
    globalThis.addEventListener('network-study-downloads-changed', refresh)
    return () => globalThis.removeEventListener('network-study-downloads-changed', refresh)
  }, [refresh])

  return (
    <PageCard className={`p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--studio-accent)]/30 text-[var(--studio-accent-strong)]">
          <ArrowDownTrayIcon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">下载任务</h2>
          <p className="mt-1 text-xs leading-6 text-[var(--studio-muted)]">在 App 内查看进度、打开文件或从下载栏移除。</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {!downloadTasks.length && (
          <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.015] p-5 text-center text-xs text-[var(--studio-muted)]">
            暂无下载任务。下载更新包或资料后会显示在这里。
          </div>
        )}
        {downloadTasks.map(task => (
          <div key={task.id} className="rounded-2xl border border-black/[0.07] bg-[var(--studio-surface)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{task.filename}</div>
                <div className="mt-1 text-[11px] text-[var(--studio-muted)]">
                  {task.status === 'completed'
                    ? '已完成'
                    : task.status === 'failed'
                      ? task.error || '下载失败'
                      : task.status === 'queued'
                        ? '等待下载'
                        : `下载中 ${Math.round(task.progress || 0)}%`}
                  {task.isUpdate && ' · 更新包'}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={task.status !== 'completed'}
                  onClick={() => window.NetworkStudyApp?.openDownloadTask?.(task.id)}
                  className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold disabled:opacity-35"
                >
                  打开
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.NetworkStudyApp?.deleteDownloadTask?.(task.id)
                    globalThis.setTimeout(refresh, 120)
                  }}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                  aria-label="删除下载任务"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            {task.status !== 'completed' && task.status !== 'failed' && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                <div className="h-full rounded-full bg-[var(--studio-accent-strong)] transition-all" style={{ width: `${Math.max(4, Math.min(100, task.progress || 0))}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </PageCard>
  )
}
