'use client'
import type { FC } from 'react'
import React from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  isRequest: boolean
  toolName: string
  content: string
}

const Panel: FC<Props> = ({
  isRequest,
  toolName,
  content,
}) => {
  const { t } = useTranslation()

  return (
    <div className='max-w-full overflow-hidden rounded-md border border-black/5 bg-gray-100'>
      <div className='flex min-w-0 items-center break-words px-2 py-1 text-xs font-medium uppercase leading-[18px] text-gray-500 bg-gray-50'>
        {t(`tools.thought.${isRequest ? 'requestTitle' : 'responseTitle'}`)} {toolName}
      </div>
      <div className='overflow-x-auto whitespace-pre-wrap break-words border-t border-black/5 p-2 text-xs leading-4 text-gray-700'>{content}</div>
    </div>
  )
}
export default React.memo(Panel)
