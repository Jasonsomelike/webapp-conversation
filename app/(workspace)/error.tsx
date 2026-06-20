'use client'

import { useEffect } from 'react'
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[workspace-error]', error)
  }, [error])

  return (
    <div className="grid min-h-[520px] place-items-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-[var(--studio-surface)] p-8 text-center shadow-[0_20px_70px_rgba(23,52,43,.09)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-orange-600">
          <ExclamationTriangleIcon className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-lg font-semibold">数据连接短暂波动</h2>
        <p className="mt-2 text-sm leading-6 text-black/50">页面已安全停止加载，不会影响账号数据。请点击重试，或稍后返回该页面。</p>
        {error.digest && <div className="mt-3 text-[10px] text-black/30">诊断编号：{error.digest}</div>}
        <button
          onClick={reset}
          className="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--studio-deep)] px-5 py-2.5 text-xs font-semibold text-white"
        >
          <ArrowPathIcon className="h-4 w-4" />重新加载
        </button>
      </div>
    </div>
  )
}
