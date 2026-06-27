'use client'
import type { FC } from 'react'
import React from 'react'
import type { ThoughtItem, ToolInfoInThought } from '../type'
import Tool from './tool'
import type { Emoji } from '@/types/tools'
import { toMessageText } from '@/lib/safe-text'

export interface IThoughtProps {
  thought: ThoughtItem
  allToolIcons: Record<string, string | Emoji>
  isFinished: boolean
}

function getValue(value: unknown, isValueArray: boolean, index: number) {
  const text = toMessageText(value)
  if (isValueArray) {
    try {
      return toMessageText(JSON.parse(text)[index])
    }
    catch {
    }
  }
  return text
}

const Thought: FC<IThoughtProps> = ({
  thought,
  allToolIcons,
  isFinished,
}) => {
  const [toolNames, isValueArray]: [string[], boolean] = (() => {
    const toolText = toMessageText(thought.tool)
    try {
      const parsed = JSON.parse(toolText)
      if (Array.isArray(parsed)) { return [parsed.map(item => toMessageText(item, '工具')), true] }
    }
    catch {
    }
    return [[toolText], false]
  })()

  const toolThoughtList = toolNames.map((toolName, index) => {
    return {
      name: toolName,
      input: getValue(thought.tool_input, isValueArray, index),
      output: getValue(thought.observation, isValueArray, index),
      isFinished,
    }
  })

  return (
    <div className='my-2 space-y-2'>
      {toolThoughtList.map((item: ToolInfoInThought, index) => (
        <Tool
          key={index}
          payload={item}
          allToolIcons={allToolIcons}
        />
      ))}
    </div>
  )
}
export default React.memo(Thought)
