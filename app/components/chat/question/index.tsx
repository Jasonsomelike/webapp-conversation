'use client'
import type { FC } from 'react'
import React from 'react'
import type { IChatItem } from '../type'
import s from '../style.module.css'

import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import ImageGallery from '@/app/components/base/image-gallery'
import FileTypeIcon from '@/app/components/base/file-uploader-in-attachment/file-type-icon'
import { getFileAppearanceType } from '@/app/components/base/file-uploader-in-attachment/utils'
import type { VisionFile } from '@/types/app'

type IQuestionProps = Pick<IChatItem, 'id' | 'content' | 'useCurrentUserAvatar'> & {
  imgSrcs?: string[]
  files?: VisionFile[]
}

const fileNameOf = (file: VisionFile) =>
  file.name || file.filename || file.url?.split(/[/?#]/).filter(Boolean).pop() || '上传文件'

const QuestionFileList: FC<{ files: VisionFile[] }> = ({ files }) => {
  if (!files.length)
  { return null }

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {files.map((file, index) => {
        const name = fileNameOf(file)
        return (
          <div
            key={`${file.upload_file_id || file.id || name}-${index}`}
            className="flex h-24 w-24 flex-col items-center justify-center rounded-2xl border border-white/35 bg-white/18 px-2 py-2 text-center text-white shadow-sm backdrop-blur sm:h-28 sm:w-28"
            title={name}
          >
            <FileTypeIcon
              type={getFileAppearanceType(name, file.mime_type || file.type || '')}
              size="lg"
              className="!h-9 !w-9 text-white"
            />
            <div className="mt-2 line-clamp-2 max-w-full break-all text-[11px] font-semibold leading-4">
              {name}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const Question: FC<IQuestionProps> = ({ id, content, useCurrentUserAvatar, imgSrcs, files = [] }) => {
  const userName = ''
  return (
    <div
      id={`message-${id}`}
      data-message-id={id}
      className='chat-message-target flex min-w-0 items-start justify-end rounded-2xl'
      key={id}
    >
      <div className="min-w-0 max-w-[min(88vw,720px)]">
        <div className={`${s.question} relative text-sm text-gray-900`}>
          <div
            className={'chat-question-card max-w-full overflow-x-auto break-words rounded-b-2xl rounded-tl-2xl bg-blue-500 px-3 py-2.5 sm:mr-2 sm:px-4 sm:py-3'}
          >
            {imgSrcs && imgSrcs.length > 0 && (
              <div className="mb-2">
                <ImageGallery srcs={imgSrcs} />
              </div>
            )}
            <QuestionFileList files={files} />
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
