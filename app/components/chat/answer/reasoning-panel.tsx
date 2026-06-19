'use client'

import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import ChevronRight from '@/app/components/base/icons/line/chevron-right'
import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'

export interface AnswerSegment {
  type: 'answer' | 'reasoning'
  content: string
  complete: boolean
}

export const splitReasoningContent = (content: string): AnswerSegment[] => {
  const segments: AnswerSegment[] = []
  const tagPattern = /<\/?think>/gi
  let cursor = 0
  let currentType: AnswerSegment['type'] = 'answer'
  let match = tagPattern.exec(content)

  while (match) {
    const tag = match[0].toLowerCase()
    if (tag === '<think>' && currentType === 'answer') {
      const answer = content.slice(cursor, match.index)
      if (answer)
      { segments.push({ type: 'answer', content: answer, complete: true }) }
      currentType = 'reasoning'
      cursor = match.index + match[0].length
    }
    else if (tag === '</think>' && currentType === 'reasoning') {
      segments.push({
        type: 'reasoning',
        content: content.slice(cursor, match.index),
        complete: true,
      })
      currentType = 'answer'
      cursor = match.index + match[0].length
    }
    match = tagPattern.exec(content)
  }

  const remaining = content.slice(cursor)
  if (remaining || currentType === 'reasoning' || segments.length === 0) {
    segments.push({
      type: currentType,
      content: remaining,
      complete: currentType === 'answer',
    })
  }

  return segments
}

interface ReasoningPanelProps {
  content: string
  isStreaming: boolean
}

const ReasoningPanel: FC<ReasoningPanelProps> = ({ content, isStreaming }) => {
  const [expanded, setExpanded] = useState(isStreaming)
  const [elapsed, setElapsed] = useState(0)
  const [hasMeasured, setHasMeasured] = useState(false)
  const startedAt = useRef<number | null>(null)
  const wasStreaming = useRef(isStreaming)

  useEffect(() => {
    if (isStreaming) {
      setExpanded(true)
      if (startedAt.current === null)
      { startedAt.current = Date.now() }

      const updateElapsed = () => {
        if (startedAt.current === null)
        { return }
        setHasMeasured(true)
        setElapsed((Date.now() - startedAt.current) / 1000)
      }
      updateElapsed()
      const timer = window.setInterval(updateElapsed, 100)
      return () => window.clearInterval(timer)
    }

    if (wasStreaming.current) {
      setExpanded(false)
      if (startedAt.current !== null) {
        setHasMeasured(true)
        setElapsed((Date.now() - startedAt.current) / 1000)
      }
    }
    wasStreaming.current = isStreaming
  }, [isStreaming])

  const duration = hasMeasured ? `(${elapsed.toFixed(1)}s)` : ''

  return (
    <div className='text-[13px] text-[#53625c]' data-testid='reasoning-panel'>
      <button
        type='button'
        className='flex w-full items-center gap-1.5 py-0.5 text-left font-semibold transition-colors hover:text-[#17342b]'
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
      >
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        <span>{isStreaming ? '深度思考中…' : '已深度思考'}{duration}</span>
        {isStreaming && <span className='ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-[#47a07a]' />}
      </button>
      {expanded && (
        <div className='ml-[7px] mt-2 border-l border-[#17342b]/15 py-1 pl-5 pr-2 leading-6 text-[#69766f]'>
          {content
            ? <StreamdownMarkdown content={content} />
            : <span className='text-[#8a958f]'>正在整理思路…</span>}
        </div>
      )}
    </div>
  )
}

export default ReasoningPanel
