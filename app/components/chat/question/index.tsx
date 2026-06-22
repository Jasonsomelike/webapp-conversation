'use client'
import type { FC } from 'react'
import React from 'react'
import type { IChatItem } from '../type'
import s from '../style.module.css'

import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import ImageGallery from '@/app/components/base/image-gallery'

type IQuestionProps = Pick<IChatItem, 'id' | 'content' | 'useCurrentUserAvatar'> & {
  imgSrcs?: string[]
}

const Question: FC<IQuestionProps> = ({ id, content, useCurrentUserAvatar, imgSrcs }) => {
  const userName = ''
  return (
    <div className='flex items-start justify-end' key={id}>
      <div>
        <div className={`${s.question} relative text-sm text-gray-900`}>
          <div
            className={'chat-question-card rounded-b-2xl rounded-tl-2xl bg-blue-500 px-3 py-2.5 sm:mr-2 sm:px-4 sm:py-3'}
          >
            {imgSrcs && imgSrcs.length > 0 && (
              <ImageGallery srcs={imgSrcs} />
            )}
            <StreamdownMarkdown content={content} />
          </div>
        </div>
      </div>
      {useCurrentUserAvatar
        ? (
          <div className='w-10 h-10 shrink-0 leading-10 text-center mr-2 rounded-full bg-primary-600 text-white'>
            {userName?.[0].toLocaleUpperCase()}
          </div>
        )
        : (
          <div className={`${s.questionIcon} hidden h-10 w-10 shrink-0 sm:block`}></div>
        )}
    </div>
  )
}

export default React.memo(Question)
