import React from 'react'

import './style.css'

interface ILoadingProps {
  type?: 'area' | 'app'
}

const Loading = (
  { type = 'area' }: ILoadingProps = { type: 'area' },
) => {
  if (type === 'app') {
    return (
      <div className="grid h-full min-h-[420px] w-full place-items-center bg-[var(--studio-surface)]">
        <div className="rounded-3xl border border-black/[0.06] bg-white px-8 py-7 text-center shadow-[0_18px_50px_rgba(31,46,39,.08)]">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--studio-accent)]/35">
            <LoadingMark className="h-6 w-6" />
          </div>
          <div className="mt-4 text-sm font-semibold text-[var(--studio-ink)]">正在打开学习助手</div>
          <div className="mt-1.5 text-xs text-black/40">加载会话与课程配置…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full items-center justify-center">
      <LoadingMark className="h-4 w-4" />
    </div>
  )
}

function LoadingMark({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={`spin-animation ${className}`}>
      <g clipPath="url(#clip0_324_2488)">
        <path d="M15 0H10C9.44772 0 9 0.447715 9 1V6C9 6.55228 9.44772 7 10 7H15C15.5523 7 16 6.55228 16 6V1C16 0.447715 15.5523 0 15 0Z" fill="var(--studio-accent-strong)" />
        <path opacity="0.5" d="M15 9H10C9.44772 9 9 9.44772 9 10V15C9 15.5523 9.44772 16 10 16H15C15.5523 16 16 15.5523 16 15V10C16 9.44772 15.5523 9 15 9Z" fill="var(--studio-accent-strong)" />
        <path opacity="0.1" d="M6 9H1C0.447715 9 0 9.44772 0 10V15C0 15.5523 0.447715 16 1 16H6C6.55228 16 7 15.5523 7 15V10C7 9.44772 6.55228 9 6 9Z" fill="var(--studio-accent-strong)" />
        <path opacity="0.2" d="M6 0H1C0.447715 0 0 0.447715 0 1V6C0 6.55228 0.447715 7 1 7H6C6.55228 7 7 6.55228 7 6V1C7 0.447715 6.55228 0 6 0Z" fill="var(--studio-accent-strong)" />
      </g>
      <defs>
        <clipPath id="clip0_324_2488">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

export default Loading
