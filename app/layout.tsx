import { getLocaleOnServer } from '@/i18n/server'
import type { Metadata } from 'next'

import './styles/globals.css'
import './styles/markdown.scss'

export const metadata: Metadata = {
  title: {
    default: '知行网络学堂',
    template: '%s · 知行网络学堂',
  },
  description: '基于 Dify 的计算机网络个性化学习空间',
}

const LocaleLayout = async ({
  children,
}: {
  children: React.ReactNode
}) => {
  const locale = await getLocaleOnServer()
  return (
    <html lang={locale ?? 'zh-Hans'} className="h-full" data-theme="forest">
      <head>
        <link rel="dns-prefetch" href="//dify.jasonsome.cn" />
        <link rel="preconnect" href="https://dify.jasonsome.cn:22380" crossOrigin="" />
      </head>
      <body className="min-h-full bg-[var(--studio-paper)] antialiased">
        {children}
      </body>
    </html>
  )
}

export default LocaleLayout
