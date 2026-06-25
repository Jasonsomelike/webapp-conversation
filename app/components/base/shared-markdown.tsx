'use client'

import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'

export default function SharedMarkdown({ content, shareToken }: { content: string, shareToken?: string }) {
  return <StreamdownMarkdown content={content} shareToken={shareToken} />
}
