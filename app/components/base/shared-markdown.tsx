'use client'

import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'

export default function SharedMarkdown({ content }: { content: string }) {
  return <StreamdownMarkdown content={content} />
}
