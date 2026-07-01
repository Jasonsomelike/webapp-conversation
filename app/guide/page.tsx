import type { Metadata } from 'next'
import UsageGuide from '@/app/components/guide/usage-guide'

export const metadata: Metadata = {
  title: '使用说明',
  description: '知行网络学堂使用说明与功能入口指南',
}

export default function GuidePage() {
  return <UsageGuide />
}
