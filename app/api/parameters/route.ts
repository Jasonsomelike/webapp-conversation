import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, setSession } from '@/app/api/utils/common'

const appParameters = {
  opening_statement: '你好，我是你的计算机网络学习助手。你可以问概念、发题目、生成练习，或让我根据学习记录建议下一步。',
  suggested_questions: [
    '最长前缀匹配到底怎么判断？',
    '给我出 3 道 CIDR 练习题',
    '根据我的学习记录建议下一步',
    '给我推荐一个讲解OSI的B站视频',
  ],
  user_input_form: [],
  file_upload: {
    enabled: true,
    image: {
      enabled: true,
      number_limits: 5,
      transfer_methods: ['local_file'],
    },
    allowed_file_types: ['image', 'document'],
    allowed_file_extensions: [
      '.pdf',
      '.docx',
      '.txt',
      '.md',
      '.csv',
      '.png',
      '.jpg',
      '.jpeg',
      '.webp',
      '.gif',
    ],
    allowed_file_upload_methods: ['local_file'],
    number_limits: 5,
    fileUploadConfig: {
      batch_count_limit: 5,
      image_file_size_limit: 10,
      file_size_limit: 30,
      audio_file_size_limit: 50,
      video_file_size_limit: 100,
      workflow_file_upload_limit: 5,
    },
  },
  system_parameters: {
    image_file_size_limit: 10,
    file_size_limit: 30,
    audio_file_size_limit: 50,
    video_file_size_limit: 100,
  },
}

export async function GET(request: NextRequest) {
  const { sessionId, user } = getInfo(request)
  if (!user)
  { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return NextResponse.json(appParameters, {
    headers: setSession(sessionId),
  })
}
